import psycopg2

DB_URL = "postgresql://postgres.thdyyxaujmhxkdlyiook:Ofni_koff88*@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

def delete_all_tickets():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM tickets")
    count = cursor.fetchone()[0]
    print(f"📊 {count} tickets trouvés dans la base de données")
    
    cursor.execute("DELETE FROM tickets")
    print("✅ Tous les tickets ont été supprimés")
    
    cursor.execute("SELECT COUNT(*) FROM tickets")
    new_count = cursor.fetchone()[0]
    print(f"📊 Nouveau nombre de tickets : {new_count}")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    print("🗑️  Suppression de tous les tickets de Supabase...")
    delete_all_tickets()
