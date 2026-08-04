import os
import sqlite3
import numpy as np
import faiss

class DatabaseManager:
    def __init__(self, faiss_index_file="database/faiss_index.bin", sqlite_db_file="database/student_db.sqlite", dim=512):
        self.faiss_index_file = faiss_index_file
        self.sqlite_db_file = sqlite_db_file
        self.dim = dim

        os.makedirs(os.path.dirname(faiss_index_file), exist_ok=True)
        os.makedirs(os.path.dirname(sqlite_db_file), exist_ok=True)

        self._init_sqlite()
        self._init_faiss()

    def _init_sqlite(self):
        conn = sqlite3.connect(self.sqlite_db_file)
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS enrolled_students (
                student_id TEXT PRIMARY KEY,
                vector_id INTEGER,
                saved_count INTEGER,
                enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        conn.close()

    def _init_faiss(self):
        if os.path.exists(self.faiss_index_file):
            self.index = faiss.read_index(self.faiss_index_file)
        else:
            self.index = faiss.IndexFlatIP(self.dim)

    def add_student(self, student_id: str, embeddings: list, metadata: list):
        if not embeddings:
            return

        embs = np.vstack(embeddings).astype(np.float32)
        norms = np.linalg.norm(embs, axis=1, keepdims=True)
        embs = embs / (norms + 1e-10)

        start_vector_id = self.index.ntotal
        self.index.add(embs)
        faiss.write_index(self.index, self.faiss_index_file)

        conn = sqlite3.connect(self.sqlite_db_file)
        cur = conn.cursor()
        cur.execute(
            "INSERT OR REPLACE INTO enrolled_students (student_id, vector_id, saved_count) VALUES (?, ?, ?)",
            (student_id, start_vector_id, len(embeddings))
        )
        conn.commit()
        conn.close()
