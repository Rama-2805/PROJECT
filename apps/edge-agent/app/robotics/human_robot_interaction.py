# ─── SmartCampus AI — Human-Robot Interaction ──────
# Part 11: Voice interaction, touch displays, mobile app control,
# gesture recognition, and natural language commands.

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, Callable
from datetime import datetime
import random
import re


@dataclass
class VoiceCommand:
    text: str
    intent: str = ""
    confidence: float = 0.0
    entities: dict = field(default_factory=dict)  # e.g., {"robot_id": "assistant-01", "location": "library"}
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict:
        return {
            "text": self.text,
            "intent": self.intent,
            "confidence": round(self.confidence, 2),
            "entities": self.entities,
            "timestamp": self.timestamp,
        }


@dataclass
class Gesture:
    gesture_type: str  # wave, point, swipe_up, swipe_down, pinch, grab
    confidence: float = 0.0
    hand: str = "right"  # left, right
    position: dict = field(default_factory=lambda: {"x": 0, "y": 0, "z": 0})
    detected_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict:
        return {
            "gesture_type": self.gesture_type,
            "confidence": round(self.confidence, 2),
            "hand": self.hand,
            "position": self.position,
            "detected_at": self.detected_at,
        }


# Intent patterns for natural language understanding
INTENT_PATTERNS = {
    "escort": [r"^escort", r"^guide", r"lead.*to", r"show.*way"],
    "deliver": [r"^deliver", r"^bring.*to", r"transport", r"send.*to", r"take this.*to"],
    "status": [r"(what is|what's|check).*status", r"how.*(are|is)", r"battery.*(level|status)", r"location", r"where are you"],
    "stop": [r"stop$|^stop", r"halt", r"emergency.*stop", r"freeze"],
    "follow": [r"^follow", r"^come.*with", r"accompany", r"^come.*here"],
    "patrol": [r"^patrol", r"^inspect", r"^check.*(area|perimeter|zone)", r"scan.*(room|area)", r"^monitor"],
    "charge": [r"^charge", r"go.*charge", r"return.*base", r"go.*dock", r"recharge"],
    "clean": [r"^clean", r"^sweep", r"^mop", r"^vacuum", r"sanitize"],
    "help": [r"^help", r"what can you", r"capabilities", r"^commands?$"],
}


class HumanRobotInteraction:
    """Human-Robot Interaction system for natural communication."""

    def __init__(self):
        self.command_history: list[VoiceCommand] = []
        self.gesture_history: list[Gesture] = []
        self._interaction_count = 0

    def process_voice_command(self, text: str) -> VoiceCommand:
        """Process a natural language voice command and extract intent."""
        text_lower = text.lower()

        # Extract intent
        intent = "unknown"
        confidence = 0.0
        entities = {}

        for intent_name, patterns in INTENT_PATTERNS.items():
            for pattern in patterns:
                match = re.search(pattern, text_lower)
                if match:
                    intent = intent_name
                    confidence = min(0.95, 0.5 + (len(match.group()) / len(text)))

                    # Extract entities (robot IDs, locations, etc.)
                    id_match = re.search(r"(assistant|delivery|cleaning|security)[-\s]?(\d+)", text_lower)
                    if id_match:
                        entities["robot_id"] = f"{id_match.group(1)}-{id_match.group(2).zfill(2)}"

                    location_match = re.search(r"(engineering|science|library|admin|cafeteria|sports|hostel|auditorium)", text_lower)
                    if location_match:
                        entities["location"] = location_match.group(1).capitalize() + (" Block" if location_match.group(1) in ["engineering", "science"] else "")

                    break
            if intent != "unknown":
                break

        command = VoiceCommand(
            text=text,
            intent=intent,
            confidence=confidence,
            entities=entities,
        )
        self.command_history.append(command)
        self._interaction_count += 1
        return command

    def process_gesture(self, gesture_type: str, hand: str = "right", confidence: float = 0.85) -> Gesture:
        """Process a detected gesture."""
        gesture = Gesture(
            gesture_type=gesture_type,
            confidence=confidence,
            hand=hand,
            position={"x": random.uniform(-1, 1), "y": random.uniform(-1, 1), "z": random.uniform(-1, 1)},
        )
        self.gesture_history.append(gesture)
        self._interaction_count += 1
        return gesture

    def get_response(self, command: VoiceCommand) -> str:
        """Generate a natural response to a voice command."""
        responses = {
            "escort": [
                f"Certainly! Please follow me to {command.entities.get('location', 'the destination')}.",
                "I'd be happy to guide you. Please follow me!",
                "Right this way, I'll show you to your destination.",
            ],
            "deliver": [
                f"I'll deliver the package to {command.entities.get('location', 'the destination')} right away.",
                "Delivery mission accepted. Estimated arrival in 5 minutes.",
                "Package secured and en route to destination.",
            ],
            "status": [
                f"My battery is at {random.randint(60, 100)}%. All systems operational.",
                "All systems nominal. Ready for my next mission!",
                "Status: ONLINE. Battery: good. Health: excellent. Ready to assist!",
            ],
            "stop": [
                "🛑 Emergency stop activated. Waiting for further instructions.",
                "Stopped. How can I assist?",
                "Halted. Standing by for next command.",
            ],
            "follow": [
                "Following you! I'll maintain a safe distance.",
                "Tracking your position. I'm right behind you.",
                "Acknowledged. Following mode activated.",
            ],
            "patrol": [
                f"Patrolling {command.entities.get('location', 'the area')} now. I'll report anything unusual.",
                "Initiating patrol route. Scanning for anomalies.",
                "Patrol mission started. I'll keep the campus safe.",
            ],
            "charge": [
                "Returning to charging station. My battery needs a quick boost.",
                "Heading to the charging dock. I'll be back online in 30 minutes.",
                "Charging mode activated. See you soon!",
            ],
            "clean": [
                "Starting cleaning operation. I'll make this space spotless!",
                "Cleaning mode activated. Vacuum system engaged.",
                "I'll clean this area thoroughly. Please give me some space to work.",
            ],
            "help": [
                "I can help with: guiding visitors 🧭, delivering items 📦, patrolling areas 🛡️, cleaning 🧹, and answering questions 💬. Just ask!",
                "My capabilities include escort, delivery, patrol, cleaning, and status reporting. What would you like me to do?",
                "I'm your campus assistant robot! Try saying: 'Escort me to the library', 'Deliver this package', or 'What's your status?'",
            ],
        }

        responses_list = responses.get(command.intent, ["I'm not sure how to handle that request. Can you try rephrasing it?"])
        return random.choice(responses_list)

    def handle_interaction(self, text_or_gesture: str, interaction_type: str = "voice") -> dict:
        """Handle a complete interaction: process command + generate response."""
        if interaction_type == "voice":
            command = self.process_voice_command(text_or_gesture)
            response = self.get_response(command)
            return {
                "type": "voice",
                "command": command.to_dict(),
                "response": response,
            }
        elif interaction_type == "gesture":
            gesture = self.process_gesture(text_or_gesture)
            return {
                "type": "gesture",
                "gesture": gesture.to_dict(),
                "response": f"Gesture '{text_or_gesture}' recognized from {gesture.hand} hand",
            }
        return {"type": "unknown", "response": "Interaction type not supported"}

    def get_interaction_history(self, limit: int = 20) -> list[dict]:
        history = []
        for c in self.command_history[-limit:]:
            history.append({"type": "voice", "data": c.to_dict()})
        for g in self.gesture_history[-limit:]:
            history.append({"type": "gesture", "data": g.to_dict()})
        return history[-limit:]

    def get_summary(self) -> dict:
        return {
            "total_interactions": self._interaction_count,
            "voice_commands": len(self.command_history),
            "gestures_detected": len(self.gesture_history),
            "supported_intents": list(INTENT_PATTERNS.keys()),
            "supported_gestures": ["wave", "point", "swipe_up", "swipe_down", "pinch", "grab"],
        }
