from datetime import date, datetime
from html import escape
import json
import sqlite3

from openai import OpenAI
import pandas as pd
import streamlit as st


DB_PATH = "tickets.db"
STATUSES = ["Backlog", "À faire", "En cours", "Bloqué", "Terminé"]
PRIORITIES = ["Urgente", "Haute", "Moyenne", "Basse"]
CATEGORIES = ["Privé", "Pro", "Freelance"]
PRIORITY_SCORE = {"Urgente": 4, "Haute": 3, "Moyenne": 2, "Basse": 1}
STATUS_SCORE = {"Bloqué": 3, "En cours": 2, "À faire": 1, "Backlog": 0, "Terminé": -1}
STATUS_ICONS = {"Backlog": "📥", "À faire": "🧭", "En cours": "⚙️", "Bloqué": "⛔", "Terminé": "✅"}
CATEGORY_ICONS = {"Privé": "🏠", "Pro": "💼", "Freelance": "🤝"}
AI_MODEL = "gpt-4o-mini"


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
            completed_at TEXT
        )
        """
    )
    conn.commit()


def fetch_tickets():
    conn = get_connection()
    return pd.read_sql_query("SELECT * FROM tickets ORDER BY created_at DESC", conn)


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
    conn = get_connection()
    conn.execute("DELETE FROM tickets WHERE id = ?", (ticket_id,))
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


def render_metrics(df):
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

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Tickets actifs", len(active))
    col2.metric("En cours", len(df[df["status"] == "En cours"]) if not df.empty else 0)
    col3.metric("En retard", len(overdue))
    col4.metric("À 7 jours", len(due_soon))


def inject_styles():
    st.markdown(
        """
        <style>
        .block-container {
            padding-top: 1.3rem;
            padding-bottom: 2rem;
            max-width: 1500px;
        }
        div[data-testid="stMetric"] {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 14px 16px;
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
        }
        .hero {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            padding: 22px 24px;
            border-radius: 22px;
            background: linear-gradient(135deg, #172554 0%, #2563eb 55%, #38bdf8 100%);
            color: white;
            margin-bottom: 18px;
            box-shadow: 0 18px 45px rgba(37, 99, 235, 0.24);
        }
        .hero h1 {
            margin: 0;
            font-size: 34px;
            line-height: 1.1;
        }
        .hero p {
            margin: 8px 0 0;
            color: rgba(255,255,255,0.86);
        }
        .ticket-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 14px;
            margin-bottom: 12px;
            box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
        }
        .ticket-card:hover {
            border-color: #93c5fd;
            box-shadow: 0 12px 32px rgba(37, 99, 235, 0.12);
        }
        .ticket-title {
            font-weight: 800;
            font-size: 15px;
            color: #0f172a;
            margin-bottom: 8px;
        }
        .ticket-desc {
            color: #475569;
            font-size: 13px;
            line-height: 1.45;
            margin: 8px 0 10px;
        }
        .muted {
            color: #64748b;
            font-size: 12px;
        }
        .pill {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 9px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            margin-right: 5px;
            margin-bottom: 5px;
            border: 1px solid rgba(15, 23, 42, 0.08);
        }
        .prio-Urgente { background: #fee2e2; color: #991b1b; }
        .prio-Haute { background: #ffedd5; color: #9a3412; }
        .prio-Moyenne { background: #fef3c7; color: #92400e; }
        .prio-Basse { background: #dcfce7; color: #166534; }
        .cat-Privé { background: #ede9fe; color: #5b21b6; }
        .cat-Pro { background: #dbeafe; color: #1d4ed8; }
        .cat-Freelance { background: #ccfbf1; color: #0f766e; }
        .due-overdue { color: #b91c1c; font-weight: 800; }
        .due-today { color: #c2410c; font-weight: 800; }
        .due-normal { color: #475569; font-weight: 700; }
        .column-header {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 10px 12px;
            margin-bottom: 12px;
            font-weight: 900;
            color: #0f172a;
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
        <div class="ticket-card">
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
        index=STATUSES.index(defaults.get("status", "À faire")) if defaults.get("status") in STATUSES else 1,
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
    if defaults.get("due_date"):
        parsed_due = datetime.fromisoformat(defaults["due_date"]).date()
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
    with st.form("create_ticket", clear_on_submit=True):
        new_ticket = ticket_form("new")
        ai_col, submit_col = st.columns(2)
        improve = ai_col.form_submit_button("✨ Améliorer avec IA", use_container_width=True)
        submitted = submit_col.form_submit_button("Créer le ticket", type="primary", use_container_width=True)
        if improve:
            improve_ticket_from_form("new", new_ticket)
        if submitted:
            if not new_ticket[0].strip():
                st.error("Le titre est obligatoire.")
            else:
                add_ticket(*new_ticket)
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

inject_styles()

st.markdown(
    """
    <div class="hero">
        <div>
            <h1>🎫 Personal Ticketing</h1>
            <p>Un espace clair pour piloter tes tâches privées, professionnelles et freelance.</p>
        </div>
        <div class="muted" style="color: rgba(255,255,255,0.86);">Vue Kanban + aperçu complet</div>
    </div>
    """,
    unsafe_allow_html=True,
)

top_left, top_right = st.columns([4, 1])
with top_left:
    render_metrics(tickets)
with top_right:
    st.write("")
    st.write("")
    if st.button("＋ Nouveau ticket", type="primary", use_container_width=True):
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
    if search:
        query = search.lower()
        filtered = filtered[
            filtered["title"].str.lower().str.contains(query, na=False)
            | filtered["description"].str.lower().str.contains(query, na=False)
            | filtered["project"].str.lower().str.contains(query, na=False)
        ]

tab_board, tab_list, tab_table = st.tabs(["Board", "Aperçu complet", "Tableau"])

with tab_board:
    if filtered.empty:
        st.info("Aucun ticket à afficher.")
    else:
        columns = st.columns(len(STATUSES))
        for column, status in zip(columns, STATUSES):
            status_df = filtered[filtered["status"] == status]
            with column:
                st.markdown(
                    f"<div class='column-header'>{STATUS_ICONS.get(status, '')} {status} · {len(status_df)}</div>",
                    unsafe_allow_html=True,
                )
                for _, row in status_df.sort_values("score", ascending=False).iterrows():
                    ticket_card(row, compact=True)
                    if st.button("Ouvrir", key=f"open_board_{int(row['id'])}", use_container_width=True):
                        edit_ticket_dialog(int(row["id"]))

with tab_list:
    st.subheader("Aperçu complet des tickets")
    if filtered.empty:
        st.info("Aucun ticket à afficher.")
    else:
        for _, row in filtered.sort_values(["score", "created_at"], ascending=[False, False]).iterrows():
            card_col, action_col = st.columns([5, 1])
            with card_col:
                ticket_card(row)
            with action_col:
                st.write("")
                st.write("")
                if st.button("Modifier", key=f"open_list_{int(row['id'])}", use_container_width=True):
                    edit_ticket_dialog(int(row["id"]))

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
