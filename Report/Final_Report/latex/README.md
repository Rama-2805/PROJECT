# SmartCampus AI — Major Project Report (LaTeX Source)

This folder contains the complete, compilable LaTeX source code and graphic assets for the **SmartCampus AI** Major Project Report (Phase-II), prepared for the Department of Computer Science and Engineering, Vemana Institute of Technology (affiliated to Visvesvaraya Technological University, Belagavi).

---

## 📁 Directory Structure

```
latex/
├── main.tex                 # Master LaTeX document entry point
├── references.bib           # IEEE-formatted bibliography database
├── README.md                # Compilation and build instructions
├── frontmatter/             # Preliminary academic front matter (Sample_Report order)
│   ├── cover.tex            # University & College Cover Page with borders & logos
│   ├── certificate.tex      # Departmental Certificate with Guide/HOD/Principal signatures
│   ├── abstract.tex         # Technical Abstract & Keywords (Precedes Declaration per VTU sample)
│   ├── declaration.tex      # Candidate Declaration
│   ├── acknowledgment.tex   # Formal Institutional Acknowledgment
│   └── toc.tex              # Table of Contents, LOT, LOF, Abbreviations
├── chapters/                # Core Project Chapters (Aligned to 8-Chapter VTU Structure)
│   ├── ch1_introduction.tex # 1.1 Problem Definition, 1.2 Objectives, 1.3 Scope, 1.4 Org
│   ├── ch2_literature_survey.tex # 10 Critical Reviews, Table 2.1 Comparative Analysis
│   ├── ch3_system_analysis.tex # 3.1 Drawbacks, 3.2 Proposed System, 3.3 Feasibility & Table 3.1 Cost
│   ├── ch4_system_requirements.tex # 4.1 HW, 4.2 SW, 4.3 Functional (FR-1..10), 4.4 Non-Functional
│   ├── ch5_project_description.tex # 5.1-5.4 Architecture & Modules, 5.5 DFD, 5.6 Use Case, 5.7 Sequence
│   ├── ch6_system_implementation.tex # 6.1-6.2 Implementation with Figures 6.1 to 6.6
│   ├── ch7_system_testing.tex # 7.1 Testing Types, 7.2 Table 7.1 Test Cases (12 Test Cases)
│   ├── ch8_conclusion_future_scope.tex # 8.1 Conclusions, 8.2 Future Scope
│   └── appendix.tex         # Production API Endpoints & Environment Specs
└── assets/                  # High-Resolution Figures and Institutional Logos
    ├── VTU_Logo.png         # Visvesvaraya Technological University Crest
    ├── college_logo.JPG     # Vemana Institute of Technology Crest
    ├── deptLogo (1).JPG     # Department of Computer Science & Engineering Crest
    ├── fig_architecture.png # Fig 5.1: High-level End-to-End System Architecture
    ├── fig_dfd_lvl0.png     # Fig 5.2: Level 0 Data Flow Context Diagram
    ├── fig_usecase.png      # Fig 5.3: UML Use Case Diagram
    ├── fig_sequence.png     # Fig 5.4: UML Sequence Diagram
    ├── fig_pipeline.png     # Fig 6.1: Real-time Biometric Face Recognition Pipeline
    ├── fig_clustering.png   # Fig 6.2: Unsupervised Clustering & Conflict Resolution Flow
    ├── fig_attendance_receipt.png # Fig 6.3: Tamper-Evident Attendance Receipt Modal
    ├── fig_candidate_review.png   # Fig 6.4: Low-Confidence Candidate Review Interface
    ├── fig_behavior_alert.png     # Fig 6.5: Real-time Classroom Behavior Anomaly Alert
    ├── fig_admin_dashboard.png    # Fig 6.6: Executive Departmental Analytics Dashboard
    ├── fig_accuracy.png     # Fig 6.7: Benchmark Recognition Accuracy vs Distance
    └── fig_latency.png      # Fig 6.8: Pipeline Stage Inference Latency Breakdown
```

---

## 🛠️ Compilation Instructions

### Prerequisites
To compile the document from source, ensure you have a standard TeX distribution installed:
- **macOS:** MacTeX or BasicTeX (`brew install --cask mactex-no-gui`)
- **Linux (Ubuntu/Debian):** `sudo apt-get install texlive-latex-extra texlive-fonts-recommended texlive-bibtex-extra`
- **Windows:** TeX Live or MiKTeX

### Compilation Commands
Execute the standard four-pass compilation workflow to resolve all cross-references, table of contents, and bibliographic citations:

```bash
cd Report/Final_Report/latex/

# Pass 1: Initial compilation
pdflatex -interaction=nonstopmode main.tex

# Pass 2: Process bibliography
bibtex main

# Pass 3: Resolve citations
pdflatex -interaction=nonstopmode main.tex

# Pass 4: Finalize Table of Contents and cross-references
pdflatex -interaction=nonstopmode main.tex
```

Alternatively, if `latexmk` is available:
```bash
latexmk -pdf main.tex
```

The resulting document will be produced as `main.pdf`.
