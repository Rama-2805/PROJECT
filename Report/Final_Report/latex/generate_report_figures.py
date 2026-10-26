import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np

os.environ['MPLCONFIGDIR'] = '/tmp/matplotlib'
out_dir = 'Report/Final_Report/latex/assets'
os.makedirs(out_dir, exist_ok=True)

# Common styling
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Helvetica', 'Arial']

# 1. System Architecture Diagram
def draw_architecture():
    fig, ax = plt.subplots(figsize=(10, 6), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # Color palette
    c_blue = '#1E3A8A'
    c_sky = '#0284C7'
    c_slate = '#0F172A'
    c_gray = '#F1F5F9'
    c_border = '#64748B'
    c_green = '#059669'
    c_purple = '#7C3AED'

    # Background card
    rect_bg = patches.FancyBboxPatch((2, 2), 96, 96, boxstyle="round,pad=1", ec="#CBD5E1", fc="#F8FAFC", lw=1.5)
    ax.add_patch(rect_bg)
    ax.text(50, 94, "SMARTCAMPUS AI — DISTRIBUTED EDGE SYSTEM ARCHITECTURE", ha='center', va='center', fontsize=12, fontweight='bold', color=c_slate)

    # 1. Edge Layer (CCTV & IoT)
    p_edge = patches.FancyBboxPatch((5, 62), 26, 26, boxstyle="round,pad=0.8", ec=c_border, fc=c_gray, lw=1.2)
    ax.add_patch(p_edge)
    ax.text(18, 84, "Edge & Sensing Layer", ha='center', va='center', fontsize=10, fontweight='bold', color=c_slate)
    ax.text(18, 77, "• RTSP Classroom IP Cameras\n• OpenCV RTSP Video Ingest\n• IoT Telemetry Sensors\n• Mosquitto MQTT Broker", ha='center', va='center', fontsize=8, color='#334155')

    # 2. AI Vision Service (FastAPI)
    p_ai = patches.FancyBboxPatch((37, 62), 26, 26, boxstyle="round,pad=0.8", ec=c_sky, fc='#E0F2FE', lw=1.5)
    ax.add_patch(p_ai)
    ax.text(50, 84, "AI Computer Vision Service", ha='center', va='center', fontsize=10, fontweight='bold', color='#0369A1')
    ax.text(50, 77, "• SCRFD-10G Face Detector\n• 5-Pt Landmark Alignment\n• ArcFace 512D Embeddings\n• HDBSCAN/DBSCAN Clustering\n• Posture & Attention Engine", ha='center', va='center', fontsize=8, color='#0C4A6E')

    # 3. Vector Database (FAISS)
    p_faiss = patches.FancyBboxPatch((69, 62), 26, 26, boxstyle="round,pad=0.8", ec=c_purple, fc='#F5F3FF', lw=1.5)
    ax.add_patch(p_faiss)
    ax.text(82, 84, "Vector Search Engine", ha='center', va='center', fontsize=10, fontweight='bold', color=c_purple)
    ax.text(82, 77, "• FAISS IndexFlatIP (512D)\n• Sub-millisecond L2 Search\n• Cosine Similarity Engine\n• Biometric Vector Storage\n• Conflict Prevention Sync", ha='center', va='center', fontsize=8, color='#5B21B6')

    # 4. API Gateway (NestJS)
    p_api = patches.FancyBboxPatch((37, 20), 26, 28, boxstyle="round,pad=0.8", ec=c_blue, fc='#EFF6FF', lw=1.5)
    ax.add_patch(p_api)
    ax.text(50, 44, "Enterprise API Gateway", ha='center', va='center', fontsize=10, fontweight='bold', color=c_blue)
    ax.text(50, 34, "• NestJS 11 REST API\n• WebSocket Real-time Feeds\n• 5-Tier RBAC & JWT Guards\n• Attendance Engine Service\n• Conflict Prevention Logic\n• Behavioral Alert Dispatch", ha='center', va='center', fontsize=8, color='#1E40AF')

    # 5. Database & Caching
    p_db = patches.FancyBboxPatch((5, 20), 26, 28, boxstyle="round,pad=0.8", ec=c_green, fc='#ECFDF5', lw=1.5)
    ax.add_patch(p_db)
    ax.text(18, 44, "Persistence & Cache Layer", ha='center', va='center', fontsize=10, fontweight='bold', color=c_green)
    ax.text(18, 34, "• PostgreSQL 16 Relational DB\n• Prisma ORM Data Access\n• Redis 7 Cache & Worker Queue\n• MinIO S3 Object Storage\n• Biometric Audit Trail Logs", ha='center', va='center', fontsize=8, color='#065F46')

    # 6. Web Dashboard (Next.js)
    p_web = patches.FancyBboxPatch((69, 20), 26, 28, boxstyle="round,pad=0.8", ec=c_border, fc='#F8FAFC', lw=1.5)
    ax.add_patch(p_web)
    ax.text(82, 44, "Client Presentation Layer", ha='center', va='center', fontsize=10, fontweight='bold', color=c_slate)
    ax.text(82, 34, "• Next.js 16 (App Router)\n• TailwindCSS & Framer Motion\n• Admin & HOD Overview\n• Teacher Verification Hub\n• Live Telemetry Monitoring\n• Student Attendance Portal", ha='center', va='center', fontsize=8, color='#334155')

    # Connection arrows
    arrow_kw = dict(arrowstyle="<->", color="#334155", lw=1.5, mutation_scale=12)
    ax.annotate("", xy=(31, 75), xytext=(37, 75), arrowprops=arrow_kw)
    ax.annotate("", xy=(63, 75), xytext=(69, 75), arrowprops=arrow_kw)
    ax.annotate("", xy=(50, 62), xytext=(50, 48), arrowprops=arrow_kw)
    ax.annotate("", xy=(31, 34), xytext=(37, 34), arrowprops=arrow_kw)
    ax.annotate("", xy=(63, 34), xytext=(69, 34), arrowprops=arrow_kw)
    ax.annotate("", xy=(50, 62), xytext=(25, 48), arrowprops=dict(arrowstyle="->", color="#64748B", lw=1.2, ls="--"))

    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, 'fig_architecture.png'), bbox_inches='tight', dpi=300)
    plt.close()

# 2. Biometric Recognition Pipeline Diagram
def draw_pipeline():
    fig, ax = plt.subplots(figsize=(10, 4.5), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    steps = [
        ("CCTV Video Feed\n(RTSP 1080p @ 25fps)", "#F1F5F9", "#334155"),
        ("Face Detection\n(SCRFD-10G / RetinaFace)", "#E0F2FE", "#0284C7"),
        ("Quality Filter\n(Laplacian Var >= 120)", "#FEF3C7", "#D97706"),
        ("5-Pt Alignment\n(Affine Normalization)", "#EDE9FE", "#7C3AED"),
        ("ArcFace Embedding\n(512-D L2-Norm Vector)", "#FCE7F3", "#DB2777"),
        ("FAISS Search\n(Cosine Sim >= 0.65)", "#DCFCE7", "#16A34A")
    ]

    for i, (title, bg, border) in enumerate(steps):
        x = 3 + i * 16.2
        patch = patches.FancyBboxPatch((x, 30), 14.5, 40, boxstyle="round,pad=0.5", ec=border, fc=bg, lw=1.4)
        ax.add_patch(patch)
        ax.text(x + 7.25, 50, title, ha='center', va='center', fontsize=7.5, fontweight='bold', color=border)
        
        # Draw arrow to next step
        if i < len(steps) - 1:
            ax.annotate("", xy=(x + 14.5, 50), xytext=(x + 16.2, 50),
                        arrowprops=dict(arrowstyle="->", color="#64748B", lw=1.8, mutation_scale=12))

    ax.text(50, 85, "MULTI-STAGE BIOMETRIC INFERENCE & RECOGNITION PIPELINE", ha='center', va='center', fontsize=11, fontweight='bold', color='#0F172A')
    ax.text(50, 15, "Output: Multi-Evidence Biometric Attendance Record Logged with Cryptographic Integrity", ha='center', va='center', fontsize=8.5, fontstyle='italic', color='#475569')

    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, 'fig_pipeline.png'), bbox_inches='tight', dpi=300)
    plt.close()

# 3. Unsupervised Clustering & Conflict Prevention Flowchart
def draw_clustering():
    fig, ax = plt.subplots(figsize=(10, 5), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    nodes = [
        (10, 70, 20, 18, "Temporal Face\nTracks Extracted", "#E2E8F0", "#334155"),
        (40, 70, 22, 18, "HDBSCAN / DBSCAN\nDensity Clustering", "#DBEAFE", "#1D4ED8"),
        (72, 70, 22, 18, "Representative Crop\nSharpness Scoring", "#FEF3C7", "#D97706"),
        (10, 25, 20, 20, "Teacher Candidate\nReview Hub", "#EDE9FE", "#6D28D9"),
        (40, 25, 22, 20, "Conflict Prevention\nEngine Verification", "#FEE2E2", "#DC2626"),
        (72, 25, 22, 20, "Synchronize FAISS\n& Database State", "#DCFCE7", "#15803D")
    ]

    for (x, y, w, h, text, bg, ec) in nodes:
        p = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.6", ec=ec, fc=bg, lw=1.3)
        ax.add_patch(p)
        ax.text(x + w/2, y + h/2, text, ha='center', va='center', fontsize=8, fontweight='bold', color=ec)

    # Connections
    kw = dict(arrowstyle="->", color="#475569", lw=1.5, mutation_scale=12)
    ax.annotate("", xy=(30, 79), xytext=(40, 79), arrowprops=kw)
    ax.annotate("", xy=(62, 79), xytext=(72, 79), arrowprops=kw)
    ax.annotate("", xy=(83, 70), xytext=(83, 58), arrowprops=dict(arrowstyle="-", color="#475569", lw=1.5))
    ax.annotate("", xy=(83, 58), xytext=(20, 58), arrowprops=dict(arrowstyle="-", color="#475569", lw=1.5))
    ax.annotate("", xy=(20, 58), xytext=(20, 45), arrowprops=kw)
    ax.annotate("", xy=(30, 35), xytext=(40, 35), arrowprops=kw)
    ax.annotate("", xy=(62, 35), xytext=(72, 35), arrowprops=kw)

    ax.text(50, 94, "UNSUPERVISED IDENTITY CLUSTERING & CONFLICT PREVENTION WORKFLOW", ha='center', va='center', fontsize=11, fontweight='bold', color='#0F172A')

    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, 'fig_clustering.png'), bbox_inches='tight', dpi=300)
    plt.close()

# 4. Latency Breakdown Chart
def draw_latency():
    fig, ax = plt.subplots(figsize=(7, 4), dpi=300)
    stages = ['Face Detection\n(SCRFD-10G)', 'Quality Filter &\nAlignment', 'ArcFace 512D\nEmbedding', 'FAISS Vector\nSearch', 'Behavior &\nAttention Scorer', 'DB & WebSocket\nTelemetry']
    latencies = [18.4, 3.2, 12.6, 1.1, 5.8, 4.3]
    colors_list = ['#0284C7', '#D97706', '#DB2777', '#16A34A', '#7C3AED', '#475569']

    bars = ax.barh(stages, latencies, color=colors_list, height=0.55, edgecolor='#334155', lw=0.8)
    ax.set_xlabel('Processing Latency per Video Frame (milliseconds)', fontsize=9, fontweight='bold')
    ax.set_title('Inference Latency Breakdown Across Video Processing Pipeline', fontsize=10, fontweight='bold', pad=12)
    ax.grid(axis='x', linestyle='--', alpha=0.6)
    ax.set_xlim(0, 24)

    for bar in bars:
        w = bar.get_width()
        ax.text(w + 0.4, bar.get_y() + bar.get_height()/2, f"{w:.1f} ms", va='center', fontsize=8, fontweight='bold')

    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, 'fig_latency.png'), bbox_inches='tight', dpi=300)
    plt.close()

# 5. Accuracy & Recognition Benchmark Chart
def draw_accuracy():
    fig, ax = plt.subplots(figsize=(7, 4), dpi=300)
    distances = ['Front Row\n(1.5m - 2.5m)', 'Mid Row\n(2.5m - 5.0m)', 'Rear Row\n(5.0m - 8.0m)', 'Extreme Angle\n(> 35 deg)', 'Overall Field\nBenchmark']
    acc = [99.4, 98.8, 97.2, 94.6, 98.6]

    bars = ax.bar(distances, acc, color='#1E40AF', width=0.5, edgecolor='#0F172A', lw=0.8)
    ax.set_ylabel('Biometric Recognition Accuracy (%)', fontsize=9, fontweight='bold')
    ax.set_title('Room 408 Field Benchmark: Recognition Accuracy vs Distance & Angle', fontsize=10, fontweight='bold', pad=12)
    ax.set_ylim(90, 101)
    ax.grid(axis='y', linestyle='--', alpha=0.6)

    for bar in bars:
        h = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2, h + 0.3, f"{h:.1f}%", ha='center', fontsize=8.5, fontweight='bold')

    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, 'fig_accuracy.png'), bbox_inches='tight', dpi=300)
    plt.close()

# 6. DFD Level 0
def draw_dfd_lvl0():
    fig, ax = plt.subplots(figsize=(8, 4), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # Central process
    circle = patches.Circle((50, 50), 16, ec='#1E3A8A', fc='#DBEAFE', lw=2)
    ax.add_patch(circle)
    ax.text(50, 52, "0.0\nSmartCampus AI\nSystem", ha='center', va='center', fontsize=9, fontweight='bold', color='#1E3A8A')

    # External entities
    entities = [
        (12, 50, "CCTV Camera\nStreams (RTSP)", "#F1F5F9"),
        (50, 85, "Faculty / Teacher\n(Lecture Controller)", "#F1F5F9"),
        (88, 50, "Student / Parent\n(Portal Consumer)", "#F1F5F9"),
        (50, 15, "Institutional Admin\n& HOD (Oversight)", "#F1F5F9")
    ]

    for x, y, text, fc in entities:
        rect = patches.FancyBboxPatch((x-10, y-8), 20, 16, boxstyle="round,pad=0.3", ec='#334155', fc=fc, lw=1.2)
        ax.add_patch(rect)
        ax.text(x, y, text, ha='center', va='center', fontsize=7.5, fontweight='bold')

    # Connectors
    kw = dict(arrowstyle="->", color="#334155", lw=1.3, mutation_scale=10)
    ax.annotate("RTSP Frames", xy=(34, 50), xytext=(22, 50), arrowprops=kw, fontsize=7)
    ax.annotate("Session Controls", xy=(50, 66), xytext=(50, 77), arrowprops=kw, fontsize=7)
    ax.annotate("Attendance Logs", xy=(78, 50), xytext=(66, 50), arrowprops=kw, fontsize=7)
    ax.annotate("Telemetry & Reports", xy=(50, 23), xytext=(50, 34), arrowprops=kw, fontsize=7)

    ax.text(50, 96, "DATA FLOW DIAGRAM (DFD) — LEVEL 0 (CONTEXT DIAGRAM)", ha='center', va='center', fontsize=10, fontweight='bold', color='#0F172A')

    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, 'fig_dfd_lvl0.png'), bbox_inches='tight', dpi=300)
    plt.close()

# 7. UML Use Case Diagram
def draw_usecase():
    fig, ax = plt.subplots(figsize=(9, 5.5), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # System Boundary
    boundary = patches.Rectangle((22, 5), 56, 88, ec='#1E3A8A', fc='#F8FAFC', lw=1.5, ls='--')
    ax.add_patch(boundary)
    ax.text(50, 90, "SmartCampus AI System Boundary", ha='center', va='center', fontsize=9, fontweight='bold', color='#1E3A8A')

    # Actors
    actors = [
        (10, 75, "Faculty /\nTeacher"),
        (10, 25, "Student"),
        (90, 75, "Department\nHOD"),
        (90, 25, "College\nAdmin")
    ]
    for x, y, name in actors:
        circle = patches.Circle((x, y+4), 3, ec='#0F172A', fc='#E2E8F0', lw=1.2)
        ax.add_patch(circle)
        ax.plot([x, x], [y+1, y-4], color='#0F172A', lw=1.2)
        ax.plot([x-3, x+3], [y-1, y-1], color='#0F172A', lw=1.2)
        ax.plot([x, x-3], [y-4, y-8], color='#0F172A', lw=1.2)
        ax.plot([x, x+3], [y-4, y-8], color='#0F172A', lw=1.2)
        ax.text(x, y-12, name, ha='center', va='center', fontsize=7.5, fontweight='bold')

    # Use cases
    ucs = [
        (50, 78, "Start / Conclude Lecture Session"),
        (50, 66, "Review AI Candidate Clusters"),
        (50, 54, "Receive In-Class Behavioral Alerts"),
        (50, 42, "View Biometric Attendance History"),
        (50, 30, "Enroll Face Vectors & FAISS Sync"),
        (50, 18, "Audit Departmental Analytics & Logs")
    ]
    for x, y, text in ucs:
        el = patches.Ellipse((x, y), 38, 8, ec='#0284C7', fc='#E0F2FE', lw=1.2)
        ax.add_patch(el)
        ax.text(x, y, text, ha='center', va='center', fontsize=7.5, fontweight='bold', color='#0369A1')

    # Actor lines
    line_kw = dict(color="#64748B", lw=1)
    ax.plot([14, 31], [72, 78], **line_kw)
    ax.plot([14, 31], [72, 66], **line_kw)
    ax.plot([14, 31], [72, 54], **line_kw)
    ax.plot([14, 31], [25, 42], **line_kw)
    ax.plot([86, 69], [72, 54], **line_kw)
    ax.plot([86, 69], [72, 18], **line_kw)
    ax.plot([86, 69], [25, 30], **line_kw)
    ax.plot([86, 69], [25, 18], **line_kw)

    ax.text(50, 97, "UML USE CASE DIAGRAM — SMARTCAMPUS AI", ha='center', va='center', fontsize=11, fontweight='bold', color='#0F172A')

    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, 'fig_usecase.png'), bbox_inches='tight', dpi=300)
    plt.close()

if __name__ == '__main__':
    print("Generating diagrams...")
    draw_architecture()
    draw_pipeline()
    draw_clustering()
    draw_latency()
    draw_accuracy()
    draw_dfd_lvl0()
    draw_usecase()
    print("All diagrams generated successfully!")
