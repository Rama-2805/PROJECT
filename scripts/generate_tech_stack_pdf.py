#!/usr/bin/env python3
"""
SmartCampus AI — Complete Tech Stack PDF Generator
Generates an executive, beautifully formatted technical architecture PDF.
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 755, "SmartCampus AI — Complete System Tech Stack & Architecture")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.75)
            self.line(54, 747, 558, 747)

        # Footer (all pages)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.75)
        self.line(54, 45, 558, 45)
        self.drawString(54, 32, "CONFIDENTIAL & PROPRIETARY — SMARTCAMPUS AI ENTERPRISE SPECIFICATION")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 32, page_str)
        self.restoreState()


def create_tech_stack_pdf(output_path: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=6,
    )

    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#475569"),
        spaceAfter=15,
    )

    h1_style = ParagraphStyle(
        "Heading1_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#1E3A8A"),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        "Heading2_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "Body_Custom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6,
    )

    callout_style = ParagraphStyle(
        "Callout_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1E40AF"),
    )

    th_style = ParagraphStyle(
        "TH_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
    )

    td_tech_style = ParagraphStyle(
        "TD_Tech",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0F172A"),
    )

    td_ver_style = ParagraphStyle(
        "TD_Ver",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#2563EB"),
    )

    td_desc_style = ParagraphStyle(
        "TD_Desc",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#334155"),
    )

    story = []

    # Title Banner
    story.append(Spacer(1, 10))
    story.append(Paragraph("SmartCampus AI", title_style))
    story.append(Paragraph("Comprehensive System Tech Stack, Architecture & Dependency Inventory", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#2563EB"), spaceAfter=14))

    # Executive Overview Block
    overview_text = (
        "<b>Executive Overview:</b> SmartCampus AI is an enterprise-grade autonomous educational intelligence "
        "platform. The architecture combines a <b>Next.js 16 (React 19)</b> modern web dashboard, a <b>NestJS 11 (Node.js)</b> "
        "high-throughput API gateway, and an asynchronous <b>FastAPI / PyTorch</b> computer vision engine. The platform is powered by "
        "state-of-the-art vision models (SCRFD 10G, YOLO26-Face, ArcFace 512D, MediaPipe), an in-memory & persisted "
        "<b>FAISS vector database</b>, multi-camera spatial trackers, and an automated incremental face enrollment pipeline."
    )
    story.append(Paragraph(overview_text, body_style))
    story.append(Spacer(1, 8))

    # Tier 1: Frontend Web Application
    story.append(Paragraph("1. Frontend Web & Visualization Tier (apps/web)", h1_style))
    story.append(Paragraph("Built on modern React 19 and Next.js 16 with a high-performance Glassmorphism design system.", body_style))

    frontend_data = [
        [Paragraph("Category / Technology", th_style), Paragraph("Version", th_style), Paragraph("Architectural Purpose & Implementation", th_style)],
        [
            Paragraph("Next.js App Router", td_tech_style),
            Paragraph("v16.2.9", td_ver_style),
            Paragraph("Core frontend framework. Server-Side Rendering (SSR), API rewrites, middleware proxying, and Turbopack bundler.", td_desc_style)
        ],
        [
            Paragraph("React & React DOM", td_tech_style),
            Paragraph("v19.2.4", td_ver_style),
            Paragraph("Modern concurrent React engine with Server Components, Actions, and optimized state reconciliation.", td_desc_style)
        ],
        [
            Paragraph("TypeScript", td_tech_style),
            Paragraph("v5.x", td_ver_style),
            Paragraph("Strict type system guaranteeing end-to-end type safety across dashboard pages, hooks, and API contracts.", td_desc_style)
        ],
        [
            Paragraph("Tailwind CSS", td_tech_style),
            Paragraph("v4.0", td_ver_style),
            Paragraph("Utility-first styling with custom CSS design tokens, responsive breakpoints, and modern dark-mode palettes.", td_desc_style)
        ],
        [
            Paragraph("Framer Motion", td_tech_style),
            Paragraph("v12.40.0", td_ver_style),
            Paragraph("Hardware-accelerated fluid micro-animations, modal transitions, and dynamic real-time progress indicators.", td_desc_style)
        ],
        [
            Paragraph("Three.js & @react-three/fiber", td_tech_style),
            Paragraph("v0.170 / v9.6", td_ver_style),
            Paragraph("WebGL 3D graphics rendering for the interactive 3D Campus Digital Twin and spatial facility monitoring.", td_desc_style)
        ],
        [
            Paragraph("@react-three/drei & postproc", td_tech_style),
            Paragraph("v10.7 / v2.19", td_ver_style),
            Paragraph("Helpers, orbit controls, camera rigging, bloom, and depth-of-field shaders for the campus 3D model.", td_desc_style)
        ],
        [
            Paragraph("Lucide React", td_tech_style),
            Paragraph("v1.18.0", td_ver_style),
            Paragraph("Modern clean SVG iconography for biometric dashboards, session states, and navigation modules.", td_desc_style)
        ],
        [
            Paragraph("Recharts", td_tech_style),
            Paragraph("v3.8.1", td_ver_style),
            Paragraph("Interactive attendance trends, quality distributions, student risk scoring, and behavior analytics charts.", td_desc_style)
        ],
        [
            Paragraph("Zustand & TanStack Virtual", td_tech_style),
            Paragraph("v5.0 / v3.14", td_ver_style),
            Paragraph("Lightweight global state management and high-performance virtualized scrolling for thousands of face crops.", td_desc_style)
        ],
        [
            Paragraph("@dnd-kit (Core & Sortable)", td_tech_style),
            Paragraph("v6.3 / v10.0", td_ver_style),
            Paragraph("Drag-and-drop student cluster assignment, manual identity merge, and verification queues.", td_desc_style)
        ],
        [
            Paragraph("Socket.io Client", td_tech_style),
            Paragraph("v4.8.3", td_ver_style),
            Paragraph("Real-time dual-way telemetry: live video frames, segment telemetry, and candidate detection alerts.", td_desc_style)
        ],
        [
            Paragraph("NextAuth.js & Zod", td_tech_style),
            Paragraph("v4.24 / v4.4", td_ver_style),
            Paragraph("Role-based session management, JWT token handling, and runtime schema validation.", td_desc_style)
        ],
    ]

    t_front = Table(frontend_data, colWidths=[130, 60, 314])
    t_front.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_front)

    story.append(PageBreak())

    # Tier 2: Backend API Gateway
    story.append(Paragraph("2. Backend API Gateway & Business Logic Tier (apps/api)", h1_style))
    story.append(Paragraph("Enterprise microservices architecture handling persistence, RBAC security, and device orchestration.", body_style))

    backend_data = [
        [Paragraph("Category / Technology", th_style), Paragraph("Version", th_style), Paragraph("Architectural Purpose & Implementation", th_style)],
        [
            Paragraph("NestJS Core & Common", td_tech_style),
            Paragraph("v11.0.1", td_ver_style),
            Paragraph("Modular Node.js enterprise framework utilizing Dependency Injection, Controllers, Services, and Guards.", td_desc_style)
        ],
        [
            Paragraph("Prisma ORM & pg-adapter", td_tech_style),
            Paragraph("v7.8.0", td_ver_style),
            Paragraph("Next-gen type-safe ORM connecting to PostgreSQL 16. Manages migrations, relation mappings, and transactions.", td_desc_style)
        ],
        [
            Paragraph("PostgreSQL", td_tech_style),
            Paragraph("v16 Alpine", td_ver_style),
            Paragraph("Primary relational database storing Students, Sessions, Attendance, FaceEmbeddings, Clusters, and Audit Logs.", td_desc_style)
        ],
        [
            Paragraph("Passport & JWT (@nestjs/jwt)", td_tech_style),
            Paragraph("v11.0.2", td_ver_style),
            Paragraph("Stateless JSON Web Token authentication with refresh rotation, multi-role RBAC, and secure cookie parsing.", td_desc_style)
        ],
        [
            Paragraph("Argon2", td_tech_style),
            Paragraph("v0.44.0", td_ver_style),
            Paragraph("Winner of Password Hashing Competition (PHC); cryptographic hashing for all credentials.", td_desc_style)
        ],
        [
            Paragraph("Socket.IO & WebSockets", td_tech_style),
            Paragraph("v4.8.3 / v11.1", td_ver_style),
            Paragraph("Bi-directional real-time communication broadcasting session progress, cluster events, and live alerts.", td_desc_style)
        ],
        [
            Paragraph("@nestjs/throttler", td_tech_style),
            Paragraph("v6.5.0", td_ver_style),
            Paragraph("Rate limiting and DDoS mitigation against brute-force attacks on enrollment and attendance endpoints.", td_desc_style)
        ],
        [
            Paragraph("Class-Validator & Zod", td_tech_style),
            Paragraph("v0.15 / v4.4", td_ver_style),
            Paragraph("Strict declarative input validation and transformation pipes on all DTO payloads.", td_desc_style)
        ],
        [
            Paragraph("RxJS", td_tech_style),
            Paragraph("v7.8.1", td_ver_style),
            Paragraph("Reactive stream composition, event mapping, and asynchronous task management.", td_desc_style)
        ],
    ]

    t_back = Table(backend_data, colWidths=[130, 60, 314])
    t_back.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F766E")),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_back)
    story.append(Spacer(1, 12))

    # Tier 3: Computer Vision & AI Inference Engine
    story.append(Paragraph("3. Computer Vision, Deep Learning & Vector Search Tier (apps/ai-service)", h1_style))
    story.append(Paragraph("State-of-the-art vision models, biometrics, tracking, and vector indexing running in Python.", body_style))

    ai_data = [
        [Paragraph("Category / Technology", th_style), Paragraph("Version", th_style), Paragraph("Architectural Purpose & Implementation", th_style)],
        [
            Paragraph("FastAPI & Uvicorn", td_tech_style),
            Paragraph("v0.115 / v0.30", td_ver_style),
            Paragraph("High-performance asynchronous Python web server serving REST, live frames, video pipeline, and WebSockets.", td_desc_style)
        ],
        [
            Paragraph("YOLO26-Face / Ultralytics", td_tech_style),
            Paragraph("v8.4.116", td_ver_style),
            Paragraph("PyTorch-based ultra-fast face detection model (`yolo26s-face.pt`). Optimized for dense classroom crowds.", td_desc_style)
        ],
        [
            Paragraph("SCRFD 10G (InsightFace)", td_tech_style),
            Paragraph("v0.7.3", td_ver_style),
            Paragraph("Sample and Computation Redistribution Face Detector (`det_10g.onnx`). High-recall wide-angle detector.", td_desc_style)
        ],
        [
            Paragraph("Combined Dual-Detector", td_tech_style),
            Paragraph("Custom Hybrid", td_ver_style),
            Paragraph("IoU / NMS fusion layer combining SCRFD (high recall) and YOLO26 (dense crowds) into a unified detector.", td_desc_style)
        ],
        [
            Paragraph("ArcFace (ResNet-50)", td_tech_style),
            Paragraph("w600k_r50", td_ver_style),
            Paragraph("Additive Angular Margin Loss deep neural network generating 512-dimensional L2-normalized face embeddings.", td_desc_style)
        ],
        [
            Paragraph("MediaPipe Landmarker", td_tech_style),
            Paragraph("v0.10.14", td_ver_style),
            Paragraph("468-point 3D facial mesh assessing pitch/yaw/roll head pose, facial symmetry, blur, and lighting quality.", td_desc_style)
        ],
        [
            Paragraph("FAISS (Facebook AI Search)", td_tech_style),
            Paragraph("faiss-cpu 1.7", td_ver_style),
            Paragraph("Billion-scale similarity search with IndexFlatIP (inner product / cosine distance). Thread-safe with section isolation.", td_desc_style)
        ],
        [
            Paragraph("FaceTracker Engine", td_tech_style),
            Paragraph("Locked Kalman", td_ver_style),
            Paragraph("Multi-object tracker with ByteTrack matching, Kalman filtering, seat anchor stabilization, and feature memory.", td_desc_style)
        ],
        [
            Paragraph("HDBSCAN & Agglomerative", td_tech_style),
            Paragraph("v0.8.39 / v1.5", td_ver_style),
            Paragraph("Hierarchical density-based and agglomerative clustering for grouping face tracks into student identities.", td_desc_style)
        ],
        [
            Paragraph("Identity Consolidator", td_tech_style),
            Paragraph("Two-Stage Merge", td_ver_style),
            Paragraph("Centroid cosine similarity gating (0.75+), top-k pairwise cross-check, and purity gating preventing false merges.", td_desc_style)
        ],
        [
            Paragraph("PyTorch & Torchvision", td_tech_style),
            Paragraph("v2.8.0 / v0.23", td_ver_style),
            Paragraph("Deep learning execution runtime supporting CPU and Apple Silicon Metal acceleration.", td_desc_style)
        ],
        [
            Paragraph("ONNX Runtime", td_tech_style),
            Paragraph("v1.19.2", td_ver_style),
            Paragraph("Cross-platform inference accelerator executing SCRFD and ArcFace ONNX models at maximum throughput.", td_desc_style)
        ],
        [
            Paragraph("OpenCV & NumPy & SciPy", td_tech_style),
            Paragraph("v4.10 / v1.26", td_ver_style),
            Paragraph("Image transformations, face crop alignment, warp-affine matrix calculation, and Laplacian variance blur scoring.", td_desc_style)
        ],
    ]

    t_ai = Table(ai_data, colWidths=[130, 60, 314])
    t_ai.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#7C3AED")),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_ai)

    story.append(PageBreak())

    # Tier 4: Storage, Messaging & DevOps Infrastructure
    story.append(Paragraph("4. Storage, Infrastructure & Messaging Tier", h1_style))
    story.append(Paragraph("Distributed containerized services, messaging queues, and object storage backing the platform.", body_style))

    infra_data = [
        [Paragraph("Category / Technology", th_style), Paragraph("Version / Port", th_style), Paragraph("Architectural Purpose & Implementation", th_style)],
        [
            Paragraph("Docker & Docker Compose", td_tech_style),
            Paragraph("v2.x / Multi-Container", td_ver_style),
            Paragraph("Containerized infrastructure with dev/prod profiles managing database, cache, storage, and broker services.", td_desc_style)
        ],
        [
            Paragraph("Redis Cache & Pub/Sub", td_tech_style),
            Paragraph("v7.0 Alpine (6379)", td_ver_style),
            Paragraph("In-memory cache for live camera sessions, active track states, rate limiting, and pub/sub message brokering.", td_desc_style)
        ],
        [
            Paragraph("MinIO Object Storage", td_tech_style),
            Paragraph("RELEASE (9000/9002)", td_ver_style),
            Paragraph("High-performance S3-compatible cloud object storage for raw classroom footage, face crops, and student avatars.", td_desc_style)
        ],
        [
            Paragraph("Eclipse Mosquitto (MQTT)", td_tech_style),
            Paragraph("v2.0 (1883/9001)", td_ver_style),
            Paragraph("Lightweight MQTT publish/subscribe messaging broker for classroom IoT edge camera nodes and status telemetry.", td_desc_style)
        ],
        [
            Paragraph("ReportLab PDF Engine", td_tech_style),
            Paragraph("v5.0.0", td_ver_style),
            Paragraph("Enterprise PDF document compilation engine generating programmatic reports, tech stacks, and audit sheets.", td_desc_style)
        ],
        [
            Paragraph("GitHub MCP Server", td_tech_style),
            Paragraph("v0.6.2", td_ver_style),
            Paragraph("Model Context Protocol integration for automated version control, issue tracking, and repository monitoring.", td_desc_style)
        ],
    ]

    t_infra = Table(infra_data, colWidths=[130, 75, 299])
    t_infra.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_infra)
    story.append(Spacer(1, 14))

    # Architecture Pipeline Summary
    story.append(Paragraph("5. End-to-End Data Flow & Automated Recognition Pipeline", h1_style))

    pipeline_steps = [
        [Paragraph("Stage", th_style), Paragraph("Component", th_style), Paragraph("Processing Action", th_style)],
        [
            Paragraph("1. Video Ingestion", td_tech_style),
            Paragraph("ClassroomPipeline (OpenCV)", td_ver_style),
            Paragraph("Sequential 150s interval segmentation of 1080p footage at dynamic sample FPS (1.5-2.0 FPS).", td_desc_style)
        ],
        [
            Paragraph("2. Dual Face Detect", td_tech_style),
            Paragraph("Combined Detector", td_ver_style),
            Paragraph("SCRFD 10G + YOLO26-Face with IoU NMS merging bounding boxes down to ~47 faces/frame.", td_desc_style)
        ],
        [
            Paragraph("3. Spatial Tracking", td_tech_style),
            Paragraph("FaceTracker (Kalman)", td_ver_style),
            Paragraph("Continuously associates detections into spatio-temporal tracks with seat-anchor stabilization.", td_desc_style)
        ],
        [
            Paragraph("4. Quality & Landmarks", td_tech_style),
            Paragraph("MediaPipe & Laplacian", td_ver_style),
            Paragraph("Filters crops below quality score (<45), estimates pose yaw/pitch/roll, and selects top-quality samples.", td_desc_style)
        ],
        [
            Paragraph("5. Embedding Extraction", td_tech_style),
            Paragraph("ArcFace (w600k_r50)", td_ver_style),
            Paragraph("Extracts 512-dimensional L2-normalized facial biometric vectors via ONNX Runtime.", td_desc_style)
        ],
        [
            Paragraph("6. Vector Matching", td_tech_style),
            Paragraph("FAISS IndexFlatIP", td_ver_style),
            Paragraph("Cosine search against registered students with strict section whitelist isolation (sim >= 0.75).", td_desc_style)
        ],
        [
            Paragraph("7. Profile Adaptation", td_tech_style),
            Paragraph("Continuous Learning", td_ver_style),
            Paragraph("Diversity gating (0.70 <= sim <= 0.95), deduplication, max 12 samples, and PostgreSQL sync.", td_desc_style)
        ],
        [
            Paragraph("8. Identity Consolidation", td_tech_style),
            Paragraph("HDBSCAN & Consolidator", td_ver_style),
            Paragraph("Clusters unknown tracks into novel student identities, merges split clusters, and warns on multi-ID.", td_desc_style)
        ],
        [
            Paragraph("9. Roll Call & Audit", td_tech_style),
            Paragraph("Prisma & PostgreSQL", td_ver_style),
            Paragraph("Persists attendance records, session cluster status, and audit history; broadcasts live HUD via WS.", td_desc_style)
        ],
    ]

    t_pipe = Table(pipeline_steps, colWidths=[100, 110, 294])
    t_pipe.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_pipe)
    story.append(Spacer(1, 14))

    # Verification Sign-off Box
    signoff_data = [
        [
            Paragraph(
                "<b>Deployment Verification:</b> All listed dependencies, deep learning checkpoints, "
                "database migrations, and container configurations are actively deployed and verified "
                "in the SmartCampus AI project environment on macOS / Linux.",
                callout_style
            )
        ]
    ]
    t_signoff = Table(signoff_data, colWidths=[504])
    t_signoff.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#EFF6FF")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#93C5FD")),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
    ]))
    story.append(t_signoff)

    # Build PDF with custom canvas
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF: {output_path}")

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "SmartCampus_AI_Complete_Tech_Stack.pdf"
    create_tech_stack_pdf(out)
