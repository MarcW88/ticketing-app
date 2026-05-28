# Personal Ticketing

App Streamlit locale pour gérer et prioriser des tickets privés, professionnels et freelance.

## Fonctionnalités

- Création de tickets avec catégorie, projet/client, priorité, statut, échéance et estimation
- Stockage local SQLite dans `tickets.db`
- Filtres par catégorie, statut, priorité et recherche texte
- Score de priorité automatique basé sur priorité, statut et échéance
- Modification et suppression des tickets
- Vue cartes + tableau

## Lancer l'app

```bash
pip install -r requirements.txt
streamlit run app.py
```

L'app s'ouvre ensuite dans le navigateur.
