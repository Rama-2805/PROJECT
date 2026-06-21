import sqlite3

DB_PATH = "smartcampus_dev.db"

def check():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    print("--- SQLite 'students' table ---")
    try:
        cur.execute("SELECT id, usn, name FROM students;")
        rows = cur.fetchall()
        for r in rows:
            print(r)
    except Exception as e:
        print(f"Error students: {e}")
        
    print("\n--- SQLite 'attendances' table ---")
    try:
        cur.execute("SELECT id, student_id, class_id, date, time, status FROM attendances;")
        rows = cur.fetchall()
        for r in rows:
            print(r)
    except Exception as e:
        print(f"Error attendances: {e}")
        
    cur.close()
    conn.close()

if __name__ == "__main__":
    check()
