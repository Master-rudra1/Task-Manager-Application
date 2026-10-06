# Task Manager Application — Feature Set B Implementation Report
**Course:** Software Engineering (UE24CS341A) — Semester 5 | Section C  
**Institution:** PES University, Bangalore  
**Team Number:** Team #4  
**Author / Product Owner:** Dhadhal Rudra  
**SRN / USN:** PES1UG24CS146  
**Assigned Functional Modules:** Task Lifecycle CRUD; Subtasks & File Attachments  
**Qualitative Property Contributed:** Data Integrity & Consistency (Atomic transactions & cascading soft-deletes)  

---

## 1. Module Overview & Scope

In accordance with the Software Requirements Specification (SRS v1.0), **Feature Set B** encompasses the core task lifecycle and nested content management engine for the Task Manager Application:

1. **Feature 3: Task Lifecycle & Core CRUD Operations** (`taskController.js`, `ARC-TASK`, `DSN-03`)
   - **REQ-3.1 (Task Creation & Validation):** Task instantiation with mandatory UUID identification, summary title, markdown description, priority level (`Low`, `Medium`, `High`), status (`To-Do`, `In-Progress`, `Review`, `Done`), and due date validation.
   - **REQ-3.2 (Task Modification):** Field updates and dynamic recording of modification timestamps (`updated_at`).
   - **REQ-3.3 (Task Archiving & Deletion):** Dual-mode deletion supporting soft-deletion (`is_archived: true`) and permanent deletion with atomic cascading across child subtasks and attachments.
   - **Business Rule 3 Compliance:** Enforcement that a task cannot have a due date in the past upon initial creation.
   - **REQ-NFR-3 Safety Gate:** Explicit user confirmation dialog/payload (`confirm: true`) required before executing permanent deletion.

2. **Feature 4: Subtasks, Checklists & Attachment Handling** (`subtaskController.js`, `fileUploadService.js`, `ARC-TASK`, `ARC-FILE`, `DSN-04`)
   - **REQ-4.1 (Nested Subtask Management):** Hierarchical subtask checklists supporting insertion, array-based reordering, toggle check/uncheck status, and deletion.
   - **REQ-4.2 (Progress Percentage Calculation):** Dynamic roll-up calculation:
     $$\text{Progress} = \left(\frac{\text{Completed Subtasks}}{\text{Total Subtasks}}\right) \times 100\%$$
   - **REQ-4.3 (Secure File Attachments):** Multi-format file upload handling strictly restricted to a 10 MB maximum size limit, MIME-type validation (`application/pdf`, `image/png`, `image/jpeg`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/zip`), and cryptographically secure download tokens.

---

## 2. Architectural Design & Database Schemas

### 2.1 Entity Relationship Layout (Table B.1 Conformance)

```text
+-------------------------------------------------------------+
|                            TASKS                            |
+-------------------------------------------------------------+
| task_id: UUID (PK)                                         |
| workspace_id: UUID (FK)                                     |
| title: VARCHAR(150) [Mandatory]                             |
| description: TEXT(2000) [Markdown, Optional]               |
| priority: ENUM ('Low', 'Medium', 'High') [Mandatory]       |
| status: ENUM ('To-Do', 'In-Progress', 'Review', 'Done')     |
| due_date: DATE (YYYY-MM-DD) [Optional, Rule 3 Enforced]    |
| created_by: UUID (FK) [Mandatory]                          |
| assignee_id: UUID (FK) [Optional]                          |
| progress_percentage: INT (0 - 100)                         |
| is_archived: BOOLEAN (Default: false)                       |
| deleted_at: TIMESTAMP (Nullable)                            |
| created_at: TIMESTAMP                                       |
| updated_at: TIMESTAMP                                       |
+-------------------------------------------------------------+
             |                                 |
      1-to-Many Cascade                 1-to-Many Cascade
             |                                 |
             v                                 v
+-----------------------------+   +-----------------------------+
|          SUBTASKS           |   |         ATTACHMENTS         |
+-----------------------------+   +-----------------------------+
| subtask_id: UUID (PK)       |   | attachment_id: UUID (PK)    |
| task_id: UUID (FK)          |   | task_id: UUID (FK)          |
| title: VARCHAR(255)         |   | file_name: VARCHAR(255)     |
| is_completed: BOOLEAN       |   | file_size: INT (Max 10MB)   |
| order_index: INT            |   | mime_type: VARCHAR(100)     |
| is_archived: BOOLEAN        |   | download_token: VARCHAR(64) |
| created_at: TIMESTAMP       |   | storage_path: VARCHAR(500)  |
| updated_at: TIMESTAMP       |   | uploaded_by: UUID (FK)      |
+-----------------------------+   +-----------------------------+
```

---

## 3. Implemented REST API Endpoints

| Method | Endpoint | Description | Assigned Req |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/tasks` | Create a new project task | REQ-3.1, Rule 3 |
| `GET` | `/api/v1/tasks` | List tasks by workspace, status, or priority | REQ-3.1 |
| `GET` | `/api/v1/tasks/:taskId` | Get task details with subtasks & attachments | REQ-3.1, REQ-4.1 |
| `PUT` | `/api/v1/tasks/:taskId` | Update task attributes & record timestamp | REQ-3.2 |
| `POST` | `/api/v1/tasks/:taskId/archive` | Soft-delete task with atomic child cascading | REQ-3.3 |
| `DELETE`| `/api/v1/tasks/:taskId` | Permanent deletion with safety confirmation | REQ-3.3, REQ-NFR-3 |
| `POST` | `/api/v1/tasks/:taskId/subtasks` | Add nested subtask & recalculate progress | REQ-4.1, REQ-4.2 |
| `GET` | `/api/v1/tasks/:taskId/subtasks` | List checklist items for a task | REQ-4.1 |
| `PUT` | `/api/v1/subtasks/:subtaskId` | Toggle completion status & update progress % | REQ-4.1, REQ-4.2 |
| `POST` | `/api/v1/tasks/:taskId/subtasks/reorder` | Reorder subtasks by index array | REQ-4.1 |
| `DELETE`| `/api/v1/subtasks/:subtaskId` | Delete subtask item & recalculate progress % | REQ-4.1, REQ-4.2 |
| `POST` | `/api/v1/tasks/:taskId/attachments` | Upload file (validating 10MB limit & MIME) | REQ-4.3 |
| `GET` | `/api/v1/tasks/:taskId/attachments` | List attached file metadata | REQ-4.3 |
| `GET` | `/api/v1/attachments/download/:token` | Secure authorized file download | REQ-4.3 |

---

## 4. Verification & Test Execution Results

All unit and integration test suites correspond directly to the Requirement Traceability Matrix (Appendix C):

| Test Suite ID | Target Requirement | Test Focus | Result |
| :--- | :--- | :--- | :--- |
| **UT-TASK-01** | REQ-3.1, REQ-3.2, REQ-3.3 | Task CRUD, validation, Rule 3 past dates, timestamps, cascading archival & hard delete | **6/6 Passed** |
| **UT-TASK-02** | REQ-4.1, REQ-4.2 | Checklist management, reordering, toggle check/uncheck, dynamic progress % roll-up | **4/4 Passed** |
| **UT-FILE-01** | REQ-4.3 | 10 MB size limit enforcement, MIME whitelisting, download authorization token | **4/4 Passed** |
| **ST-TASK-01** | REQ-3.1, REQ-3.2, REQ-3.3 | Full Task lifecycle via HTTP REST API | **1/1 Passed** |
| **ST-TASK-02** | REQ-4.1, REQ-4.2 | Subtask lifecycle and progress sync via HTTP REST API | **1/1 Passed** |
| **ST-FILE-01** | REQ-4.3 | Attachment upload and token verification via HTTP REST API | **1/1 Passed** |
| **Total** | | **All 21 Test Cases** | **100% Passed (0 Failures)** |

---

## 5. Execution Instructions

### Running Tests
```bash
npm test
# Or: node --test tests/
```

### Running Server
```bash
npm start
# Server listens on port 3000 (http://localhost:3000)
```
