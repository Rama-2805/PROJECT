# Safe Cleanup & File Retention Report — SmartCampus AI

This document provides a complete audit of all file cleanup actions performed, files evaluated and deliberately retained, and high-risk cleanup recommendations requiring explicit administrative approval.

---

## 1. Cleanup Actions Executed (Confirmed Low-Risk)

| Action | Target Pattern / Path | Reason / Evidence | Result | Risk Level |
| :--- | :--- | :--- | :---: | :---: |
| **Removed** | `.DS_Store` across workspace | macOS Finder binary cache metadata files; non-runtime; already gitignored. | Cleaned (0 remaining) | Low (Zero Impact) |

*Note: In accordance with repository safety rules, no source files, database records, environment configurations, models, or test fixtures were deleted.*

---

## 2. Files Evaluated and Deliberately Retained

During the audit, multiple files and directories appeared at first glance to be candidates for deletion. However, deep dependency inspection revealed they are actively required:

### 1. `smartcampus_dev.db` (SQLite Database File in Root)
- **Initial Impression**: Unused development artifact or left-over database.
- **Investigation Finding**: **CRITICAL RUNTIME RECOVERY ASSET**.
- **Evidence**: `apps/ai-service/app/config/database.py:41-43` contains an automated failover catch block:
  ```python
  fallback_url = "sqlite:///./smartcampus_dev.db"
  ```
  If PostgreSQL fails or disconnects during edge camera ingestion, the AI microservice automatically falls back to `smartcampus_dev.db` to prevent service crash.
- **Action**: **RETAINED**.

### 2. `test_storage/` (Directory in Root)
- **Initial Impression**: Temporary test output folder from prior executions.
- **Investigation Finding**: **REQUIRED TEST FIXTURE**.
- **Evidence**: `apps/ai-service/app/tests/conftest.py:18` explicitly sets:
  ```python
  os.environ["STORAGE_DIR"] = "test_storage"
  ```
  Removing this directory causes `pytest app/tests/` to fail with `FileNotFoundError` during candidate crop persistence tests.
- **Action**: **RETAINED**.

### 3. `test_vectors/` (Directory in Root)
- **Initial Impression**: Empty test artifact directory.
- **Investigation Finding**: **REQUIRED TEST FIXTURE**.
- **Evidence**: `apps/ai-service/app/tests/conftest.py:19-20` explicitly sets:
  ```python
  os.environ["FACE_INDEX_PATH"] = "test_vectors/face_index.faiss"
  os.environ["METADATA_PATH"] = "test_vectors/metadata.json"
  ```
  The FAISS vector store unit test writes temporary index binaries into this directory during test execution.
- **Action**: **RETAINED**.

### 4. `src/` (Root Python Directory)
- **Initial Impression**: Redundant legacy code superseded by `apps/ai-service/`.
- **Investigation Finding**: **OPERATIONAL SCRIPT & TEST DEPENDENCY**.
- **Evidence**:
  - `scripts/run_pipeline.py:8-12` imports `QualityAssessor`, `DuplicateRemover`, `IdentityClusterer`, `DatabaseManager`, and `ReportGenerator` from `src.`.
  - `tests/test_pipeline.py:11-93` directly executes test cases against `src.*`.
- **Action**: **RETAINED** (Refactoring scheduled for post-production roadmap).

### 5. `apps/ai-brain/` and `apps/mlops/`
- **Initial Impression**: Incomplete microservices.
- **Investigation Finding**: **OFFLINE TOOLING & ARCHITECTURAL ROADMAP**.
- **Evidence**: Contains model training pipelines, offline dataset validation scripts, and container definitions. They do not run in primary web/API production loops and do not degrade system stability.
- **Action**: **RETAINED**.

### 6. `WEEK-1 to 3.xlsx.backup` (Excel Backup File)
- **Initial Impression**: Duplicate spreadsheet file.
- **Investigation Finding**: **USER DOCUMENTATION BACKUP**.
- **Action**: **RETAINED** (User-created academic project tracking documentation; must never be deleted without approval).

---

## 3. High-Risk Cleanup Recommendations (Requiring Future Approval)

The following cleanups are recommended for future refactoring phases but require coordinated development and explicit approval before execution:

1. **Purge `apps/web/src/lib/userStore.ts`**:
   - *Risk*: Medium-High.
   - *Requirement*: Frontend components relying on `userStore.ts` for offline demo mode must first be refactored to use standard React Query / Zustand API error boundaries.
2. **Remove Unused Prisma Prototype Models (`CampusDrone`, `HologramNode`)**:
   - *Risk*: High.
   - *Requirement*: Requires generating a new database migration (`prisma migrate dev`) and dropping columns/tables from PostgreSQL without corrupting foreign key constraints.
3. **Consolidate `src/` and `tests/test_pipeline.py` into `apps/ai-service/`**:
   - *Risk*: Medium.
   - *Requirement*: Migrate `scripts/run_pipeline.py` to import from `apps.ai_service.app.services.*` and archive legacy scripts.
