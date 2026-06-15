# ─── SmartCampus AI — AI Brain API Server ───────────
# FastAPI server that exposes all AI agents, decision engine,
# report generator, and evaluation system via REST endpoints.

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .agent_core import AgentRegistry, MemorySystem, CommunicationProtocol
from .agents.student_agent import StudentAgent
from .agents.teacher_agent import TeacherAgent
from .agents.admin_agent import AdminGovernorAgent
from .agents.device_agent import DeviceEngineerAgent
from .agents.llm_interface import LLMInterface, create_llm_interface
from .memory.rag_engine import RAGEngine
from .decision_engine import DecisionEngine
from .report_generator import ReportGenerator
from .security import AgentSecurity
from .evaluation.evaluator import AgentEvaluator
from .workflows.autonomous_workflows import WorkflowEngine, WorkflowTask


# ── Global State ───────────────────────────────────
registry = AgentRegistry()
memory = MemorySystem()
comms = CommunicationProtocol()
rag_engine = RAGEngine(memory)
llm = create_llm_interface("mock")
decision_engine = DecisionEngine()
report_generator = ReportGenerator()
security = AgentSecurity()
evaluator = AgentEvaluator()

# Initialize agents
student_agent = StudentAgent(registry, memory, comms)
teacher_agent = TeacherAgent(registry, memory, comms)
admin_agent = AdminGovernorAgent(registry, memory, comms)
device_agent = DeviceEngineerAgent(registry, memory, comms)

# Initialize workflow engine
workflow_engine = WorkflowEngine(registry, memory, comms)

AGENTS = {
    "agent-student": student_agent,
    "agent-teacher": teacher_agent,
    "agent-admin": admin_agent,
    "agent-device": device_agent,
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[AI Brain] Starting SmartCampus AI Brain server...")
    print(f"[AI Brain] Registered agents: {len(registry.list_all())}")
    print(f"[AI Brain] Knowledge articles: {len(rag_engine._knowledge_base)}")
    print(f"[AI Brain] Workflow tasks: {len(workflow_engine.tasks)}")
    yield
    print("[AI Brain] Shutting down...")


app = FastAPI(
    title="SmartCampus AI Brain",
    description="Autonomous AI Agent ecosystem for university operations",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request Models ─────────────────────────────────

class ChatRequest(BaseModel):
    query: str
    agent_id: str = "agent-student"
    user_id: str = "anonymous"
    context: dict = {}
    use_rag: bool = True


class ReportRequest(BaseModel):
    report_type: str = "daily"  # daily, weekly, monthly


class SecurityActionRequest(BaseModel):
    agent_id: str
    action: str
    description: str
    target_type: str = ""
    target_id: str = ""


class SecurityApprovalRequest(BaseModel):
    request_id: str
    approve: bool = True
    approver: str = "admin"


class FeedbackRequest(BaseModel):
    agent_id: str
    user_id: str
    rating: float
    comment: str = ""


class WorkflowRequest(BaseModel):
    schedule: str = "daily"  # daily, weekly, monthly, all


class AgentQueryRequest(BaseModel):
    query: str
    student_id: str = "STU001"
    teacher_name: str = "Dr. Sharma"


# ── Health ─────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "SmartCampus AI Brain",
        "version": "3.0.0",
        "agents_online": len(registry.list_all()),
        "timestamp": datetime.now().isoformat(),
    }


# ── Agent Registry ─────────────────────────────────

@app.get("/agents")
async def list_agents():
    """List all registered AI agents."""
    return {"agents": [a.__dict__ for a in registry.list_all()]}


@app.get("/agents/{agent_id}")
async def get_agent(agent_id: str):
    """Get details for a specific agent."""
    agent = registry.get(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"agent": agent.__dict__}


# ── Chat / Query ──────────────────────────────────

@app.post("/chat")
async def chat_with_agent(req: ChatRequest):
    """Send a query to an AI agent."""
    agent = AGENTS.get(req.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Optionally enhance with RAG
    context = req.context or {}
    if req.use_rag:
        if req.user_id != "anonymous":
            docs = rag_engine.retrieve_for_student(req.query, req.user_id, top_k=3)
        else:
            docs = rag_engine.retrieve(req.query, top_k=3)
        context["rag_context"] = [d.__dict__ for d in docs]

    response = agent.process(req.query, context)
    return response


# ── RAG / Knowledge ───────────────────────────────

@app.get("/knowledge/search")
async def search_knowledge(q: str = Query(..., description="Search query"), top_k: int = 5):
    """Search the campus knowledge base."""
    docs = rag_engine.retrieve(q, top_k=top_k)
    return {"results": [d.__dict__ for d in docs]}


@app.get("/knowledge/category/{category}")
async def knowledge_by_category(category: str):
    """Get all knowledge articles in a category."""
    docs = rag_engine.retrieve_by_category(category)
    return {"category": category, "results": [d.__dict__ for d in docs]}


# ── Decision Engine ───────────────────────────────

@app.get("/decisions/student/{student_id}")
async def assess_student(student_id: str):
    """Assess risk for a specific student."""
    return decision_engine.assess_student_risk(student_id).to_dict()


@app.get("/decisions/device/{device_id}")
async def assess_device(device_id: str):
    """Assess risk for a specific device."""
    return decision_engine.assess_device_risk(device_id).to_dict()


@app.get("/decisions/classroom/{building_name}")
async def assess_classroom(building_name: str):
    """Assess risk for a classroom/building."""
    return decision_engine.assess_classroom_risk(building_name).to_dict()


@app.get("/decisions/high-risk")
async def get_high_risk(threshold: float = 70.0):
    """Get all high-risk entities."""
    return decision_engine.get_high_risk_entities(threshold)


@app.get("/decisions/students")
async def assess_all_students():
    """Assess risk for all students."""
    results = decision_engine.assess_all_students()
    return {"students": [r.to_dict() for r in results]}


# ── Reports ───────────────────────────────────────

@app.post("/reports/generate")
async def generate_report(req: ReportRequest):
    """Generate a report."""
    if req.report_type == "daily":
        report = report_generator.generate_daily_report()
    elif req.report_type == "weekly":
        report = report_generator.generate_weekly_report()
    elif req.report_type == "monthly":
        report = report_generator.generate_monthly_report()
    else:
        raise HTTPException(status_code=400, detail="Invalid report type. Use: daily, weekly, monthly")

    return {
        "title": report.title,
        "type": report.report_type,
        "summary": report.summary,
        "insights": report.executive_insights,
        "sections": report.sections,
        "cards": report.to_dashboard_cards(),
    }


@app.get("/reports/text")
async def get_report_text(report_type: str = "daily"):
    """Get a report in plain text format."""
    if report_type == "daily":
        report = report_generator.generate_daily_report()
    elif report_type == "weekly":
        report = report_generator.generate_weekly_report()
    elif report_type == "monthly":
        report = report_generator.generate_monthly_report()
    else:
        raise HTTPException(status_code=400, detail="Invalid report type")

    return {"text": report.to_text()}


# ── Workflows ─────────────────────────────────────

@app.get("/workflows")
async def list_workflows():
    """List all workflow tasks."""
    return {"tasks": [t.to_dict() for t in workflow_engine.tasks]}


@app.post("/workflows/execute")
async def execute_workflows(req: WorkflowRequest):
    """Execute workflow tasks by schedule type."""
    import asyncio
    if req.schedule == "all":
        results = await workflow_engine.execute_all_tasks()
    else:
        results = await workflow_engine.execute_scheduled_tasks(req.schedule)
    return {"results": results}


@app.post("/workflows/{task_id}/toggle")
async def toggle_workflow(task_id: str):
    """Enable or disable a workflow task."""
    for task in workflow_engine.tasks:
        if task.id == task_id:
            task.enabled = not task.enabled
            return {"task_id": task_id, "enabled": task.enabled}
    raise HTTPException(status_code=404, detail="Task not found")


# ── Agent Queries (specific) ──────────────────────

@app.post("/query/student")
async def query_student_agent(req: AgentQueryRequest):
    """Query the Student AI Assistant."""
    return student_agent.process(req.query, {"student_id": req.student_id})


@app.post("/query/teacher")
async def query_teacher_agent(req: AgentQueryRequest):
    """Query the Teacher AI Assistant."""
    return teacher_agent.process(req.query, {"teacher_name": req.teacher_name})


@app.post("/query/admin")
async def query_admin_agent(req: AgentQueryRequest):
    """Query the Admin AI Governor."""
    return admin_agent.process(req.query)


@app.post("/query/device")
async def query_device_agent(req: AgentQueryRequest):
    """Query the Device AI Engineer."""
    return device_agent.process(req.query)


# ── Security ──────────────────────────────────────

@app.post("/security/request")
async def request_action(req: SecurityActionRequest):
    """Request an action through the security system."""
    result = security.request_action(
        agent_id=req.agent_id,
        action=req.action,
        description=req.description,
        target_type=req.target_type,
        target_id=req.target_id,
    )
    check = security.can_agent_perform(req.agent_id, req.action)
    return {
        "request": result.to_dict(),
        "permission_check": check,
    }


@app.post("/security/approve")
async def approve_action(req: SecurityApprovalRequest):
    """Approve or reject an action request."""
    if req.approve:
        success = security.approve_request(req.request_id, req.approver)
    else:
        success = security.reject_request(req.request_id)

    if not success:
        raise HTTPException(status_code=404, detail="Request not found or already processed")

    return {"request_id": req.request_id, "status": "approved" if req.approve else "rejected"}


@app.get("/security/pending")
async def get_pending_approvals():
    """Get all pending action approvals."""
    return {
        "pending": [r.to_dict() for r in security.get_pending_approvals()],
        "critical": [r.to_dict() for r in security.get_critical_actions()],
    }


@app.get("/security/rules")
async def get_safety_rules():
    """Get AI safety rules."""
    return {"rules": security.SAFETY_RULES}


# ── Evaluation ────────────────────────────────────

@app.get("/evaluation/agents")
async def evaluate_all_agents():
    """Evaluate all AI agents."""
    agent_ids = ["agent-student", "agent-teacher", "agent-admin", "agent-device"]
    names = {
        "agent-student": "Student AI Copilot",
        "agent-teacher": "Teacher AI Copilot",
        "agent-admin": "Admin AI Governor",
        "agent-device": "Device AI Engineer",
    }
    results = {}
    for aid in agent_ids:
        results[aid] = evaluator.evaluate_agent(aid, names.get(aid, aid)).to_dict()
    return {"evaluations": results}


@app.get("/evaluation/{agent_id}")
async def evaluate_agent(agent_id: str):
    """Evaluate a specific AI agent."""
    names = {
        "agent-student": "Student AI Copilot",
        "agent-teacher": "Teacher AI Copilot",
        "agent-admin": "Admin AI Governor",
        "agent-device": "Device AI Engineer",
    }
    if agent_id not in names:
        raise HTTPException(status_code=404, detail="Agent not found")
    return evaluator.evaluate_agent(agent_id, names[agent_id]).to_dict()


@app.get("/evaluation/health")
async def get_system_health():
    """Get system-wide agent health."""
    return {"health": evaluator.get_system_health()}


@app.post("/feedback")
async def submit_feedback(req: FeedbackRequest):
    """Submit user feedback for an agent."""
    return evaluator.submit_feedback(req.agent_id, req.user_id, req.rating, req.comment)


# ── LLM ────────────────────────────────────────────

@app.post("/llm/chat")
async def llm_chat(prompt: str, system_prompt: str = ""):
    """Send a prompt to the LLM."""
    response = llm.chat(prompt, system_prompt)
    return {
        "response": response.text,
        "model": response.model,
        "latency_ms": response.latency_ms,
        "tokens": response.tokens_used,
    }


# ── Memory ─────────────────────────────────────────

@app.get("/memory/{agent_id}")
async def get_agent_memory(agent_id: str, limit: int = 10):
    """Get memory for a specific agent."""
    entries = memory.get_agent_memory(agent_id, limit)
    return {"agent_id": agent_id, "entries": [e.to_dict() for e in entries]}


@app.get("/memory/institutional")
async def get_institutional_memory(limit: int = 20):
    """Get institutional memory."""
    entries = memory.get_institutional(limit)
    return {"entries": [e.to_dict() for e in entries]}


# ── Mock Data Access ──────────────────────────────

@app.get("/data/students")
async def get_students():
    """Get all student data."""
    from .mock_data import STUDENTS
    return {"students": STUDENTS}


@app.get("/data/devices")
async def get_devices():
    """Get all device data."""
    from .mock_data import DEVICES
    return {"devices": DEVICES}


@app.get("/data/buildings")
async def get_buildings():
    """Get all building data."""
    from .mock_data import BUILDINGS
    return {"buildings": BUILDINGS}


@app.get("/data/courses")
async def get_courses():
    """Get all course data."""
    from .mock_data import COURSES
    return {"courses": COURSES}
