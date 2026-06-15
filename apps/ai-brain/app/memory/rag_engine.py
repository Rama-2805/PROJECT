# ─── SmartCampus AI — Retrieval Augmented Generation ─
# Part 8: Knowledge retrieval pipeline that combines
# attendance records, student history, policies, and AI analytics.

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Optional
import re
from difflib import SequenceMatcher

from ..mock_data import KNOWLEDGE_ARTICLES, STUDENTS, COURSES, DEVICES, ATTENDANCE_RECORDS
from ..agent_core import MemorySystem, MemoryEntry


@dataclass
class RetrievedDocument:
    content: str
    source: str
    score: float
    category: str
    metadata: dict = field(default_factory=dict)


class RAGEngine:
    """Retrieval Augmented Generation engine for campus knowledge."""

    def __init__(self, memory: Optional[MemorySystem] = None):
        self.memory = memory or MemorySystem()
        self._knowledge_base: list[dict] = []
        self._build_knowledge_base()

    def _build_knowledge_base(self) -> None:
        """Build internal knowledge base from mock data sources."""
        # Add knowledge articles
        for article in KNOWLEDGE_ARTICLES:
            self._knowledge_base.append({
                "content": article["content"],
                "source": article["title"],
                "category": article["category"],
                "type": "article",
            })

        # Add student profiles
        for student in STUDENTS:
            self._knowledge_base.append({
                "content": (
                    f"Student {student['name']} (ID: {student['id']}) is in {student['department']} "
                    f"department, semester {student['semester']}. "
                    f"Attendance: {student['attendance']}%, Engagement: {student['engagement']}%. "
                    f"Email: {student['email']}"
                ),
                "source": f"Student Profile — {student['name']}",
                "category": "academic",
                "type": "student",
                "metadata": student,
            })

        # Add course info
        for course in COURSES:
            self._knowledge_base.append({
                "content": (
                    f"Course {course['code']}: {course['name']}. "
                    f"Department: {course['department']}, Credits: {course['credits']}, "
                    f"Taught by {course['teacher']}."
                ),
                "source": f"Course — {course['code']}",
                "category": "academic",
                "type": "course",
                "metadata": course,
            })

        # Add device info
        for device in DEVICES:
            self._knowledge_base.append({
                "content": (
                    f"Device {device['name']} (ID: {device['id']}). "
                    f"Type: {device['type']}, Status: {device['status']}, "
                    f"CPU: {device['cpu']}%, Temp: {device['temp']}°C, Uptime: {device['uptime']}%"
                ),
                "source": f"Device — {device['name']}",
                "category": "technical",
                "type": "device",
                "metadata": device,
            })

    def retrieve(self, query: str, top_k: int = 5, category: Optional[str] = None) -> list[RetrievedDocument]:
        """Retrieve relevant documents using keyword + semantic matching."""
        query_lower = query.lower()
        query_words = set(re.findall(r'\w+', query_lower))
        scored: list[tuple[float, dict]] = []

        for doc in self._knowledge_base:
            if category and doc.get("category") != category:
                continue

            doc_content_lower = doc["content"].lower()
            doc_words = set(re.findall(r'\w+', doc_content_lower))

            # Keyword overlap score
            overlap = len(query_words & doc_words) / max(len(query_words), 1)

            # Exact phrase match bonus
            phrase_bonus = 0
            for phrase in [query_lower]:
                if phrase in doc_content_lower:
                    phrase_bonus = 0.3

            # Title/source match bonus
            source_bonus = 0
            if any(word in doc.get("source", "").lower() for word in query_words):
                source_bonus = 0.2

            score = overlap + phrase_bonus + source_bonus
            if score > 0:
                scored.append((score, doc))

        # Sort by score descending
        scored.sort(key=lambda x: x[0], reverse=True)

        results = []
        for score, doc in scored[:top_k]:
            results.append(RetrievedDocument(
                content=doc["content"],
                source=doc.get("source", ""),
                score=round(score, 3),
                category=doc.get("category", "general"),
                metadata=doc.get("metadata", {}),
            ))

        return results

    def retrieve_for_student(self, query: str, student_id: str, top_k: int = 3) -> list[RetrievedDocument]:
        """Retrieve documents specifically relevant to a student."""
        # Get student-specific knowledge
        student = next((s for s in STUDENTS if s["id"] == student_id), None)
        if not student:
            return self.retrieve(query, top_k)

        # Add student context to query for better retrieval
        enhanced_query = f"{query} {student['name']} {student['department']}"
        results = self.retrieve(enhanced_query, top_k)

        # Add attendance data if relevant
        if any(w in query.lower() for w in ["attendance", "missed", "absent", "present"]):
            records = ATTENDANCE_RECORDS.get(student_id, [])
            total = len(records)
            present = sum(1 for r in records if r["present"])
            pct = round((present / total * 100)) if total > 0 else 0

            attendance_doc = RetrievedDocument(
                content=f"Student {student['name']} has attended {present} out of {total} classes ({pct}%). "
                        f"Attendance records span {total} days.",
                source="Attendance Records",
                score=0.95,
                category="academic",
                metadata={"student_id": student_id, "percentage": pct, "total": total, "present": present},
            )
            results.insert(0, attendance_doc)

        return results[:top_k]

    def retrieve_by_category(self, category: str, top_k: int = 10) -> list[RetrievedDocument]:
        """Retrieve all documents in a category."""
        return [
            RetrievedDocument(
                content=doc["content"],
                source=doc.get("source", ""),
                score=1.0,
                category=doc.get("category", "general"),
                metadata=doc.get("metadata", {}),
            )
            for doc in self._knowledge_base
            if doc.get("category") == category
        ][:top_k]

    def format_context(self, documents: list[RetrievedDocument]) -> str:
        """Format retrieved documents as context for LLM prompt."""
        if not documents:
            return "No relevant information found."

        context_parts = ["Here is the relevant information from the campus knowledge base:\n"]
        for i, doc in enumerate(documents, 1):
            context_parts.append(f"[{i}] From: {doc.source} (relevance: {doc.score:.0%})")
            context_parts.append(f"    {doc.content}")
            context_parts.append("")

        return "\n".join(context_parts)
