import sqlite3
import os

def create_kpi_database():
    """Create the clubKPI database with the kpi_goals table"""
    
    db_path = "clubKPI.db"
    
    # Remove existing database if it exists
    if os.path.exists(db_path):
        print(f"Removing existing database: {db_path}")
        os.remove(db_path)
    
    # Create new database connection
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create kpi_goals table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS kpi_goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metric_name TEXT UNIQUE NOT NULL,
            goal_value REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Insert default KPI goals
    default_kpis = [
        ('guests', 500),
        ('qualified_guests', 450),
        ('deals', 315),
        ('first_workouts', 220),
        ('five_star_reviews', 175),
        ('reprograms', 130),
        ('new_pt_units', 60),
        ('closing_percentage', 70),
        ('first_workout_show_percentage', 70),
        ('five_star_review_percentage', 80),
        ('average_eft', 50),
        ('pt_quota_new_fd', 25000),
        ('pt_quota_renew_fd', 30000),
        ('pt_quota_new_wfd', 20000),
        ('pt_quota_renew_wfd', 25000),
        ('nbpromo_quota_gm', 50000),
        ('nbpromo_quota_agm', 20000),
        ('fept_quota_gm', 15000),
        ('fept_quota_agm', 5347),
        ('neweft_quota_gm', 12000),
        ('neweft_quota_agm', 4277),
        ('collections_quota', 5000),
        ('pif_renewals_quota', 3000),
        ('abc_dues_quota', 129426),
        ('coordinator_bonus_quota', 8000),
    ]
    
    for metric, goal in default_kpis:
        cursor.execute("""
            INSERT INTO kpi_goals (metric_name, goal_value) 
            VALUES (?, ?)
        """, (metric, goal))
    
    # Create trigger to update the updated_at timestamp
    cursor.execute("""
        CREATE TRIGGER update_kpi_timestamp 
        AFTER UPDATE ON kpi_goals
        FOR EACH ROW
        BEGIN
            UPDATE kpi_goals SET updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.id;
        END
    """)
    
    conn.commit()
    print(f"✅ Database created successfully at: {db_path}")
    
    # Display the created records
    cursor.execute("SELECT * FROM kpi_goals")
    records = cursor.fetchall()
    
    print("\n📊 Default KPI Goals:")
    print("-" * 50)
    print(f"{'Metric Name':<30} {'Goal Value':<15}")
    print("-" * 50)
    
    for record in records:
        print(f"{record[1]:<30} {record[2]:<15}")
    
    conn.close()

if __name__ == "__main__":
    create_kpi_database()
