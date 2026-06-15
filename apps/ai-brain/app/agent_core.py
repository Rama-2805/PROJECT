# ─── SmartCampus AI — Agent Core Architecture ────────
# Base agent classes, registry, memory, communication protocol.

from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional
import uuid
from datetime import datetime


# ─── Agent Registry ────────────────────────────────
@dataclass
class AgentRecord:
    agent_id: str
    name: str
    capabilities: list[str]
    permissions: list[str]
    model_version: str
    status: str  # online, busy, offline
    description: str


class AgentRegistry:
    """Central registry of all AI agents."""

    def __init__(self):
        self._agents: dict[str, AgentRecord] = {}

    def register(self, record: AgentRecord) -> None:
        self._agents[record.agent_id] = record

    def get(self, agent_id: str) -> Optional[AgentRecord]:
        return self._agents.get(agent_id)

    def find_by_capability(self, capability: str) -> list[AgentRecord]:
        return [a for a in self._agents.values() if capability in a.capabilities]

    def list_all(self) -> list[AgentRecord]:
        return list(self._agents.values())

    def update_status(self, agent_id: str, status: str) -> None:
        if agent_id in self._agents:
            self._agents[agent_id].status = status


# ─── Memory System ────────────────────────────────
@dataclass
class MemoryEntry:
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    type: str = "short_term"  # short_term, long_term, institution, agent
    content: Any = None
    context: dict = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    source: str = ""

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "type": self.type,
            "content": self.content,
            "context": self.context,
            "timestamp": self.timestamp,
            "source": self.source,
        }


class MemorySystem:
    """Multi-tier memory system: short-term, long-term, institution, agent."""

    def __init__(self):
        self.short_term: dict[str, list[MemoryEntry]] = {}  # conversation_id -> entries
        self.long_term: dict[str, list[MemoryEntry]] = {}  # user_id -> preferences
        self.institution_memory: list[MemoryEntry] = []  # rules, policies, history
        self.agent_memory: dict[str, list[MemoryEntry]] = {}  # agent_id -> task history

    def add_short_term(self, conversation_id: str, content: Any, source: str = "", context: dict = None) -> MemoryEntry:
        entry = MemoryEntry(type="short_term", content=content, source=source, context=context or {})
        if conversation_id not in self.short_term:
            self.short_term[conversation_id] = []
        self.short_term[conversation_id].append(entry)
        return entry

    def get_short_term(self, conversation_id: str, limit: int = 10) -> list[MemoryEntry]:
        return self.short_term.get(conversation_id, [])[-limit:]

    def add_long_term(self, user_id: str, preference: Any) -> MemoryEntry:
        entry = MemoryEntry(type="long_term", content=preference, source=user_id)
        if user_id not in self.long_term:
            self.long_term[user_id] = []
        self.long_term[user_id].append(entry)
        return entry

    def get_long_term(self, user_id: str) -> list[MemoryEntry]:
        return self.long_term.get(user_id, [])

    def add_institutional(self, content: Any, source: str = "") -> MemoryEntry:
        entry = MemoryEntry(type="institution", content=content, source=source)
        self.institution_memory.append(entry)
        return entry

    def get_institutional(self, limit: int = 20) -> list[MemoryEntry]:
        return self.institution_memory[-limit:]

    def add_agent_memory(self, agent_id: str, content: Any, source: str = "") -> MemoryEntry:
        entry = MemoryEntry(type="agent", content=content, source=source)
        if agent_id not in self.agent_memory:
            self.agent_memory[agent_id] = []
        self.agent_memory[agent_id].append(entry)
        return entry

    def get_agent_memory(self, agent_id: str, limit: int = 20) -> list[MemoryEntry]:
        return self.agent_memory.get(agent_id, [])[-limit:]


# ─── Communication Protocol ───────────────────────
@dataclass
class AgentMessage:
    message_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    sender_id: str = ""
    receiver_id: str = ""
    intent: str = ""
    payload: dict = field(default_factory=dict)
    confidence: float = 1.0
    requires_approval: bool = False
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


class CommunicationProtocol:
    """Agent-to-agent communication bus."""

    def __init__(self):
        self.messages: list[AgentMessage] = []

    def send(self, msg: AgentMessage) -> None:
        self.messages.append(msg)

    def get_messages_for(self, agent_id: str, limit: int = 20) -> list[AgentMessage]:
        return [m for m in self.messages if m.receiver_id == agent_id][-limit:]

    def get_conversation(self, agent_ids: list[str], limit: int = 30) -> list[AgentMessage]:
        return [m for m in self.messages if m.sender_id in agent_ids and m.receiver_id in agent_ids][-limit:]


# ─── Base Agent ───────────────────────────────────
class BaseAgent(ABC):
    """Abstract base class for all AI agents."""

    def __init__(self, registry: AgentRegistry, memory: MemorySystem, comms: CommunicationProtocol):
        self.registry = registry
        self.memory = memory
        self.comms = comms
        self.record: Optional[AgentRecord] = None

    @abstractmethod
    def process(self, query: str, context: dict = None) -> dict:
        """Process a user query and return a structured response."""
        pass

    def search_knowledge(self, query: str) -> list[dict]:
        """Mock RAG: simple keyword matching against mock knowledge base."""
        from .mock_data import KNOWLEDGE_ARTICLES
        query_lower = query.lower()
        results = []
        for article in KNOWLEDGE_ARTICLES:
            if any(word in article["content"].lower() for word in query_lower.split()):
                results.append(article)
        return results[:3]

    def respond(self, text: str, confidence: float = 0.9, data: dict = None, actions: list = None) -> dict:
        return {
            "text": text,
            "confidence": confidence,
            "data": data or {},
            "actions": actions or [],
            "agent_id": self.record.agent_id if self.record else "unknown",
            "agent_name": self.record.name if self.record else "Unknown",
        }
