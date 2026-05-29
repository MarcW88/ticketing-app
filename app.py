from datetime import date, datetime
from html import escape
import json
import sqlite3

from openai import OpenAI
import pandas as pd
import streamlit as st

try:
    from streamlit_sortables import sort_items
except ImportError:
    sort_items = None

try:
    from streamlit_calendar import calendar as st_calendar
except ImportError:
    st_calendar = None


DB_PATH = "tickets.db"
STATUSES = ["À trier", "À faire", "En cours", "Bloqué", "Terminé"]
PRIORITIES = ["Urgente", "Haute", "Moyenne", "Basse"]
CATEGORIES = ["Privé", "Pro", "Freelance"]
PRIORITY_SCORE = {"Urgente": 4, "Haute": 3, "Moyenne": 2, "Basse": 1}
STATUS_SCORE = {"Bloqué": 3, "En cours": 2, "À faire": 1, "À trier": 0, "Terminé": -1}
STATUS_ICONS = {"À trier": "🧬", "À faire": "🎯", "En cours": "⚙️", "Bloqué": "🧯", "Terminé": "✅"}
CATEGORY_ICONS = {"Privé": "🏠", "Pro": "💼", "Freelance": "🤝"}
AI_MODEL = "gpt-4o-mini"
DEFAULT_STATUS = "À trier"


st.set_page_config(
    page_title="Personal Ticketing",
    page_icon="🎫",
    layout="wide",
)


@st.cache_resource
def get_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def format_duration(seconds):
    seconds = int(seconds or 0)
    if seconds < 60:
        return f"{seconds}s"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes}min"
    hours, mins = divmod(minutes, 60)
    return f"{hours}h {mins}min" if mins else f"{hours}h"


def init_db():
    conn = get_connection()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            category TEXT NOT NULL,
            project TEXT,
            priority TEXT NOT NULL,
            status TEXT NOT NULL,
            due_date TEXT,
            estimate_hours REAL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            completed_at TEXT,
            deleted_at TEXT,
            archived_at TEXT,
            time_started_at TEXT,
            paused_at TEXT,
            total_seconds INTEGER DEFAULT 0
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS time_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id INTEGER NOT NULL,
            started_at TEXT NOT NULL,
            ended_at TEXT NOT NULL,
            seconds INTEGER NOT NULL
        )
        """
    )
    existing_columns = [row[1] for row in conn.execute("PRAGMA table_info(tickets)").fetchall()]
    for col, col_def in [
        ("deleted_at", "TEXT"), ("archived_at", "TEXT"),
        ("time_started_at", "TEXT"), ("paused_at", "TEXT"), ("total_seconds", "INTEGER DEFAULT 0"),
    ]:
        if col not in existing_columns:
            conn.execute(f"ALTER TABLE tickets ADD COLUMN {col} {col_def}")
    conn.commit()


def fetch_tickets(include_deleted=False):
    conn = get_connection()
    if include_deleted:
        where_clause = ""
    else:
        where_clause = "WHERE deleted_at IS NULL AND archived_at IS NULL"
    return pd.read_sql_query(f"SELECT * FROM tickets {where_clause} ORDER BY created_at DESC", conn)


def fetch_archived_tickets():
    conn = get_connection()
    return pd.read_sql_query(
        "SELECT * FROM tickets WHERE archived_at IS NOT NULL AND deleted_at IS NULL ORDER BY archived_at DESC",
        conn,
    )


def archive_ticket(ticket_id):
    now = datetime.now().isoformat(timespec="seconds")
    conn = get_connection()
    conn.execute("UPDATE tickets SET archived_at = ?, updated_at = ? WHERE id = ?", (now, now, ticket_id))
    conn.commit()


def restore_from_archive(ticket_id):
    now = datetime.now().isoformat(timespec="seconds")
    conn = get_connection()
    conn.execute("UPDATE tickets SET archived_at = NULL, updated_at = ? WHERE id = ?", (now, ticket_id))
    conn.commit()


def auto_archive_completed():
    threshold = (datetime.now() - pd.Timedelta(days=7)).isoformat(timespec="seconds")
    conn = get_connection()
    conn.execute(
        """
        UPDATE tickets
        SET archived_at = COALESCE(completed_at, updated_at)
        WHERE status = 'Terminé'
        AND (
            (completed_at IS NOT NULL AND completed_at <= ?)
            OR (completed_at IS NULL AND updated_at <= ?)
        )
        AND deleted_at IS NULL
        AND archived_at IS NULL
        """,
        (threshold, threshold),
    )
    conn.commit()


def fetch_time_sessions():
    conn = get_connection()
    return pd.read_sql_query(
        """
        SELECT ts.id, ts.ticket_id, ts.started_at, ts.ended_at, ts.seconds,
               t.title, t.category, t.project
        FROM time_sessions ts
        LEFT JOIN tickets t ON t.id = ts.ticket_id
        ORDER BY ts.started_at DESC
        """,
        conn,
    )


def _handle_timer_transition(conn, ticket_id, new_status, now):
    row = conn.execute(
        "SELECT status, time_started_at, paused_at, total_seconds FROM tickets WHERE id = ?", (ticket_id,)
    ).fetchone()
    if not row:
        return None, None, 0
    old_status = row["status"]
    time_started_at = row["time_started_at"]
    paused_at = row["paused_at"]
    total_seconds = int(row["total_seconds"] or 0)

    if old_status == "En cours" and new_status != "En cours":
        if time_started_at and not paused_at:
            try:
                elapsed = int((datetime.fromisoformat(now) - datetime.fromisoformat(time_started_at)).total_seconds())
                if elapsed > 0:
                    total_seconds += elapsed
                    conn.execute(
                        "INSERT INTO time_sessions (ticket_id, started_at, ended_at, seconds) VALUES (?, ?, ?, ?)",
                        (ticket_id, time_started_at, now, elapsed),
                    )
            except (ValueError, TypeError):
                pass
        time_started_at = None
        paused_at = None
    elif new_status == "En cours" and old_status != "En cours":
        time_started_at = now
        paused_at = None

    return time_started_at, paused_at, total_seconds


def pause_ticket(ticket_id):
    now = datetime.now().isoformat(timespec="seconds")
    conn = get_connection()
    row = conn.execute("SELECT time_started_at, total_seconds FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
    if row and row["time_started_at"]:
        try:
            elapsed = int((datetime.fromisoformat(now) - datetime.fromisoformat(row["time_started_at"])).total_seconds())
            new_total = int(row["total_seconds"] or 0) + max(elapsed, 0)
            if elapsed > 0:
                conn.execute(
                    "INSERT INTO time_sessions (ticket_id, started_at, ended_at, seconds) VALUES (?, ?, ?, ?)",
                    (ticket_id, row["time_started_at"], now, elapsed),
                )
        except (ValueError, TypeError):
            new_total = int(row["total_seconds"] or 0)
        conn.execute(
            "UPDATE tickets SET paused_at = ?, time_started_at = NULL, total_seconds = ?, updated_at = ? WHERE id = ?",
            (now, new_total, now, ticket_id),
        )
    conn.commit()


def resume_ticket(ticket_id):
    now = datetime.now().isoformat(timespec="seconds")
    conn = get_connection()
    conn.execute(
        "UPDATE tickets SET time_started_at = ?, paused_at = NULL, updated_at = ? WHERE id = ?",
        (now, now, ticket_id),
    )
    conn.commit()


def delete_time_session(session_id):
    conn = get_connection()
    row = conn.execute("SELECT ticket_id, seconds FROM time_sessions WHERE id = ?", (session_id,)).fetchone()
    if row:
        conn.execute(
            "UPDATE tickets SET total_seconds = MAX(0, COALESCE(total_seconds,0) - ?) WHERE id = ?",
            (row["seconds"], row["ticket_id"]),
        )
        conn.execute("DELETE FROM time_sessions WHERE id = ?", (session_id,))
    conn.commit()


def fetch_deleted_tickets():
    conn = get_connection()
    return pd.read_sql_query("SELECT * FROM tickets WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC", conn)


def add_ticket(title, description, category, project, priority, status, due_date, estimate_hours):
    now = datetime.now().isoformat(timespec="seconds")
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO tickets (
            title, description, category, project, priority, status, due_date,
            estimate_hours, created_at, updated_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            title,
            description,
            category,
            project,
            priority,
            status,
            due_date.isoformat() if due_date else None,
            estimate_hours,
            now,
            now,
            now if status == "Terminé" else None,
        ),
    )
    conn.commit()


def update_ticket(ticket_id, title, description, category, project, priority, status, due_date, estimate_hours):
    now = datetime.now().isoformat(timespec="seconds")
    completed_at = now if status == "Terminé" else None
    conn = get_connection()
    time_started_at, paused_at, total_seconds = _handle_timer_transition(conn, ticket_id, status, now)
    conn.execute(
        """
        UPDATE tickets
        SET title = ?, description = ?, category = ?, project = ?, priority = ?,
            status = ?, due_date = ?, estimate_hours = ?, updated_at = ?, completed_at = ?,
            time_started_at = ?, paused_at = ?, total_seconds = ?
        WHERE id = ?
        """,
        (
            title, description, category, project, priority, status,
            due_date.isoformat() if due_date else None, estimate_hours,
            now, completed_at, time_started_at, paused_at, total_seconds, ticket_id,
        ),
    )
    conn.commit()


def delete_ticket(ticket_id):
    now = datetime.now().isoformat(timespec="seconds")
    conn = get_connection()
    conn.execute("UPDATE tickets SET deleted_at = ?, updated_at = ? WHERE id = ?", (now, now, ticket_id))
    conn.commit()


def restore_ticket(ticket_id):
    now = datetime.now().isoformat(timespec="seconds")
    conn = get_connection()
    conn.execute("UPDATE tickets SET deleted_at = NULL, updated_at = ? WHERE id = ?", (now, ticket_id))
    conn.commit()


def permanently_delete_ticket(ticket_id):
    conn = get_connection()
    conn.execute("DELETE FROM tickets WHERE id = ?", (ticket_id,))
    conn.commit()


def update_ticket_status(ticket_id, status):
    now = datetime.now().isoformat(timespec="seconds")
    completed_at = now if status == "Terminé" else None
    conn = get_connection()
    time_started_at, paused_at, total_seconds = _handle_timer_transition(conn, ticket_id, status, now)
    conn.execute(
        "UPDATE tickets SET status = ?, updated_at = ?, completed_at = ?, time_started_at = ?, paused_at = ?, total_seconds = ? WHERE id = ?",
        (status, now, completed_at, time_started_at, paused_at, total_seconds, ticket_id),
    )
    conn.commit()


def get_openai_client():
    api_key = st.secrets.get("OPENAI_API_KEY")
    if not api_key:
        return None
    return OpenAI(api_key=api_key)


def improve_ticket_copy(title, description, category, project):
    client = get_openai_client()
    if client is None:
        raise ValueError("Clé OPENAI_API_KEY manquante dans les secrets Streamlit.")

    prompt = f"""
Tu aides à clarifier un ticket de task management personnel/pro/freelance.
Réécris uniquement le titre et la description pour que le ticket soit actionnable, lisible et précis.
Garde le sens original. N'invente pas d'informations.

Contexte:
- Catégorie: {category}
- Projet/client: {project or "Non précisé"}

Titre brut:
{title}

Description brute:
{description}

Réponds uniquement en JSON valide avec ces clés:
{{
  "title": "titre court et actionnable",
  "description": "description claire avec contexte, objectif et prochaines étapes si possible"
}}
"""
    response = client.chat.completions.create(
        model=AI_MODEL,
        messages=[
            {"role": "system", "content": "Tu es un assistant de productivité qui reformule des tickets en français clair."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content
    data = json.loads(content)
    return data.get("title", title).strip(), data.get("description", description).strip()


def priority_badge(priority):
    colors = {
        "Urgente": "#dc2626",
        "Haute": "#ea580c",
        "Moyenne": "#ca8a04",
        "Basse": "#16a34a",
    }
    return f"<span style='color:white;background:{colors.get(priority, '#64748b')};padding:4px 10px;border-radius:999px;font-size:12px'>{priority}</span>"


def status_badge(status):
    colors = {
        "Backlog": "#64748b",
        "À faire": "#2563eb",
        "En cours": "#7c3aed",
        "Bloqué": "#dc2626",
        "Terminé": "#16a34a",
    }
    return f"<span style='color:white;background:{colors.get(status, '#64748b')};padding:4px 10px;border-radius:999px;font-size:12px'>{status}</span>"


def prepare_dataframe(df):
    if df.empty:
        return df
    df = df.copy()
    df["status"] = df["status"].replace({"Backlog": "À trier"})
    today = date.today()
    df["due"] = pd.to_datetime(df["due_date"], errors="coerce").dt.date
    df["days_left"] = df["due"].apply(lambda d: (d - today).days if pd.notna(d) else None)
    df["priority_score"] = df["priority"].map(PRIORITY_SCORE).fillna(0)
    df["status_score"] = df["status"].map(STATUS_SCORE).fillna(0)
    df["urgency_score"] = df["days_left"].apply(
        lambda d: 4 if d is not None and d < 0 else 3 if d is not None and d <= 2 else 2 if d is not None and d <= 7 else 1
    )
    df["score"] = df["priority_score"] * 10 + df["status_score"] * 3 + df["urgency_score"]
    return df.sort_values(["status", "score", "created_at"], ascending=[True, False, False])


def get_metric_slices(df):
    active = df[df["status"] != "Terminé"] if not df.empty else df
    if not active.empty:
        due_dates = pd.to_datetime(active["due_date"], errors="coerce")
        today = pd.Timestamp.today().normalize()
        next_week = today + pd.Timedelta(days=7)
        overdue = active[due_dates < today]
        due_soon = active[due_dates.between(today, next_week)]
    else:
        overdue = active
        due_soon = active
    in_progress = df[df["status"] == "En cours"] if not df.empty else df
    return active, in_progress, overdue, due_soon


def render_metrics(df):
    active, in_progress, overdue, due_soon = get_metric_slices(df)
    active_filter = st.session_state.get("metric_filter")
    metrics = [
        ("active", "Tickets actifs", len(active)),
        ("in_progress", "En cours", len(in_progress)),
        ("overdue", "En retard", len(overdue)),
        ("due_soon", "À 7 jours", len(due_soon)),
    ]
    cols = st.columns(4)
    for col, (filter_key, label, value) in zip(cols, metrics):
        with col:
            st.metric(label, value)
            is_active = active_filter == filter_key
            if st.button(
                "✕ Retirer" if is_active else "Filtrer",
                key=f"metric_{filter_key}",
                use_container_width=True,
                type="primary" if is_active else "secondary",
            ):
                st.session_state["metric_filter"] = None if is_active else filter_key
                st.rerun()


def weekly_dashboard_data(active_df, deleted_df):
    frames = []
    if not active_df.empty:
        active = active_df.copy()
        active["created_week"] = pd.to_datetime(active["created_at"], errors="coerce").dt.to_period("W").astype(str)
        created = active.groupby("created_week").size().reset_index(name="Créés").rename(columns={"created_week": "Semaine"})
        frames.append(created)

        completed = active[active["completed_at"].notna()].copy()
        if not completed.empty:
            completed["completed_week"] = pd.to_datetime(completed["completed_at"], errors="coerce").dt.to_period("W").astype(str)
            done = completed.groupby("completed_week").size().reset_index(name="Terminés").rename(columns={"completed_week": "Semaine"})
            frames.append(done)

    if not deleted_df.empty:
        deleted = deleted_df.copy()
        deleted["deleted_week"] = pd.to_datetime(deleted["deleted_at"], errors="coerce").dt.to_period("W").astype(str)
        removed = deleted.groupby("deleted_week").size().reset_index(name="Corbeille").rename(columns={"deleted_week": "Semaine"})
        frames.append(removed)

    if not frames:
        return pd.DataFrame(columns=["Semaine", "Créés", "Terminés", "Corbeille"])

    weekly = frames[0]
    for frame in frames[1:]:
        weekly = weekly.merge(frame, on="Semaine", how="outer")
    weekly = weekly.fillna(0).sort_values("Semaine")
    for col in ["Créés", "Terminés", "Corbeille"]:
        if col not in weekly.columns:
            weekly[col] = 0
        weekly[col] = weekly[col].astype(int)
    return weekly


def render_dashboard(active_df, deleted_df):
    st.subheader("Dashboard hebdomadaire")
    st.caption("Vue d’avancement : tâches créées, terminées et envoyées en corbeille par semaine.")

    active_count = len(active_df[active_df["status"] != "Terminé"]) if not active_df.empty else 0
    done_count = len(active_df[active_df["status"] == "Terminé"]) if not active_df.empty else 0
    total_count = active_count + done_count
    completion_rate = round((done_count / total_count) * 100, 1) if total_count else 0

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Total actif", total_count)
    col2.metric("Terminés", done_count)
    col3.metric("À traiter", active_count)
    col4.metric("Complétion", f"{completion_rate}%")

    weekly = weekly_dashboard_data(active_df, deleted_df)
    if weekly.empty:
        st.info("Pas encore assez de données pour afficher les stats hebdomadaires.")
        return

    chart_df = weekly.set_index("Semaine")
    st.markdown("#### Progression par semaine")
    st.bar_chart(chart_df[["Créés", "Terminés", "Corbeille"]], use_container_width=True)

    st.markdown("#### Répartition actuelle")
    if not active_df.empty:
        status_counts = active_df.groupby("status").size().reindex(STATUSES, fill_value=0)
        st.bar_chart(status_counts, use_container_width=True)

    st.markdown("#### Tâches effectuées aujourd'hui")
    _sessions = fetch_time_sessions()
    _today = datetime.now().strftime("%Y-%m-%d")
    if not _sessions.empty:
        _today_s = _sessions[_sessions["started_at"].astype(str).str[:10] == _today]
        if _today_s.empty:
            st.info("Aucune session enregistrée aujourd'hui.")
        else:
            _today_agg = (
                _today_s.groupby(["ticket_id", "title", "project", "category"])
                .agg(seconds=("seconds", "sum"), sessions=("id", "count"))
                .reset_index()
                .sort_values("seconds", ascending=False)
            )
            _today_agg["Durée"] = _today_agg["seconds"].apply(format_duration)
            _today_agg["Tâche"] = _today_agg.apply(lambda r: f"#{int(r['ticket_id'])} {r['title']}", axis=1)
            _today_agg["Client / Projet"] = _today_agg["project"].fillna("—")
            st.dataframe(
                _today_agg[["Tâche", "Client / Projet", "category", "sessions", "Durée"]]
                .rename(columns={"category": "Catégorie", "sessions": "Sessions"}),
                use_container_width=True,
                hide_index=True,
            )
            total_today = _today_agg["seconds"].sum()
            st.caption(f"Total aujourd'hui : **{format_duration(int(total_today))}**")
    else:
        st.info("Aucune session enregistrée. Le timer démarre quand un ticket passe en 'En cours'.")

    st.markdown("#### Détail hebdomadaire")
    st.dataframe(weekly, hide_index=True, use_container_width=True)


def inject_styles():
    st.markdown(
        """
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');

        html, body, [class*="css"] {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .block-container {
            padding-top: 3.5rem;
            padding-bottom: 2rem;
            max-width: 1500px;
        }
        .stApp {
            background: #0E1117;
            color: #F9FAFB;
        }
        h1, h2, h3, h4 {
            font-family: 'Space Grotesk', sans-serif;
            color: #F9FAFB;
            letter-spacing: -0.02em;
        }
        /* ---- KPI cards ---- */
        [data-testid="stMetric"] {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(24,212,183,0.25);
            border-radius: 12px;
            padding: 28px 20px 16px;
            box-shadow: 0 0 24px rgba(24,212,183,0.07);
            text-align: center;
            transition: all 0.2s;
        }
        [data-testid="stMetric"]:hover {
            border-color: rgba(24,212,183,0.55);
            box-shadow: 0 0 32px rgba(24,212,183,0.15);
        }
        [data-testid="stMetricValue"],
        [data-testid="stMetricValue"] * {
            font-family: 'Space Grotesk', sans-serif !important;
            font-size: 52px !important;
            font-weight: 700 !important;
            color: #18D4B7 !important;
            line-height: 1.1 !important;
        }
        [data-testid="stMetricLabel"],
        [data-testid="stMetricLabel"] * {
            font-size: 11px !important;
            font-weight: 600 !important;
            color: rgba(255,255,255,0.5) !important;
            text-transform: uppercase !important;
            letter-spacing: 0.09em !important;
        }
        /* ---- App header ---- */
        .app-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 18px 24px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 10px;
            margin-bottom: 20px;
        }
        .app-header-brand {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 20px;
            font-weight: 700;
            color: #18D4B7;
            letter-spacing: -0.01em;
        }
        .app-header-sub {
            font-size: 13px;
            color: rgba(255,255,255,0.45);
            margin-top: 3px;
        }
        /* ---- Ticket cards ---- */
        .ticket-card {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 8px;
            padding: 14px 16px;
            margin-bottom: 6px;
            transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
        }
        .ticket-card:hover {
            background: rgba(255,255,255,0.07);
            border-color: rgba(24,212,183,0.35);
            box-shadow: 0 0 18px rgba(24,212,183,0.1);
            transform: translateY(-1px);
        }
        .ticket-title {
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 600;
            font-size: 14px;
            color: #F9FAFB;
            margin: 6px 0;
        }
        .ticket-desc {
            color: rgba(255,255,255,0.55);
            font-size: 13px;
            line-height: 1.45;
            margin: 7px 0 10px;
        }
        .muted {
            color: rgba(255,255,255,0.35);
            font-size: 11px;
            font-weight: 500;
        }
        /* ---- Pills ---- */
        .pill {
            display: inline-flex;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 700;
            margin-right: 4px;
            margin-bottom: 4px;
            letter-spacing: 0.03em;
        }
        .prio-Urgente { background: rgba(239,68,68,0.15);  color: #f87171; border: 1px solid rgba(239,68,68,0.3); }
        .prio-Haute   { background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); }
        .prio-Moyenne { background: rgba(24,212,183,0.12); color: #18D4B7; border: 1px solid rgba(24,212,183,0.3); }
        .prio-Basse   { background: rgba(99,102,241,0.13); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.3); }
        .cat-Priv\u00e9 { background: rgba(99,102,241,0.12); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.25); }
        .cat-Pro      { background: rgba(59,130,246,0.12); color: #60a5fa; border: 1px solid rgba(59,130,246,0.25); }
        .cat-Freelance{ background: rgba(24,212,183,0.12); color: #18D4B7; border: 1px solid rgba(24,212,183,0.25); }
        .due-overdue  { color: #f87171; font-weight: 700; }
        .due-today    { color: #fbbf24; font-weight: 700; }
        .due-normal   { color: rgba(255,255,255,0.35); }
        /* ---- Column headers ---- */
        .column-header {
            background: rgba(24,212,183,0.06);
            border: 1px solid rgba(24,212,183,0.15);
            border-radius: 6px;
            padding: 9px 12px;
            margin-bottom: 10px;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            color: rgba(24,212,183,0.75);
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.08em;
        }
        /* ---- Kanban dropzone ---- */
        .kanban-dropzone {
            min-height: 52px;
            border: 2px dashed rgba(24,212,183,0.18);
            border-radius: 8px;
            margin-top: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(24,212,183,0.35);
            font-size: 11px;
            font-weight: 600;
            transition: all 0.15s;
        }
        .drag-over {
            background: rgba(24,212,183,0.07) !important;
            border: 2px dashed #18D4B7 !important;
            color: #18D4B7 !important;
        }
        /* ---- Buttons ---- */
        div[data-testid="stButton"] > button {
            border-radius: 6px;
            border: 1px solid rgba(255,255,255,0.1);
            font-weight: 600;
            background: rgba(255,255,255,0.05);
            color: rgba(255,255,255,0.75);
            font-family: 'Inter', sans-serif;
            transition: all 0.15s;
        }
        div[data-testid="stButton"] > button:hover {
            border-color: rgba(24,212,183,0.6);
            color: #18D4B7;
            background: rgba(24,212,183,0.08);
        }
        div[data-testid="stButton"] > button[kind="primary"] {
            background: #18D4B7;
            color: #0E1117;
            border-color: #18D4B7;
            font-weight: 700;
        }
        div[data-testid="stButton"] > button[kind="primary"]:hover {
            background: #0FB89C;
            border-color: #0FB89C;
            color: #0E1117;
        }
        /* ---- Containers / borders ---- */
        div[data-testid="stVerticalBlockBorderWrapper"] {
            background: rgba(255,255,255,0.03);
            border-color: rgba(255,255,255,0.07);
        }
        /* ---- Tabs ---- */
        button[data-baseweb="tab"] {
            color: rgba(255,255,255,0.45) !important;
            font-family: 'Inter', sans-serif !important;
        }
        button[data-baseweb="tab"][aria-selected="true"] {
            color: #18D4B7 !important;
        }
        div[data-baseweb="tab-highlight"] {
            background-color: #18D4B7 !important;
        }
        /* ---- Expander (clickable card) ---- */
        details[data-testid="stExpander"] > summary {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 8px;
            color: rgba(255,255,255,0.8);
            font-family: 'Inter', sans-serif;
            font-size: 13px;
            transition: all 0.2s;
        }
        details[data-testid="stExpander"] > summary:hover {
            border-color: rgba(24,212,183,0.4);
            color: #18D4B7;
            background: rgba(24,212,183,0.05);
        }
        details[data-testid="stExpander"][open] > summary {
            border-color: rgba(24,212,183,0.4);
            color: #18D4B7;
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
        }
        /* ---- Inputs & selects ---- */
        div[data-testid="stTextInput"] input,
        div[data-testid="stSelectbox"] div[data-baseweb="select"] > div {
            background: rgba(255,255,255,0.05) !important;
            border-color: rgba(255,255,255,0.1) !important;
            color: #F9FAFB !important;
        }
        /* ---- Timer badges ---- */
        .timer-badge {
            display: inline-flex;
            align-items: center;
            background: rgba(24,212,183,0.12);
            color: #18D4B7;
            border: 1px solid rgba(24,212,183,0.35);
            border-radius: 4px;
            padding: 2px 8px;
            font-size: 11px;
            font-weight: 700;
            margin: 4px 0 2px;
            letter-spacing: 0.02em;
        }
        .timer-done {
            display: inline-flex;
            align-items: center;
            background: rgba(99,102,241,0.1);
            color: #a5b4fc;
            border: 1px solid rgba(99,102,241,0.25);
            border-radius: 4px;
            padding: 2px 8px;
            font-size: 11px;
            font-weight: 600;
            margin: 4px 0 2px;
        }
        .timer-paused {
            display: inline-flex;
            align-items: center;
            background: rgba(245,158,11,0.1);
            color: #fbbf24;
            border: 1px solid rgba(245,158,11,0.3);
            border-radius: 4px;
            padding: 2px 8px;
            font-size: 11px;
            font-weight: 700;
            margin: 4px 0 2px;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

def due_label(row):
    if pd.isna(row.get("due")):
        return "Sans échéance", "due-normal"
    days_left = row["days_left"]
    if days_left < 0:
        return f"En retard de {abs(int(days_left))} j", "due-overdue"
    if days_left == 0:
        return "Aujourd'hui", "due-today"
    return f"Dans {int(days_left)} j", "due-normal"


def ticket_card(row, compact=False):
    due_text, due_class = due_label(row)
    description = escape(str(row["description"] or ""))
    if compact and len(description) > 95:
        description = f"{description[:95]}..."
    project = escape(str(row["project"] or "Aucun projet"))
    title = escape(str(row["title"]))
    category = escape(str(row["category"]))
    priority = escape(str(row["priority"]))
    ticket_id = int(row["id"])
    estimate = row["estimate_hours"] or 0
    category_icon = CATEGORY_ICONS.get(row["category"], "🏷️")

    estimate_html = f"⏱️ {estimate:g}h · " if estimate else ""

    timer_html = ""
    status = str(row.get("status", ""))
    total_secs = int(row.get("total_seconds") or 0)
    tsa = row.get("time_started_at")
    psa = row.get("paused_at")
    is_paused = bool(psa) and str(psa) not in ("", "nan", "None")
    if status == "En cours":
        if is_paused:
            timer_html = f'<div class="timer-paused">⏸ {format_duration(total_secs)} en pause</div>'
        elif tsa and str(tsa) not in ("", "nan", "None"):
            try:
                elapsed = int((datetime.now() - datetime.fromisoformat(str(tsa))).total_seconds())
                timer_html = f'<div class="timer-badge">⏱ {format_duration(total_secs + elapsed)} en cours</div>'
            except (ValueError, TypeError):
                pass
    elif total_secs > 0:
        timer_html = f'<div class="timer-done">✅ {format_duration(total_secs)} travaillé</div>'

    card_html = "".join([
        f'<div class="ticket-card" data-ticket-id="{ticket_id}">',
        f'<div class="muted">#{ticket_id} · {project}</div>',
        f'<div class="ticket-title">{title}</div>',
        f'<span class="pill prio-{priority}">{priority}</span>',
        f'<span class="pill cat-{category}">{category_icon} {category}</span>',
        f'<div class="ticket-desc">{description or "Pas de description"}</div>',
        timer_html,
        f'<div class="muted">{estimate_html}<span class="{due_class}">📅 {due_text}</span> · Score {int(row["score"])}</div>',
        "</div>",
    ])
    st.markdown(card_html, unsafe_allow_html=True)


def render_ticket_actions(ticket_id, prefix):
    row_data = tickets[tickets["id"] == ticket_id].iloc[0]
    current_status = row_data["status"]
    current_index = STATUSES.index(current_status) if current_status in STATUSES else 0
    prev_status = STATUSES[current_index - 1] if current_index > 0 else None
    next_status = STATUSES[current_index + 1] if current_index < len(STATUSES) - 1 else None
    psa = row_data.get("paused_at")
    is_paused = bool(psa) and str(psa) not in ("", "nan", "None")

    if current_status == "En cours":
        left_col, pause_col, edit_col, right_col, done_col, delete_col = st.columns([0.5, 0.8, 2.0, 0.5, 0.5, 0.5])
        if pause_col.button("▶" if is_paused else "⏸",
                             key=f"pause_{prefix}_{ticket_id}", use_container_width=True,
                             help="Reprendre" if is_paused else "Pause"):
            resume_ticket(ticket_id) if is_paused else pause_ticket(ticket_id)
            st.rerun()
    else:
        left_col, edit_col, right_col, done_col, delete_col = st.columns([0.7, 2.4, 0.7, 0.7, 0.7])

    if left_col.button("←", key=f"left_{prefix}_{ticket_id}", use_container_width=True,
                       disabled=prev_status is None, help=prev_status or ""):
        update_ticket_status(ticket_id, prev_status)
        st.rerun()
    if edit_col.button("✏️ Modifier", key=f"edit_{prefix}_{ticket_id}", use_container_width=True):
        edit_ticket_dialog(ticket_id)
    if right_col.button("→", key=f"right_{prefix}_{ticket_id}", use_container_width=True,
                        disabled=next_status is None, help=next_status or ""):
        update_ticket_status(ticket_id, next_status)
        st.rerun()
    if done_col.button("✓", key=f"done_{prefix}_{ticket_id}", use_container_width=True, help="Valider"):
        update_ticket_status(ticket_id, "Terminé")
        st.rerun()
    if delete_col.button("🗑", key=f"delete_{prefix}_{ticket_id}", use_container_width=True, help="Corbeille"):
        delete_ticket(ticket_id)
        st.toast("Ticket envoyé dans la corbeille")
        st.rerun()


def render_drag_board(df):
    columns = st.columns(len(STATUSES))
    for column, status in zip(columns, STATUSES):
        status_df = df[df["status"] == status]
        with column:
            st.markdown(
                f"<div class='column-header kanban-col' data-status='{status}'>"
                f"{STATUS_ICONS.get(status, '')} {status} · {len(status_df)}</div>",
                unsafe_allow_html=True,
            )
            for _, row in status_df.sort_values("score", ascending=False).iterrows():
                ticket_card(row, compact=True)
                render_ticket_actions(int(row["id"]), "board")


def render_quick_done_actions(df):
    candidates = df[df["status"] != "Terminé"] if not df.empty else df
    if candidates.empty:
        return
    with st.expander("✓ Validation rapide", expanded=False):
        st.caption("Valide une carte sans l’ouvrir et sans la déplacer manuellement.")
        for _, row in candidates.sort_values("score", ascending=False).head(12).iterrows():
            label_col, action_col = st.columns([5, 1])
            label_col.markdown(f"**#{int(row['id'])}** · {escape(str(row['title']))}")
            if action_col.button("✓", key=f"quick_done_{int(row['id'])}", use_container_width=True):
                update_ticket_status(int(row["id"]), "Terminé")
                st.rerun()


def ticket_form(prefix, defaults=None):
    defaults = defaults or {}
    title_key = f"{prefix}_title"
    description_key = f"{prefix}_description"
    category_key = f"{prefix}_category"
    project_key = f"{prefix}_project"

    if title_key not in st.session_state:
        st.session_state[title_key] = defaults.get("title", "")
    if description_key not in st.session_state:
        st.session_state[description_key] = defaults.get("description", "")
    if st.session_state.get("pending_ai_target") == prefix:
        st.session_state[title_key] = st.session_state.pop("pending_ai_title", st.session_state[title_key])
        st.session_state[description_key] = st.session_state.pop("pending_ai_description", st.session_state[description_key])
        st.session_state.pop("pending_ai_target", None)

    title = st.text_input("Titre", key=title_key)
    description = st.text_area("Description", key=description_key)

    col1, col2 = st.columns(2)
    category = col1.selectbox(
        "Catégorie",
        CATEGORIES,
        index=CATEGORIES.index(defaults.get("category", "Privé")) if defaults.get("category") in CATEGORIES else 0,
        key=category_key,
    )
    project = col2.text_input("Projet / client", value=defaults.get("project", ""), key=project_key)

    col3, col4, col5 = st.columns(3)
    priority = col3.selectbox(
        "Priorité",
        PRIORITIES,
        index=PRIORITIES.index(defaults.get("priority", "Moyenne")) if defaults.get("priority") in PRIORITIES else 2,
        key=f"{prefix}_priority",
    )
    status = col4.selectbox(
        "Statut",
        STATUSES,
        index=STATUSES.index(defaults.get("status", DEFAULT_STATUS)) if defaults.get("status") in STATUSES else STATUSES.index(DEFAULT_STATUS),
        key=f"{prefix}_status",
    )
    estimate_hours = col5.number_input(
        "Estimation (heures)",
        min_value=0.0,
        step=0.5,
        value=float(defaults.get("estimate_hours") or 0.0),
        key=f"{prefix}_estimate",
    )

    parsed_due = None
    if defaults.get("due_date") and str(defaults["due_date"]).strip():
        try:
            parsed_due = datetime.fromisoformat(defaults["due_date"]).date()
        except (ValueError, TypeError):
            parsed_due = None
    due_date = st.date_input("Échéance", value=parsed_due, key=f"{prefix}_due")

    return title, description, category, project, priority, status, due_date, estimate_hours


def improve_ticket_from_form(prefix, ticket):
    title, description, category, project = ticket[:4]
    if not title.strip() and not description.strip():
        st.warning("Ajoute d'abord un titre ou une description brute.")
        return
    try:
        with st.spinner("Réécriture en cours..."):
            improved_title, improved_description = improve_ticket_copy(title, description, category, project)
        st.session_state["pending_ai_target"] = prefix
        st.session_state["pending_ai_title"] = improved_title
        st.session_state["pending_ai_description"] = improved_description
        st.rerun()
    except Exception as exc:
        st.error(f"Impossible d'améliorer le ticket : {exc}")


@st.dialog("Nouveau ticket")
def create_ticket_dialog():
    with st.form("create_ticket", clear_on_submit=False):
        new_ticket = ticket_form("new")
        ai_col, submit_col = st.columns(2)
        improve = ai_col.form_submit_button("✨ Améliorer avec IA", use_container_width=True)
        submitted = submit_col.form_submit_button("Créer le ticket", type="primary", use_container_width=True)
        if improve:
            st.session_state["show_create_dialog"] = True
            improve_ticket_from_form("new", new_ticket)
        if submitted:
            if not new_ticket[0].strip():
                st.error("Le titre est obligatoire.")
            else:
                add_ticket(*new_ticket)
                for key in ["new_title", "new_description", "new_project"]:
                    st.session_state.pop(key, None)
                st.session_state["show_create_dialog"] = False
                st.success("Ticket ajouté.")
                st.rerun()


@st.dialog("Modifier le ticket")
def edit_ticket_dialog(ticket_id):
    current = tickets[tickets["id"] == ticket_id].iloc[0].to_dict()
    with st.form("edit_ticket"):
        edited_ticket = ticket_form("edit", current)
        ai_col, save_col, delete_col = st.columns(3)
        improve = ai_col.form_submit_button("✨ Améliorer avec IA", use_container_width=True)
        save = save_col.form_submit_button("Enregistrer", type="primary", use_container_width=True)
        remove = delete_col.form_submit_button("Supprimer", use_container_width=True)
        if improve:
            improve_ticket_from_form("edit", edited_ticket)
        if save:
            if not edited_ticket[0].strip():
                st.error("Le titre est obligatoire.")
            else:
                update_ticket(ticket_id, *edited_ticket)
                st.success("Ticket mis à jour.")
                st.rerun()
        if remove:
            delete_ticket(ticket_id)
            st.success("Ticket supprimé.")
            st.rerun()


init_db()
auto_archive_completed()
tickets = prepare_dataframe(fetch_tickets())
deleted_tickets = prepare_dataframe(fetch_deleted_tickets())

inject_styles()

st.markdown(
    "<div class='app-header'><div class='app-header-brand'>Task Board</div></div>",
    unsafe_allow_html=True,
)

top_left, top_right = st.columns([4, 1])
with top_left:
    render_metrics(tickets)
with top_right:
    st.write("")
    st.write("")
    if st.button("＋ Nouveau ticket", type="primary", use_container_width=True):
        st.session_state["show_create_dialog"] = True
    if not tickets.empty:
        running = tickets[
            (tickets["status"] == "En cours") &
            (tickets["time_started_at"].notna()) &
            (tickets["time_started_at"].astype(str).str.strip() != "")
        ]
        paused = tickets[
            (tickets["status"] == "En cours") &
            (tickets["paused_at"].notna()) &
            (tickets["paused_at"].astype(str).str.strip() != "")
        ]
        for _, trow in pd.concat([running, paused]).drop_duplicates("id").iterrows():
            tid = int(trow["id"])
            tsa = trow.get("time_started_at")
            psa = trow.get("paused_at")
            total_secs = int(trow.get("total_seconds") or 0)
            is_psd = bool(psa) and str(psa) not in ("", "nan", "None")
            if is_psd:
                lbl = f"▶ #{tid} · {format_duration(total_secs)}"
            else:
                try:
                    el = int((datetime.now() - datetime.fromisoformat(str(tsa))).total_seconds())
                    lbl = f"⏸ #{tid} · {format_duration(total_secs + el)}"
                except (ValueError, TypeError):
                    continue
            if st.button(lbl, key=f"top_timer_{tid}", use_container_width=True,
                         help="Reprendre" if is_psd else "Pause"):
                resume_ticket(tid) if is_psd else pause_ticket(tid)
                st.rerun()

if st.session_state.get("show_create_dialog"):
    create_ticket_dialog()

st.write("")
with st.container(border=True):
    st.markdown("#### Filtres")
    filter_col1, filter_col2, filter_col3, filter_col4 = st.columns([1.2, 1.5, 1.2, 1.8])
    selected_category = filter_col1.selectbox("Catégorie", ["Toutes"] + CATEGORIES, index=0)
    selected_statuses = filter_col2.selectbox("Statut", ["Tous"] + STATUSES, index=0)
    selected_priorities = filter_col3.selectbox("Priorité", ["Toutes"] + PRIORITIES, index=0)
    search = filter_col4.text_input("Recherche", placeholder="Titre, description, projet...")

filtered = tickets.copy()
if not filtered.empty:
    if selected_category != "Toutes":
        filtered = filtered[filtered["category"] == selected_category]
    if selected_statuses != "Tous":
        filtered = filtered[filtered["status"] == selected_statuses]
    if selected_priorities != "Toutes":
        filtered = filtered[filtered["priority"] == selected_priorities]
    metric_filter = st.session_state.get("metric_filter")
    if metric_filter:
        active, in_progress, overdue, due_soon = get_metric_slices(filtered)
        metric_slices = {
            "active": active,
            "in_progress": in_progress,
            "overdue": overdue,
            "due_soon": due_soon,
        }
        filtered = metric_slices.get(metric_filter, filtered)
    if search:
        query = search.lower()
        filtered = filtered[
            filtered["title"].str.lower().str.contains(query, na=False)
            | filtered["description"].str.lower().str.contains(query, na=False)
            | filtered["project"].str.lower().str.contains(query, na=False)
        ]

tab_board, tab_dashboard, tab_list, tab_table, tab_archive, tab_time, tab_trash = st.tabs(
    ["Board", "Dashboard", "Aperçu complet", "Tableau", "🗃 Archives", "⏱ Temps", "Corbeille"]
)

with tab_board:
    if filtered.empty:
        st.info("Aucun ticket à afficher.")
    else:
        render_drag_board(filtered)
        render_quick_done_actions(filtered)

with tab_dashboard:
    render_dashboard(tickets, deleted_tickets)

with tab_list:
    st.subheader("Aperçu complet des tickets")
    if filtered.empty:
        st.info("Aucun ticket à afficher.")
    else:
        for _, row in filtered.sort_values(["score", "created_at"], ascending=[False, False]).iterrows():
            ticket_card(row)
            render_ticket_actions(int(row["id"]), "list")

with tab_table:
    st.subheader("Vue tableau")
    if tickets.empty:
        st.info("Aucune donnée pour le moment.")
    else:
        display_cols = ["id", "title", "category", "project", "priority", "status", "due_date", "estimate_hours", "score"]
        st.dataframe(
            filtered[display_cols],
            use_container_width=True,
            hide_index=True,
            column_config={
                "id": "ID",
                "title": "Titre",
                "category": "Catégorie",
                "project": "Projet",
                "priority": "Priorité",
                "status": "Statut",
                "due_date": "Échéance",
                "estimate_hours": "Heures",
                "score": "Score",
            },
        )

with tab_archive:
    st.subheader("Archives")
    st.caption("Tickets 'Terminé' archivés automatiquement 7 jours après leur complétion.")
    archived = prepare_dataframe(fetch_archived_tickets())
    if archived.empty:
        st.info("Aucun ticket archivé pour le moment.")
    else:
        for _, row in archived.iterrows():
            ticket_card(row)
            arc_col1, arc_col2 = st.columns(2)
            if arc_col1.button("↩ Restaurer", key=f"arch_restore_{int(row['id'])}", use_container_width=True):
                restore_from_archive(int(row["id"]))
                st.rerun()
            if arc_col2.button("Supprimer définitivement", key=f"arch_purge_{int(row['id'])}", use_container_width=True):
                permanently_delete_ticket(int(row["id"]))
                st.rerun()

with tab_time:
    st.subheader("Temps travaillé")
    st.caption("Le timer démarre automatiquement quand un ticket passe en ‘En cours’ et s’arrête à chaque changement de statut.")
    sessions_df = fetch_time_sessions()
    if sessions_df.empty:
        st.info("⏱ Aucune session enregistrée. Déplacez un ticket en ‘En cours’ pour démarrer le chrono.")
    else:
        if st_calendar:
            events = []
            for _, s in sessions_df.iterrows():
                events.append({
                    "title": f"#{int(s['ticket_id'])} {str(s.get('title', ''))[:28]}",
                    "start": str(s["started_at"])[:16],
                    "end": str(s["ended_at"])[:16],
                    "backgroundColor": "#18D4B7",
                    "borderColor": "#0FB89C",
                    "textColor": "#0E1117",
                })
            st_calendar(
                events=events,
                options={
                    "initialView": "timeGridWeek",
                    "headerToolbar": {
                        "left": "prev,next today",
                        "center": "title",
                        "right": "dayGridMonth,timeGridWeek,timeGridDay",
                    },
                    "slotMinTime": "06:00:00",
                    "slotMaxTime": "23:00:00",
                    "locale": "fr",
                    "height": 600,
                },
            )
        else:
            st.warning("⚠️ `streamlit-calendar` non installé. Lancez : `pip install streamlit-calendar`")
        st.markdown("#### Activité quotidienne par type de tâche")
        day_cat = sessions_df.copy()
        day_cat["date"] = day_cat["started_at"].astype(str).str[:10]
        day_cat["heures"] = (day_cat["seconds"] / 3600).round(2)
        pivot = (
            day_cat.groupby(["date", "category"])["heures"]
            .sum()
            .reset_index()
            .pivot(index="date", columns="category", values="heures")
            .fillna(0)
            .sort_index()
        )
        pivot.index.name = None
        pivot.columns.name = None
        st.bar_chart(pivot, use_container_width=True, height=280)

        st.markdown("#### Résumé par ticket")
        summary = (
            sessions_df.groupby(["ticket_id", "title"])
            .agg(total_seconds=("seconds", "sum"), sessions=("id", "count"))
            .reset_index()
            .sort_values("total_seconds", ascending=False)
        )
        summary["Durée totale"] = summary["total_seconds"].apply(format_duration)
        summary["Ticket"] = summary.apply(lambda r: f"#{int(r['ticket_id'])} {r['title']}", axis=1)
        st.dataframe(
            summary[["Ticket", "sessions", "Durée totale"]].rename(columns={"sessions": "Sessions"}),
            use_container_width=True,
            hide_index=True,
        )
        st.markdown("#### Sessions détaillées")
        for _, s in sessions_df.iterrows():
            s_col, d_col = st.columns([6, 1])
            started = str(s["started_at"])[:16].replace("T", " ")
            ended = str(s["ended_at"])[:16].replace("T", " ")
            title_short = str(s.get("title", ""))[:30]
            s_col.markdown(
                f"**#{int(s['ticket_id'])}** {title_short} · "
                f"`{started}` → `{ended}` · **{format_duration(int(s['seconds']))}**"
            )
            if d_col.button("🗑", key=f"del_sess_{int(s['id'])}", use_container_width=True, help="Supprimer cette session"):
                delete_time_session(int(s["id"]))
                st.rerun()

with tab_trash:
    st.subheader("Corbeille")
    st.caption("Les tickets supprimés restent récupérables ici.")
    if deleted_tickets.empty:
        st.info("La corbeille est vide.")
    else:
        for _, row in deleted_tickets.iterrows():
            ticket_card(row)
            restore_col, delete_forever_col = st.columns(2)
            if restore_col.button("Restaurer", key=f"restore_{int(row['id'])}", use_container_width=True):
                restore_ticket(int(row["id"]))
                st.rerun()
            if delete_forever_col.button("Supprimer définitivement", key=f"purge_{int(row['id'])}", use_container_width=True):
                permanently_delete_ticket(int(row["id"]))
                st.rerun()
