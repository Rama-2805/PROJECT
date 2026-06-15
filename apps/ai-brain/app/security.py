# ─── SmartCampus AI — Multi-Agent Security ──────────
# Part 14: Agent permissions, role-based data access,
# action approval workflows, and human oversight.

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Optional
from datetime import datetime
import enum


class ApprovalLevel(enum.Enum):
    AUTOMATIC = "automatic"
    LOW_RISK = "low_risk"
    MEDIUM_RISK = "medium_risk"
    HIGH_RISK = "high_risk"
    CRITICAL = "critical"  # Always requires human approval


@dataclass
class ActionRequest:
    id: str = ""
    agent_id: str = ""
    action: str = ""
    description: str = ""
    target_type: str = ""  # student, device, classroom, system
    target_id: str = ""
    impact: str = ""
    risk_level: ApprovalLevel = ApprovalLevel.LOW_RISK
    requires_approval: bool = False
    approved_by: Optional[str] = None
    status: str = "pending"  # pending, approved, rejected, executed
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    human_required: bool = False

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "agent_id": self.agent_id,
            "action": self.action,
            "description": self.description,
            "target_type": self.target_type,
            "target_id": self.target_id,
            "impact": self.impact,
            "risk_level": self.risk_level.value,
            "requires_approval": self.requires_approval,
            "approved_by": self.approved_by,
            "status": self.status,
            "timestamp": self.timestamp,
            "human_required": self.human_required,
        }


# ── Agent Permissions ──────────────────────────────

AGENT_PERMISSIONS = {
    "agent-student": {
        "actions": ["read_attendance", "read_schedule", "read_engagement", "read_courses"],
        "max_risk": ApprovalLevel.AUTOMATIC,
        "restricted_actions": [],
    },
    "agent-teacher": {
        "actions": [
            "read_attendance", "read_engagement", "read_alerts", "read_students",
            "read_reports", "override_attendance",
        ],
        "max_risk": ApprovalLevel.LOW_RISK,
        "restricted_actions": ["override_attendance"],
    },
    "agent-admin": {
        "actions": [
            "read_all", "manage_resources", "view_reports",
            "schedule_maintenance", "manage_schedule",
        ],
        "max_risk": ApprovalLevel.MEDIUM_RISK,
        "restricted_actions": ["manage_finances", "modify_records"],
    },
    "agent-device": {
        "actions": [
            "read_devices", "manage_devices", "schedule_maintenance",
            "update_firmware", "restart_device",
        ],
        "max_risk": ApprovalLevel.LOW_RISK,
        "restricted_actions": ["update_firmware", "restart_device"],
    },
}

# Actions that always require human approval
HUMAN_APPROVAL_ACTIONS = {
    "punish_student": ApprovalLevel.CRITICAL,
    "expel_student": ApprovalLevel.CRITICAL,
    "modify_grades": ApprovalLevel.CRITICAL,
    "delete_records": ApprovalLevel.CRITICAL,
    "disconnect_critical_systems": ApprovalLevel.CRITICAL,
    "mass_device_update": ApprovalLevel.HIGH_RISK,
    "schedule_change_affecting_100+": ApprovalLevel.HIGH_RISK,
}


class AgentSecurity:
    """Security control for multi-agent actions."""

    def __init__(self):
        self.action_requests: list[ActionRequest] = []
        self._request_counter = 0

    def check_permission(self, agent_id: str, action: str) -> bool:
        """Check if an agent has permission to perform an action."""
        perms = AGENT_PERMISSIONS.get(agent_id)
        if not perms:
            return False
        return action in perms["actions"]

    def assess_risk(self, agent_id: str, action: str, target_type: str = "") -> ApprovalLevel:
        """Assess the risk level of an action."""
        # Check if action requires human approval
        if action in HUMAN_APPROVAL_ACTIONS:
            return HUMAN_APPROVAL_ACTIONS[action]

        # Check agent's max allowed risk
        perms = AGENT_PERMISSIONS.get(agent_id)
        if not perms:
            return ApprovalLevel.CRITICAL

        # Risk assessment based on target type
        risk_map = {
            "student": ApprovalLevel.MEDIUM_RISK,
            "device": ApprovalLevel.LOW_RISK,
            "classroom": ApprovalLevel.LOW_RISK,
            "system": ApprovalLevel.HIGH_RISK,
            "record": ApprovalLevel.HIGH_RISK,
        }
        base_risk = risk_map.get(target_type, ApprovalLevel.LOW_RISK)

        # Check if action is restricted for this agent
        if action in perms.get("restricted_actions", []):
            risk_levels = list(ApprovalLevel)
            current_idx = risk_levels.index(base_risk)
            next_idx = min(current_idx + 1, len(risk_levels) - 1)
            return risk_levels[next_idx]

        return base_risk

    def request_action(
        self,
        agent_id: str,
        action: str,
        description: str,
        target_type: str = "",
        target_id: str = "",
    ) -> ActionRequest:
        """Create an action request with risk assessment."""
        self._request_counter += 1
        risk_level = self.assess_risk(agent_id, action, target_type)

        requires_approval = risk_level.value >= ApprovalLevel.MEDIUM_RISK.value
        human_required = risk_level == ApprovalLevel.CRITICAL

        request = ActionRequest(
            id=f"req-{self._request_counter:04d}",
            agent_id=agent_id,
            action=action,
            description=description,
            target_type=target_type,
            target_id=target_id,
            risk_level=risk_level,
            requires_approval=requires_approval or human_required,
            human_required=human_required,
            status="pending",
        )

        self.action_requests.append(request)

        # Auto-approve low-risk actions
        if risk_level == ApprovalLevel.AUTOMATIC:
            request.status = "approved"
            request.approved_by = "system"

        return request

    def approve_request(self, request_id: str, approver: str = "admin") -> bool:
        """Approve a pending action request."""
        for req in self.action_requests:
            if req.id == request_id and req.status == "pending":
                req.status = "approved"
                req.approved_by = approver
                return True
        return False

    def reject_request(self, request_id: str, reason: str = "") -> bool:
        """Reject a pending action request."""
        for req in self.action_requests:
            if req.id == request_id and req.status == "pending":
                req.status = "rejected"
                return True
        return False

    def get_pending_approvals(self) -> list[ActionRequest]:
        """Get all actions waiting for approval."""
        return [r for r in self.action_requests if r.status == "pending"]

    def get_critical_actions(self) -> list[ActionRequest]:
        """Get all actions requiring human approval."""
        return [r for r in self.action_requests if r.human_required and r.status == "pending"]

    def get_agent_action_history(self, agent_id: str) -> list[ActionRequest]:
        """Get action history for a specific agent."""
        return [r for r in self.action_requests if r.agent_id == agent_id]

    def can_agent_perform(self, agent_id: str, action: str) -> dict:
        """Complete check: permission + risk assessment."""
        has_permission = self.check_permission(agent_id, action)
        risk = self.assess_risk(agent_id, action)
        needs_approval = risk.value >= ApprovalLevel.MEDIUM_RISK.value

        return {
            "allowed": has_permission and not needs_approval,
            "has_permission": has_permission,
            "risk_level": risk.value,
            "needs_approval": needs_approval,
            "human_required": risk == ApprovalLevel.CRITICAL,
        }

    # ── Safety Rules ─────────────────────────────

    SAFETY_RULES = [
        "AI can recommend: 'Student needs support.'",
        "AI cannot automatically: 'Punish a student.'",
        "AI can recommend: 'Schedule maintenance.'",
        "AI cannot automatically: 'Modify academic records.'",
        "AI can suggest: 'Classroom reallocation.'",
        "AI cannot execute: 'Mass schedule changes without review.'",
        "AI can alert: 'Device failure risk detected.'",
        "AI cannot: 'Disconnect critical infrastructure without approval.'",
    ]
