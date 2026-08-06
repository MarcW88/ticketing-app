import psycopg2

DB_URL = "postgresql://postgres.thdyyxaujmhxkdlyiook:Ofni_koff88*@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

def check_tickets():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM tickets")
    count = cursor.fetchone()[0]
    
    cursor.execute("SELECT id, title, category, project, priority, created_at FROM tickets ORDER BY id DESC LIMIT 10")
    recent = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    print(f"📊 Total tickets : {count}")
    print("\n📋 10 derniers tickets :")
    for ticket in recent:
        print(f"  - #{ticket[0]}: {ticket[1]} ({ticket[2]} - {ticket[3]}) - {ticket[5]}")

if __name__ == "__main__":
    check_tickets()
