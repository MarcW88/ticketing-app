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
            deleted_at TEXT
        )
        """
    )
    existing_columns = [row[1] for row in conn.execute("PRAGMA table_info(tickets)").fetchall()]
    if "deleted_at" not in existing_columns:
        conn.execute("ALTER TABLE tickets ADD COLUMN deleted_at TEXT")
    conn.commit()


def fetch_tickets(include_deleted=False):
    conn = get_connection()
    where_clause = "" if include_deleted else "WHERE deleted_at IS NULL"
    return pd.read_sql_query(f"SELECT * FROM tickets {where_clause} ORDER BY created_at DESC", conn)


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
    conn.execute(
        """
        UPDATE tickets
        SET title = ?, description = ?, category = ?, project = ?, priority = ?,
            status = ?, due_date = ?, estimate_hours = ?, updated_at = ?, completed_at = ?
        WHERE id = ?
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
            completed_at,
            ticket_id,
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
    conn.execute("UPDATE tickets SET status = ?, updated_at = ?, completed_at = ? WHERE id = ?", (status, now, completed_at, ticket_id))
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
        button_label = f"{label}\n\n{value}"
        button_type = "primary" if active_filter == filter_key else "secondary"
        if col.button(button_label, key=f"metric_{filter_key}", type=button_type, use_container_width=True):
            st.session_state["metric_filter"] = None if active_filter == filter_key else filter_key
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

    st.markdown("#### Détail hebdomadaire")
    st.dataframe(weekly, hide_index=True, use_container_width=True)


def inject_styles():
    st.markdown(
        """
        <style>
        .block-container {
            padding-top: 3rem;
            padding-bottom: 2rem;
            max-width: 1500px;
        }
        .stApp {
            background: #f4f5f7;
            color: #172b4d;
        }
        h1, h2, h3 {
            color: #172b4d;
            letter-spacing: -0.02em;
        }
        div[data-testid="stMetric"] {
            background: #ffffff;
            border: 1px solid #dfe1e6;
            border-radius: 8px;
            padding: 18px 20px;
            box-shadow: 0 1px 2px rgba(9, 30, 66, 0.14);
        }
        div[data-testid="stMetric"] > div > div > div > div {
            font-size: 28px !important;
            font-weight: 800 !important;
            color: #172b4d !important;
        }
        div[data-testid="stMetric"] > div > div > div > div + div {
            font-size: 13px !important;
            font-weight: 600 !important;
            color: #5e6c84 !important;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        .hero {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            padding: 22px 24px;
            border-radius: 10px;
            background: #ffffff;
            color: #172b4d;
            margin-bottom: 18px;
            border: 1px solid #dfe1e6;
            box-shadow: 0 2px 8px rgba(9, 30, 66, 0.10);
        }
        .hero h1 {
            margin: 0;
            font-size: 30px;
            font-weight: 800;
        }
        .hero p {
            margin: 8px 0 0;
            color: #5e6c84;
            font-size: 14px;
        }
        .hero-code {
            color: #0052cc;
            font-weight: 800;
        }
        .ticket-card {
            background: #ffffff;
            border: 1px solid #dfe1e6;
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 8px;
            box-shadow: 0 1px 2px rgba(9, 30, 66, 0.18);
        }
        .ticket-card:hover {
            background: #fefefe;
            border-color: #b3bac5;
            box-shadow: 0 4px 8px rgba(9, 30, 66, 0.18);
        }
        .ticket-title {
            font-weight: 700;
            font-size: 14px;
            color: #172b4d;
            margin: 7px 0;
        }
        .ticket-desc {
            color: #42526e;
            font-size: 13px;
            line-height: 1.4;
            margin: 8px 0 10px;
        }
        .muted {
            color: #6b778c;
            font-size: 11px;
            font-weight: 600;
        }
        .pill {
            display: inline-flex;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 700;
            margin-right: 5px;
            margin-bottom: 5px;
            border: 1px solid transparent;
        }
        .prio-Urgente { background: #ffebe6; color: #bf2600; }
        .prio-Haute { background: #fffae6; color: #974f0c; }
        .prio-Moyenne { background: #eae6ff; color: #403294; }
        .prio-Basse { background: #e3fcef; color: #006644; }
        .cat-Privé { background: #eae6ff; color: #403294; }
        .cat-Pro { background: #deebff; color: #0747a6; }
        .cat-Freelance { background: #e3fcef; color: #006644; }
        .due-overdue { color: #bf2600; font-weight: 800; }
        .due-today { color: #ff8b00; font-weight: 800; }
        .due-normal { color: #5e6c84; font-weight: 700; }
        .column-header {
            background: #ebecf0;
            border-radius: 4px;
            padding: 10px 12px;
            margin-bottom: 10px;
            font-weight: 800;
            color: #5e6c84;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.04em;
        }
        div[data-testid="stVerticalBlockBorderWrapper"] {
            background: #ffffff;
            border-color: #dfe1e6;
        }
        div[data-testid="stButton"] > button {
            border-radius: 4px;
            border: 1px solid #dfe1e6;
            font-weight: 700;
            background: #f4f5f7;
            color: #172b4d;
        }
        div[data-testid="stButton"] > button:hover {
            border-color: #0052cc;
            color: #0052cc;
            background: #deebff;
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

    st.markdown(
        f"""
        <div class="ticket-card" draggable="true" data-ticket-id="{ticket_id}">
            <div class="muted">#{ticket_id} · {project}</div>
            <div class="ticket-title">{title}</div>
            <span class="pill prio-{priority}">{priority}</span>
            <span class="pill cat-{category}">{category_icon} {category}</span>
            <div class="ticket-desc">{description or "Pas de description"}</div>
            <div class="muted">⏱️ {estimate:g}h · <span class="{due_class}">📅 {due_text}</span> · Score {int(row["score"])}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_ticket_actions(ticket_id, prefix):
    current_status = tickets[tickets["id"] == ticket_id].iloc[0]["status"]
    current_index = STATUSES.index(current_status) if current_status in STATUSES else 0
    prev_status = STATUSES[current_index - 1] if current_index > 0 else None
    next_status = STATUSES[current_index + 1] if current_index < len(STATUSES) - 1 else None

    left_col, edit_col, right_col, done_col, delete_col = st.columns([0.8, 2.1, 0.8, 0.8, 0.8])
    if left_col.button("←", key=f"left_{prefix}_{ticket_id}", use_container_width=True, disabled=prev_status is None):
        update_ticket_status(ticket_id, prev_status)
        st.rerun()
    if edit_col.button("Modifier", key=f"edit_{prefix}_{ticket_id}", use_container_width=True):
        edit_ticket_dialog(ticket_id)
    if right_col.button("→", key=f"right_{prefix}_{ticket_id}", use_container_width=True, disabled=next_status is None):
        update_ticket_status(ticket_id, next_status)
        st.rerun()
    if done_col.button("✓", key=f"done_{prefix}_{ticket_id}", use_container_width=True, help="Valider la carte"):
        update_ticket_status(ticket_id, "Terminé")
        st.rerun()
    if delete_col.button("⌫", key=f"delete_{prefix}_{ticket_id}", use_container_width=True, help="Envoyer dans la corbeille"):
        delete_ticket(ticket_id)
        st.toast("Ticket envoyé dans la corbeille")
        st.rerun()


def sortable_ticket_label(row):
    title = str(row["title"])
    ticket_id = int(row["id"])
    priority = str(row["priority"])
    project = str(row["project"] or "Aucun projet")
    return f"#{ticket_id} · {title} · {priority} · {project}"


def parse_ticket_id(label):
    return int(label.split(" · ", 1)[0].replace("#", ""))


def render_drag_board(df):
    move_data = st.text_input("move_data", key="move_data", label_visibility="hidden")
    if move_data:
        try:
            data = json.loads(move_data)
            ticket_id = int(data.get("ticket_id"))
            target_status = data.get("status")
            if ticket_id and target_status and target_status in STATUSES:
                update_ticket_status(ticket_id, target_status)
                st.session_state["move_data"] = ""
                st.rerun()
        except (json.JSONDecodeError, ValueError, TypeError):
            pass

    columns = st.columns(len(STATUSES))
    for column, status in zip(columns, STATUSES):
        status_df = df[df["status"] == status]
        with column:
            st.markdown(
                f"<div class='column-header' data-status='{status}'>{STATUS_ICONS.get(status, '')} {status} · {len(status_df)}</div>",
                unsafe_allow_html=True,
            )
            for _, row in status_df.sort_values("score", ascending=False).iterrows():
                ticket_card(row, compact=True)
                render_ticket_actions(int(row["id"]), "board")

    st.markdown(
        """
        <script>
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.ticket-card[draggable="true"]');
            const columns = document.querySelectorAll('.column-header');
            let draggedCard = null;

            cards.forEach(card => {
                card.addEventListener('dragstart', function(e) {
                    draggedCard = this;
                    this.style.opacity = '0.5';
                    e.dataTransfer.effectAllowed = 'move';
                });

                card.addEventListener('dragend', function() {
                    this.style.opacity = '1';
                    draggedCard = null;
                });
            });

            columns.forEach(col => {
                col.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                });

                col.addEventListener('drop', function(e) {
                    e.preventDefault();
                    if (draggedCard) {
                        const ticketId = draggedCard.getAttribute('data-ticket-id');
                        const targetStatus = col.getAttribute('data-status');
                        if (ticketId && targetStatus) {
                            const moveInput = document.querySelector('input[key="move_data"]');
                            if (moveInput) {
                                moveInput.value = JSON.stringify({ticket_id: ticketId, status: targetStatus});
                                moveInput.dispatchEvent(new Event('input', { bubbles: true }));
                                moveInput.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }
                    }
                });
            });
        });
        </script>
        """,
        unsafe_allow_html=True,
    )


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
tickets = prepare_dataframe(fetch_tickets())
deleted_tickets = prepare_dataframe(fetch_deleted_tickets())

inject_styles()

top_left, top_right = st.columns([4, 1])
with top_left:
    render_metrics(tickets)
with top_right:
    st.write("")
    st.write("")
    if st.button("＋ Nouveau ticket", type="primary", use_container_width=True):
        st.session_state["show_create_dialog"] = True

if st.session_state.get("show_create_dialog"):
    create_ticket_dialog()

st.write("")
with st.container(border=True):
    st.markdown("#### Filtres")
    filter_col1, filter_col2, filter_col3, filter_col4 = st.columns([1.2, 1.5, 1.2, 1.8])
    selected_categories = filter_col1.multiselect("Catégories", CATEGORIES, default=CATEGORIES)
    selected_statuses = filter_col2.multiselect("Statuts", STATUSES, default=STATUSES)
    selected_priorities = filter_col3.multiselect("Priorités", PRIORITIES, default=PRIORITIES)
    search = filter_col4.text_input("Recherche", placeholder="Titre, description, projet...")

filtered = tickets.copy()
if not filtered.empty:
    filtered = filtered[
        filtered["category"].isin(selected_categories)
        & filtered["status"].isin(selected_statuses)
        & filtered["priority"].isin(selected_priorities)
    ]
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

tab_board, tab_dashboard, tab_list, tab_table, tab_trash = st.tabs(["Board", "Dashboard", "Aperçu complet", "Tableau", "Corbeille"])

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
