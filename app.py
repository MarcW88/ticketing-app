from datetime import date, datetime
import sqlite3

import pandas as pd
import streamlit as st


DB_PATH = "tickets.db"
STATUSES = ["Backlog", "À faire", "En cours", "Bloqué", "Terminé"]
PRIORITIES = ["Urgente", "Haute", "Moyenne", "Basse"]
CATEGORIES = ["Privé", "Pro", "Freelance"]
PRIORITY_SCORE = {"Urgente": 4, "Haute": 3, "Moyenne": 2, "Basse": 1}
STATUS_SCORE = {"Bloqué": 3, "En cours": 2, "À faire": 1, "Backlog": 0, "Terminé": -1}


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
    overdue = active[pd.to_datetime(active["due_date"], errors="coerce").dt.date < date.today()] if not active.empty else active
    due_soon = active[
        pd.to_datetime(active["due_date"], errors="coerce").dt.date.between(date.today(), date.fromordinal(date.today().toordinal() + 7))
    ] if not active.empty else active

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Tickets actifs", len(active))
    col2.metric("En cours", len(df[df["status"] == "En cours"]) if not df.empty else 0)
    col3.metric("En retard", len(overdue))
    col4.metric("À 7 jours", len(due_soon))


def ticket_form(prefix, defaults=None):
    defaults = defaults or {}
    title = st.text_input("Titre", value=defaults.get("title", ""), key=f"{prefix}_title")
    description = st.text_area("Description", value=defaults.get("description", ""), key=f"{prefix}_description")

    col1, col2 = st.columns(2)
    category = col1.selectbox(
        "Catégorie",
        CATEGORIES,
        index=CATEGORIES.index(defaults.get("category", "Privé")) if defaults.get("category") in CATEGORIES else 0,
        key=f"{prefix}_category",
    )
    project = col2.text_input("Projet / client", value=defaults.get("project", ""), key=f"{prefix}_project")

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


init_db()
tickets = prepare_dataframe(fetch_tickets())

st.title("🎫 Personal Ticketing")
st.caption("Priorise tes tâches privées, professionnelles et freelance depuis un seul tableau de bord.")

render_metrics(tickets)

with st.sidebar:
    st.header("Créer un ticket")
    with st.form("create_ticket", clear_on_submit=True):
        new_ticket = ticket_form("new")
        submitted = st.form_submit_button("Ajouter le ticket", type="primary")
        if submitted:
            if not new_ticket[0].strip():
                st.error("Le titre est obligatoire.")
            else:
                add_ticket(*new_ticket)
                st.success("Ticket ajouté.")
                st.rerun()

st.subheader("Filtres")
filter_col1, filter_col2, filter_col3, filter_col4 = st.columns(4)
selected_categories = filter_col1.multiselect("Catégories", CATEGORIES, default=CATEGORIES)
selected_statuses = filter_col2.multiselect("Statuts", STATUSES, default=["Backlog", "À faire", "En cours", "Bloqué"])
selected_priorities = filter_col3.multiselect("Priorités", PRIORITIES, default=PRIORITIES)
search = filter_col4.text_input("Recherche")

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

left, right = st.columns([1.6, 1])

with left:
    st.subheader("Tickets prioritaires")
    if filtered.empty:
        st.info("Aucun ticket à afficher.")
    else:
        for _, row in filtered.iterrows():
            due_text = "Pas d'échéance"
            if pd.notna(row.get("due")):
                if row["days_left"] < 0:
                    due_text = f"En retard de {abs(int(row['days_left']))} j"
                elif row["days_left"] == 0:
                    due_text = "Aujourd'hui"
                else:
                    due_text = f"Dans {int(row['days_left'])} j"

            with st.container(border=True):
                top1, top2 = st.columns([4, 1])
                top1.markdown(f"### #{int(row['id'])} — {row['title']}")
                top2.markdown(priority_badge(row["priority"]), unsafe_allow_html=True)
                st.markdown(status_badge(row["status"]), unsafe_allow_html=True)
                st.write(row["description"] or "_")
                meta1, meta2, meta3 = st.columns(3)
                meta1.write(f"**Catégorie :** {row['category']}")
                meta2.write(f"**Projet :** {row['project'] or '-'}")
                meta3.write(f"**Échéance :** {due_text}")

with right:
    st.subheader("Modifier un ticket")
    if tickets.empty:
        st.info("Crée ton premier ticket via la barre latérale.")
    else:
        selected_id = st.selectbox(
            "Ticket",
            tickets["id"].tolist(),
            format_func=lambda x: f"#{x} — {tickets.loc[tickets['id'] == x, 'title'].iloc[0]}",
        )
        current = tickets[tickets["id"] == selected_id].iloc[0].to_dict()
        with st.form("edit_ticket"):
            edited_ticket = ticket_form("edit", current)
            save_col, delete_col = st.columns(2)
            save = save_col.form_submit_button("Enregistrer", type="primary")
            remove = delete_col.form_submit_button("Supprimer")
            if save:
                if not edited_ticket[0].strip():
                    st.error("Le titre est obligatoire.")
                else:
                    update_ticket(selected_id, *edited_ticket)
                    st.success("Ticket mis à jour.")
                    st.rerun()
            if remove:
                delete_ticket(selected_id)
                st.success("Ticket supprimé.")
                st.rerun()

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
