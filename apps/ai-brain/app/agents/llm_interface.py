# ─── SmartCampus AI — LLM Integration Interface ─────
# Part 7: Supports local open-source LLMs, cloud AI APIs,
# and mock simulation mode for ₹0 budget development.

from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional
import json
import os


@dataclass
class LLMResponse:
    text: str
    model: str = ""
    tokens_used: int = 0
    latency_ms: float = 0
    confidence: float = 1.0


class BaseLLMBackend(ABC):
    """Abstract base for LLM backends."""

    @abstractmethod
    def generate(self, prompt: str, system_prompt: str = "", max_tokens: int = 512, temperature: float = 0.7) -> LLMResponse:
        pass

    @abstractmethod
    def embed(self, text: str) -> list[float]:
        pass


class MockLLMBackend(BaseLLMBackend):
    """Mock LLM for ₹0 budget demo mode. Generates realistic responses without API calls."""

    def __init__(self):
        self._response_templates = {
            "attendance": [
                "Based on the attendance records, the student currently has {attendance}% attendance. {recommendation}",
                "I've analyzed the attendance data. The student has missed {missed} classes this month. Their attendance trend is {trend}.",
                "Attendance analysis complete. Current rate: {attendance}%. This is {status} the minimum threshold of 75%.",
            ],
            "engagement": [
                "Engagement score is {engagement}%. Peak performance occurs during {best_time} slots.",
                "The student shows {engagement}% engagement. Recommended: {recommendation}",
                "Learning analytics indicate {engagement}% overall engagement with highest focus in morning sessions.",
            ],
            "schedule": [
                "Today's schedule has {count} classes. Next up: {next_class} at {next_time} in {next_room}.",
                "Here's the timetable for today. You have {count} class(es) scheduled.",
                "Schedule retrieved. {count} class(es) today. Remember to check for any last-minute changes.",
            ],
            "resource": [
                "Resource utilization report: {underutilized} buildings underutilized, {overloaded} overloaded.",
                "Campus resource analysis complete. {pct}% overall utilization across all buildings.",
                "Optimization analysis ready. Recommended: {recommendation}",
            ],
            "general": [
                "I understand you're asking about {topic}. Based on campus data, I can help with attendance tracking, academic queries, schedules, and learning recommendations.",
                "Let me look into that for you. From what I can see in the university systems, {response}",
                "Here's what I found in the campus knowledge base: {response}",
            ],
        }

    def generate(self, prompt: str, system_prompt: str = "", max_tokens: int = 512, temperature: float = 0.7) -> LLMResponse:
        # Simulate processing delay
        import time
        start = time.time()

        # Simple response simulation
        prompt_lower = prompt.lower()
        if any(w in prompt_lower for w in ["attendance", "missed", "absent"]):
            response = "Based on campus data, I can see the attendance records. Let me analyze the patterns and provide insights."
        elif any(w in prompt_lower for w in ["engagement", "focus", "learning"]):
            response = "Learning analytics show varied engagement patterns throughout the day. Morning sessions typically have higher focus levels."
        elif any(w in prompt_lower for w in ["schedule", "class", "timetable"]):
            response = "I've checked the timetable. Let me summarize the upcoming schedule for you."
        elif any(w in prompt_lower for w in ["device", "camera", "sensor"]):
            response = "Device monitoring shows several systems online. I can provide detailed health metrics for each device."
        elif any(w in prompt_lower for w in ["resource", "building", "classroom"]):
            response = "Campus resource analysis completed. I can see varying utilization across different buildings."
        else:
            response = f"I've processed your request regarding '{prompt[:50]}...' using the campus knowledge base. I can provide detailed analytics and recommendations."

        elapsed = (time.time() - start) * 1000

        return LLMResponse(
            text=response,
            model="mock-llm-v1",
            tokens_used=len(response.split()),
            latency_ms=round(elapsed, 1),
            confidence=0.85,
        )

    def embed(self, text: str) -> list[float]:
        """Simple mock embedding using word hashing."""
        import hashlib
        words = text.lower().split()
        vec = [0.0] * 128
        for i, word in enumerate(words):
            h = hashlib.md5(word.encode()).digest()
            for j in range(min(128, len(h))):
                vec[j] += (h[j] / 255.0) * (1.0 / len(words))
        return vec


class LLMInterface:
    """Main LLM interface that routes to the configured backend."""

    def __init__(self, backend: Optional[BaseLLMBackend] = None):
        self.backend = backend or MockLLMBackend()
        self._conversation_history: list[dict] = []

    def set_backend(self, backend: BaseLLMBackend) -> None:
        self.backend = backend

    def chat(self, prompt: str, system_prompt: str = "", context: list[dict] = None) -> LLMResponse:
        """Send a chat prompt to the LLM with optional conversation context."""
        full_prompt = prompt
        if context:
            context_str = "\n".join(f"{c.get('role', 'user')}: {c.get('content', '')}" for c in context[-5:])
            full_prompt = f"Previous context:\n{context_str}\n\nCurrent query: {prompt}"

        response = self.backend.generate(full_prompt, system_prompt)
        self._conversation_history.append({"role": "user", "content": prompt})
        self._conversation_history.append({"role": "assistant", "content": response.text})
        return response

    def generate_embedding(self, text: str) -> list[float]:
        return self.backend.embed(text)

    def get_conversation_history(self, limit: int = 10) -> list[dict]:
        return self._conversation_history[-limit * 2:]

    def clear_history(self) -> None:
        self._conversation_history.clear()


# ── Factory ──────────────────────────────────────────

def create_llm_interface(mode: str = "mock") -> LLMInterface:
    """Factory to create LLM interface. Supports 'mock', 'openai', 'anthropic', 'local' modes."""
    if mode == "mock":
        return LLMInterface(MockLLMBackend())
    elif mode == "openai":
        # Placeholder for OpenAI integration
        raise NotImplementedError("OpenAI backend not yet configured. Set OPENAI_API_KEY in environment.")
    elif mode == "local":
        # Placeholder for local model (Llama, Mistral, etc.)
        raise NotImplementedError("Local LLM backend not yet configured. Install via requirements.txt")
    else:
        return LLMInterface(MockLLMBackend())
