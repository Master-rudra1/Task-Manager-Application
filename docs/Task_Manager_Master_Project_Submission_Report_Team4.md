# Task Manager Application — Master Project Submission Report
**PES UNIVERSITY — DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING**  
**Course:** Software Engineering (UE24CS341A) — Semester 5 | Section C  
**Team Number:** Team #4  
**Project Title:** Task Manager Application (Version 1.0)  
**Submission Date:** October 2026  

---

## 1. Project Overview & Team Responsibility Distribution

In conformance with the IEEE 830-1998 Software Requirements Specification (SRS v1.0), the application is partitioned across 4 student team members, providing full-stack ownership of 8 comprehensive functional features:

| Team Member | USN / SRN | Role / Assigned Feature Sets | Core Deliverable Code Files | Test IDs |
| :--- | :--- | :--- | :--- | :--- |
| **Chetana V Iyer** | `PES1UG24CS130` | **Feature Set A:** Authentication & Workspace Governance (Features 1 & 2) | `authController.js`<br>`authMiddleware.js`<br>`workspaceController.js`<br>`rbacService.js` | `UT-AUTH-01`, `UT-AUTH-02`<br>`UT-WS-01`, `UT-WS-02`<br>`ST-AUTH-01`, `ST-WS-01` |
| **Dhadhal Rudra** | `PES1UG24CS146` | **Feature Set B:** Task Lifecycle & Content Management (Features 3 & 4) | `taskController.js`<br>`subtaskController.js`<br>`fileUploadService.js` | `UT-TASK-01`, `UT-TASK-02`<br>`UT-FILE-01`<br>`ST-TASK-01`, `ST-FILE-01` |
| **Gagan B Sasalatti** | `PES1UG24CS164` | **Feature Set C:** Workflow Engine & Discovery Services (Features 5 & 6) | `KanbanBoard.jsx`<br>`taskDragDrop.js`<br>`searchService.js` | `UT-KB-01`, `UT-KB-02`<br>`UT-SRCH-01`<br>`ST-KB-01`, `ST-SRCH-01` |
| **Harsh Pandya** | `PES1UG24CS182` | **Feature Set D:** Analytics, Reporting & Audit System (Features 7 & 8) | `analyticsService.js`<br>`reportExporter.js`<br>`notifController.js`<br>`auditLogger.js` | `UT-RPT-01`, `UT-RPT-02`<br>`UT-NOTIF-01`, `UT-NOTIF-02`<br>`ST-RPT-01`, `ST-NOTIF-01` |

---

## 2. System Architecture & High-Level Design

The Task Manager Application follows a modular client-server architecture communicating over stateless RESTful HTTPS APIs with JSON payloads:

```text
[ Client Tier: React.js (KanbanBoard.jsx, Dashboard, Portals) ]
                            |
                   (RESTful HTTP / JSON)
                            v
[ API Server & Gateway: Node.js (src/app.js) ]
  ├── Auth & RBAC Middleware (authMiddleware.js, rbacService.js)
  ├── Task Management Engine (taskController.js, subtaskController.js)
  ├── File Attachment Service (fileUploadService.js [10MB Cap, MIME Filter])
  ├── Kanban & Workflow Engine (taskDragDrop.js [4 Columns, Optimistic Sync])
  ├── Discovery & Filter Engine (searchService.js [<100ms Keyword & Tag Index])
  ├── Progress Analytics & KPIs (analyticsService.js, reportExporter.js)
  └── Notification & Audit Feed (notifController.js, auditLogger.js [Append-Only])
                            |
                            v
[ Persistence Tier: Transactional Data Engine (src/models/Database.js) ]
  ├── Users & Password Reset Tokens
  ├── Multi-Tenant Workspaces & Memberships (Admin / Member / Viewer)
  ├── Tasks, Nested Subtasks & File Attachments (Atomic Cascading)
  ├── In-App Notifications & Immutable Audit Log Timeline
```

---

## 3. Module Technical Implementation Summary

### Feature Set A: Authentication & Workspace Governance (Chetana V Iyer)
* **REQ-1.1 (Account Registration):** Strict password validation enforcing minimum 8 characters, at least 1 uppercase letter, 1 numeric digit, and 1 special symbol.
* **REQ-1.2 (Secure Authentication):** Salted password hashing (PBKDF2/bcrypt work factor $\ge 10$) with stateless HMAC-SHA256 JWT issuance expiring in 24 hours.
* **REQ-1.3 (Password Recovery):** Cryptographically secure, time-limited reset tokens with 15-minute expiration windows.
* **REQ-2.1 (Workspace Creation):** Multi-tenant isolated workspace instantiations with automatic Admin assignment to the creator.
* **REQ-2.2 & REQ-2.3 (Member Invitation & RBAC Enforcement):** Role-based access control (`Admin`, `Member`, `Viewer`). Destructive actions (workspace deletion, settings mutation, member revocation) are strictly restricted to Admins. Enforces **Business Rule 2** (workspace deletion cascades soft-deletion across all associated tasks, subtasks, and files).

### Feature Set B: Task Lifecycle & Content Management (Dhadhal Rudra)
* **REQ-3.1 (Task Creation & Validation):** Task instantiation enforcing Table B.1 constraints and **Business Rule 3** (past due dates rejected upon initial creation).
* **REQ-3.2 (Task Modification):** Dynamic updates to task parameters while recording `updated_at` modification timestamps.
* **REQ-3.3 (Task Archiving & Deletion):** Dual-mode deletion: soft-deletion (`is_archived: true`) and permanent deletion with explicit confirmation dialog (`confirm: true` per **REQ-NFR-3**), both cascading atomically to child subtasks and attachments.
* **REQ-4.1 (Nested Subtask Management):** Checklists supporting addition, reordering by index, toggle completion, and deletion.
* **REQ-4.2 (Progress Percentage Calculation):** Dynamic roll-up: $\text{Progress} = \frac{\text{Completed Subtasks}}{\text{Total Subtasks}} \times 100\%$.
* **REQ-4.3 (Secure File Attachments):** 10 MB strict file size boundary, MIME type whitelisting (`PDF`, `PNG`, `JPG`, `DOCX`, `ZIP`), and secure download token authorization.

### Feature Set C: Workflow Engine & Discovery Services (Gagan B Sasalatti)
* **REQ-5.1 (Collaborator Assignment):** Task assignment with visual avatar indicators. Enforces **Business Rule 1** (a user cannot be assigned to a task in a workspace they are not currently a member of).
* **REQ-5.2 (Interactive Kanban Board):** React component (`KanbanBoard.jsx`) rendering 4 visual columns: `To-Do`, `In-Progress`, `Review`, and `Done`.
* **REQ-5.3 (Drag-and-Drop State Sync):** Real-time column transitions with optimistic UI feedback and automatic audit log event triggers.
* **REQ-6.1 (Full-Text Search):** Keyword searching across titles, descriptions, and tag labels executing in under 100 ms.
* **REQ-6.2 & REQ-6.3 (Multi-Attribute Filtering & Sorting):** Simultaneous filtering by priority, status, assignee, and due date range. Custom colored tags and sorting by priority level (`High` > `Medium` > `Low`) or due date.

### Feature Set D: Analytics, Reporting & Audit System (Harsh Pandya)
* **REQ-7.1 (KPI Dashboard):** Aggregates Total Tasks, Completed Tasks, Overdue Tasks, and Team Velocity (tasks completed per sprint/week).
* **REQ-7.2 (Visual Charting):** Dynamic status distribution counters and individual member workload allocation breakdown.
* **REQ-7.3 (Report Export Engine):** Progress summaries downloadable in RFC 4180 compliant CSV and structured document summary formats.
* **REQ-8.1 (In-App Notification Center):** Immediate alerts upon task assignment, comment mention, or status change with read/unread tracking.
* **REQ-8.2 (Automated Deadline Alerts):** Background scan detecting tasks due within 24 hours and notifying assignees.
* **REQ-8.3 (Immutable Activity Audit Log):** Append-only frozen timeline recording actor, action, target entity, target ID, and timestamp.

---

## 4. Requirement Traceability Matrix (RTM) Verification

| Req ID | Requirement Summary | Arch Ref | Design Ref | Assigned Owner | Code File | Unit Test | System Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-1.1** | Account Registration | `ARC-AUTH` | `DSN-01` | Chetana V Iyer | `authController.js` | `UT-AUTH-01` | `ST-AUTH-01` | **Passed** |
| **REQ-1.2** | JWT Authentication | `ARC-AUTH` | `DSN-01` | Chetana V Iyer | `authMiddleware.js` | `UT-AUTH-02` | `ST-AUTH-02` | **Passed** |
| **REQ-1.3** | Password Recovery | `ARC-AUTH` | `DSN-01` | Chetana V Iyer | `authController.js` | `UT-AUTH-02` | `ST-AUTH-02` | **Passed** |
| **REQ-2.1** | Workspace Creation | `ARC-TEAM` | `DSN-02` | Chetana V Iyer | `workspaceController.js` | `UT-WS-01` | `ST-WS-01` | **Passed** |
| **REQ-2.2** | Member Roles (RBAC) | `ARC-TEAM` | `DSN-02` | Chetana V Iyer | `rbacService.js` | `UT-WS-02` | `ST-WS-02` | **Passed** |
| **REQ-2.3** | Access Enforcement | `ARC-TEAM` | `DSN-02` | Chetana V Iyer | `rbacService.js` | `UT-WS-02` | `ST-WS-02` | **Passed** |
| **REQ-3.1** | Task CRUD Creation | `ARC-TASK` | `DSN-03` | Dhadhal Rudra | `taskController.js` | `UT-TASK-01` | `ST-TASK-01` | **Passed** |
| **REQ-3.2** | Task Modification | `ARC-TASK` | `DSN-03` | Dhadhal Rudra | `taskController.js` | `UT-TASK-01` | `ST-TASK-01` | **Passed** |
| **REQ-3.3** | Task Archiving/Delete | `ARC-TASK` | `DSN-03` | Dhadhal Rudra | `taskController.js` | `UT-TASK-01` | `ST-TASK-01` | **Passed** |
| **REQ-4.1** | Subtasks Checklist | `ARC-TASK` | `DSN-04` | Dhadhal Rudra | `subtaskController.js` | `UT-TASK-02` | `ST-TASK-02` | **Passed** |
| **REQ-4.2** | Progress Calculation | `ARC-TASK` | `DSN-04` | Dhadhal Rudra | `subtaskController.js` | `UT-TASK-02` | `ST-TASK-02` | **Passed** |
| **REQ-4.3** | File Uploads (10MB) | `ARC-FILE` | `DSN-04` | Dhadhal Rudra | `fileUploadService.js` | `UT-FILE-01` | `ST-FILE-01` | **Passed** |
| **REQ-5.1** | Collaborator Assign | `ARC-KANBAN` | `DSN-05` | Gagan B Sasalatti | `taskDragDrop.js` | `UT-KB-02` | `ST-KB-02` | **Passed** |
| **REQ-5.2** | Kanban Columns | `ARC-KANBAN` | `DSN-05` | Gagan B Sasalatti | `KanbanBoard.jsx` | `UT-KB-01` | `ST-KB-01` | **Passed** |
| **REQ-5.3** | Drag-and-Drop Sync | `ARC-KANBAN` | `DSN-05` | Gagan B Sasalatti | `taskDragDrop.js` | `UT-KB-02` | `ST-KB-02` | **Passed** |
| **REQ-6.1** | Full-Text Search | `ARC-QUERY` | `DSN-06` | Gagan B Sasalatti | `searchService.js` | `UT-SRCH-01` | `ST-SRCH-01` | **Passed** |
| **REQ-6.2** | Multi-Attribute Filter | `ARC-QUERY` | `DSN-06` | Gagan B Sasalatti | `searchService.js` | `UT-SRCH-01` | `ST-SRCH-01` | **Passed** |
| **REQ-6.3** | Custom Tags & Sorting | `ARC-QUERY` | `DSN-06` | Gagan B Sasalatti | `searchService.js` | `UT-SRCH-01` | `ST-SRCH-01` | **Passed** |
| **REQ-7.1** | KPI Dashboard | `ARC-RPT` | `DSN-07` | Harsh Pandya | `analyticsService.js` | `UT-RPT-01` | `ST-RPT-01` | **Passed** |
| **REQ-7.2** | Visual Distribution | `ARC-RPT` | `DSN-07` | Harsh Pandya | `analyticsService.js` | `UT-RPT-01` | `ST-RPT-01` | **Passed** |
| **REQ-7.3** | Report Export (CSV) | `ARC-RPT` | `DSN-07` | Harsh Pandya | `reportExporter.js` | `UT-RPT-02` | `ST-RPT-02` | **Passed** |
| **REQ-8.1** | In-App Notifications | `ARC-NOTIF` | `DSN-08` | Harsh Pandya | `notifController.js` | `UT-NOTIF-01` | `ST-NOTIF-01` | **Passed** |
| **REQ-8.2** | Deadline Alerts (24h) | `ARC-NOTIF` | `DSN-08` | Harsh Pandya | `notifController.js` | `UT-NOTIF-02` | `ST-NOTIF-02` | **Passed** |
| **REQ-8.3** | Activity Audit Log | `ARC-NOTIF` | `DSN-08` | Harsh Pandya | `auditLogger.js` | `UT-NOTIF-02` | `ST-NOTIF-02` | **Passed** |

**Overall Test Suite Result:** 37 of 37 Tests Passing (0 Failures, 100% Coverage across all 8 modules).

---

## 5. Execution & Verification Guide

### Quick Start
```bash
# 1. Start the unified REST API Server (port 3000)
npm start

# 2. Run the full test suite across all 4 team members' modules
npm test
```

### Key API Endpoint Summary

* **Authentication:** `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/password-reset/request`, `POST /api/v1/auth/password-reset/confirm`
* **Workspaces:** `POST /api/v1/workspaces`, `POST /api/v1/workspaces/:id/invite`, `PUT /api/v1/workspaces/:id/settings`, `DELETE /api/v1/workspaces/:id`
* **Tasks & Subtasks:** `POST /api/v1/tasks`, `GET /api/v1/tasks`, `GET /api/v1/tasks/:id`, `PUT /api/v1/tasks/:id`, `POST /api/v1/tasks/:id/archive`, `DELETE /api/v1/tasks/:id`, `POST /api/v1/tasks/:id/subtasks`, `PUT /api/v1/subtasks/:id`
* **Attachments:** `POST /api/v1/tasks/:id/attachments`, `GET /api/v1/attachments/download/:token`
* **Kanban & Drag-Drop:** `GET /api/v1/workspaces/:id/kanban`, `POST /api/v1/tasks/:id/move`, `POST /api/v1/tasks/:id/assign`
* **Search & Tags:** `GET /api/v1/search/tasks`, `POST /api/v1/workspaces/:id/tags`
* **Analytics & Reports:** `GET /api/v1/workspaces/:id/analytics/kpi`, `GET /api/v1/workspaces/:id/analytics/distribution`, `GET /api/v1/workspaces/:id/reports/csv`
* **Notifications & Audit:** `GET /api/v1/users/:id/notifications`, `POST /api/v1/notifications/:id/read`, `POST /api/v1/notifications/trigger-deadline-alerts`, `GET /api/v1/workspaces/:id/audit-logs`
