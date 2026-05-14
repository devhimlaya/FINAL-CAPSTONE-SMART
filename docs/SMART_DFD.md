# SMART System — Data Flow Diagram (DFD) Documentation

**System:** SMART (School Management and Academic Records Technology)
**School Level:** Junior High School (Grades 7–10)
**Prepared for:** Capstone Project Documentation
**Date:** May 2026

---

## Table of Contents

1. [What is a DFD?](#1-what-is-a-dfd)
2. [DFD Symbols Used](#2-dfd-symbols-used)
3. [System Overview](#3-system-overview)
4. [Level 0 — Context Diagram](#4-level-0--context-diagram)
5. [Level 1 — Main Processes](#5-level-1--main-processes)
6. [Level 2 — Detailed Process Breakdowns](#6-level-2--detailed-process-breakdowns)
7. [Data Stores Reference](#7-data-stores-reference)
8. [Data Flows Reference](#8-data-flows-reference)
9. [External Entities Reference](#9-external-entities-reference)

---

## 1. What is a DFD?

A **Data Flow Diagram (DFD)** is a graphical representation showing how data moves through a system. It shows:

- **Where** data comes from (external entities / sources)
- **What** happens to data (processes)
- **Where** data is stored (data stores)
- **Where** data goes (external entities / destinations)

DFDs are leveled — starting broad and getting more detailed:

| Level | Name | Purpose |
|-------|------|---------|
| Level 0 | Context Diagram | Shows the entire system as ONE process with all external entities |
| Level 1 | Main DFD | Breaks the system into major processes |
| Level 2 | Sub-process DFD | Breaks each Level 1 process into smaller steps |

---

## 2. DFD Symbols Used

```
[ External Entity ]   — A person, organization, or system OUTSIDE SMART
                        that sends or receives data.

( Process )           — A function/action the system performs on data.
                        Numbered: 1.0, 2.0, 3.0 ...

=== Data Store ===     — Where data is stored (database tables).
                        Labeled: D1, D2, D3 ...

--->                   — Data Flow arrow, labeled with what data moves.
```

---

## 3. System Overview

SMART is a web-based school management system for a Junior High School.
It manages:
- Teachers, Students, Sections, and Subjects
- Grades (per quarter, per subject, DepEd formula)
- Attendance records
- Advisory class management
- DepEd School Form generation (SF1 through SF10)
- ECR (Electronic Class Record) templates

SMART is **read-only** to two external systems:
- **ATLAS** — provides teaching load assignments (which teacher handles which subject in which section)
- **EnrollPro** — provides enrollment data (students, sections, advisory assignments)

SMART **only writes to its own database** (`smart_db`).

---

## 4. Level 0 — Context Diagram

The entire SMART system is represented as a single process. All external entities that interact with it are shown.

```
                        Teaching Load Data
            ┌─────────────────────────────────────────┐
            │   ATLAS                                 │
            │  (External System)                      │
            └──────────────────┬──────────────────────┘
                               │
                    Teacher/Subject/Section
                    Assignment Data
                               │
                               ▼
┌─────────────┐   Login Credentials     ┌─────────────────────────────┐
│   ADMIN     │ ──────────────────────► │                             │
│             │ ◄────────────────────── │                             │
│             │   Reports / Audit Logs  │                             │
│             │   User Lists            │                             │
└─────────────┘                         │                             │
                                        │                             │
┌─────────────┐   Login + Grades        │                             │
│   TEACHER   │ ──────────────────────► │        S M A R T           │
│             │ ◄────────────────────── │                             │
│             │   Class Records         │     (School Management      │
│             │   Grade Computations    │      and Academic Records   │
│             │   Generated Reports     │      Technology)            │
└─────────────┘                         │                             │
                                        │                             │
┌─────────────┐   Report Requests       │                             │
│  REGISTRAR  │   Template Uploads ───► │                             │
│             │ ◄────────────────────── │                             │
│             │   School Forms (SF1-10) └─────────────────────────────┘
└─────────────┘   Student Records                  │
                                                   │
                  Student / Section /              │
                  Enrollment Data                  │
                               ┌───────────────────┘
                               │
                               ▼
            ┌──────────────────────────────────────────┐
            │   EnrollPro                              │
            │  (External Enrollment System)            │
            └──────────────────────────────────────────┘
```

### Context Diagram — External Entity Summary

| External Entity | Role | Data Sent TO SMART | Data Received FROM SMART |
|----------------|------|-------------------|--------------------------|
| **ATLAS** | Teacher assignment system | Teaching loads (teacher-subject-section) | Nothing (read-only) |
| **EnrollPro** | Enrollment system | Students, Sections, Enrollments, Advisers | Nothing (read-only) |
| **Admin** | System administrator | Login, user commands, settings, sync triggers | User list, audit logs, sync status, reports |
| **Teacher** | Class teacher | Login, grades, attendance, ECR upload | Class lists, grade computations, school forms |
| **Registrar** | School registrar | Login, template uploads, report requests | School forms (SF1–SF10), student reports |

---

## 5. Level 1 — Main Processes

This breaks SMART into its 7 main processes. Each process is numbered.

```
═══════════════════════════════════════════════════════════════════════════════
                             SMART — LEVEL 1 DFD
═══════════════════════════════════════════════════════════════════════════════

EXTERNAL                                                            DATA STORES
ENTITIES                       PROCESSES
─────────────────────────────────────────────────────────────────────────────

[ATLAS]      ──── Teaching Load Data ────►  ┌─────────────────┐
                                            │  2.0            │ ──► D6: ClassAssignments
[EnrollPro]  ── Students/Sections/         │  Data           │ ──► D3: Students
              Enrollments ────────────────► │  Synchronization│ ──► D4: Sections
                                            │                 │ ──► D7: Enrollments
                                            └─────────────────┘ ──► D2: Teachers

[ADMIN]      ── Login Credentials ────────► ┌─────────────────┐
[TEACHER]    ── Login Credentials ────────► │  1.0            │ ◄── D1: Users
[REGISTRAR]  ── Login Credentials ────────► │  Authentication │ ──► Session/JWT Token
                                            └─────────────────┘

[TEACHER]    ── Grade Entries ────────────► ┌─────────────────┐
             ◄── Computed Grades ─────────  │  3.0            │ ◄── D6: ClassAssignments
                                            │  Grade          │ ◄── D3: Students
                                            │  Management     │ ──► D8: Grades
                                            └─────────────────┘ ◄── D12: GradingConfig

[TEACHER]    ── Attendance Records ───────► ┌─────────────────┐
             ◄── Attendance Reports ──────  │  4.0            │ ◄── D3: Students
                                            │  Attendance     │ ◄── D4: Sections
                                            │  Management     │ ──► D9: Attendance
                                            └─────────────────┘

[REGISTRAR]  ── Template Uploads ─────────► ┌─────────────────┐
[TEACHER]    ── ECR Template Upload ──────► │  5.0            │ ──► D13: ExcelTemplates
             ◄── Template List ───────────  │  Template       │ ──► D14: ECRTemplates
                                            │  Management     │
                                            └─────────────────┘

[REGISTRAR]  ── Report Request ───────────► ┌─────────────────┐
[TEACHER]    ── Report Request ───────────► │  6.0            │ ◄── D3: Students
             ◄── School Forms (Excel) ────  │  Report         │ ◄── D4: Sections
                                            │  Generation     │ ◄── D8: Grades
                                            └─────────────────┘ ◄── D9: Attendance
                                                                ◄── D13: ExcelTemplates

[ADMIN]      ── Admin Commands ───────────► ┌─────────────────┐
             ◄── System Status ──────────── │  7.0            │ ──► D1: Users
             ◄── Audit Logs ─────────────── │  System Admin   │ ──► D10: AuditLog
                                            │                 │ ──► D11: SystemSettings
                                            └─────────────────┘ ──► D12: GradingConfig
```

---

## 6. Level 2 — Detailed Process Breakdowns

### Process 1.0 — Authentication (Detail)

```
                    ┌───────────────────────────────────────────┐
                    │           1.0 AUTHENTICATION              │
                    └───────────────────────────────────────────┘

 [User: Admin/          Credentials          ┌─────────────────────┐
  Teacher/Registrar]  ──────────────────────► │ 1.1                 │
                                              │ Validate            │◄── D1: Users
                                              │ Credentials         │
                                              └──────────┬──────────┘
                                                         │
                                              ┌──────────▼──────────┐
                                              │ 1.2                 │
                                              │ Generate JWT        │──► JWT Token
                                              │ Token               │    (to user session)
                                              └──────────┬──────────┘
                                                         │
                                              ┌──────────▼──────────┐
                                              │ 1.3                 │
                                              │ Log Login           │──► D10: AuditLog
                                              │ Activity            │
                                              └─────────────────────┘
```

**Data involved:**
- Input: `username`, `password`, `role` (Teacher / Admin / Registrar login pages)
- Process: bcrypt password verification
- Output: JWT Bearer token, session context
- Stored in: `D1: Users` (lookup), `D10: AuditLog` (write)

---

### Process 2.0 — Data Synchronization (Detail)

```
                    ┌─────────────────────────────────────────────┐
                    │           2.0 DATA SYNCHRONIZATION          │
                    └─────────────────────────────────────────────┘

 [ATLAS]     ─── Faculty Assignments ───► ┌──────────────────────┐
                                          │ 2.1                  │
                                          │ Sync Teaching Loads  │──► D2: Teachers
                                          │ (atlasSync.ts)       │──► D5: Subjects
                                          │                      │──► D4: Sections
                                          │                      │──► D6: ClassAssignments
                                          └──────────────────────┘

 [EnrollPro] ─── Faculty with Sections ─► ┌──────────────────────┐
             ─── Students + LRN ────────► │ 2.2                  │
             ─── Section + Grade Level ─► │ Sync Enrollment Data │──► D2: Teachers (match)
                                          │ (enrollproSync.ts)   │──► D4: Sections
                                          │                      │──► D3: Students
                                          │                      │──► D7: Enrollments
                                          └──────────────────────┘

 [Admin]     ─── Manual Sync Trigger ──► ┌──────────────────────┐
                                          │ 2.3                  │
                                          │ Record Sync Status   │──► D10: AuditLog
                                          │                      │◄── D11: SystemSettings
                                          └──────────────────────┘
```

**Key Rules:**
- Sync runs automatically every 30 minutes
- Admin can manually trigger sync via the admin dashboard
- SMART **never writes back** to ATLAS or EnrollPro
- ATLAS sync uses school_year_id = 8 (2026–2027)

---

### Process 3.0 — Grade Management (Detail)

```
                    ┌─────────────────────────────────────────────┐
                    │           3.0 GRADE MANAGEMENT             │
                    └─────────────────────────────────────────────┘

 [Teacher]  ─── Written Work Scores ────► ┌──────────────────────┐
            ─── Performance Task Scores ► │ 3.1                  │
            ─── Quarterly Assessment ───► │ Record Scores        │──► D8: Grades
                                          │                      │◄── D6: ClassAssignments
                                          └──────────────────────┘

            ◄── Computed Grade ─────────  ┌──────────────────────┐
                                          │ 3.2                  │◄── D8: Grades
                                          │ Compute Quarterly    │◄── D12: GradingConfig
                                          │ Grade (DepEd Formula)│
                                          │  WW%+PT%+QA% = 100%  │
                                          └──────────────────────┘

            ◄── Class Record Excel ─────  ┌──────────────────────┐
                                          │ 3.3                  │◄── D8: Grades
                                          │ Generate Class       │◄── D14: ECRTemplates
                                          │ Record (ECR)         │◄── D3: Students
                                          └──────────────────────┘
```

**DepEd Grading Formula:**
- Written Work: 30% (default, configurable per subject type)
- Performance Task: 50% (default)
- Quarterly Assessment: 20% (default)
- Subject types: CORE, MAPEH, TLE, MATH_SCIENCE — each may have different weights

---

### Process 4.0 — Attendance Management (Detail)

```
                    ┌─────────────────────────────────────────────┐
                    │        4.0 ATTENDANCE MANAGEMENT           │
                    └─────────────────────────────────────────────┘

 [Teacher]  ─── Student ID + Date + Status ► ┌──────────────────────┐
                                              │ 4.1                  │◄── D4: Sections
                                              │ Record Attendance    │◄── D3: Students
                                              │ (Present/Absent/     │──► D9: Attendance
                                              │  Late/Excused)       │
                                              └──────────────────────┘

            ◄── Attendance Summary ────────── ┌──────────────────────┐
            ◄── SF2 / SF4 Reports ──────────── │ 4.2                  │◄── D9: Attendance
                                              │ Generate Attendance  │◄── D3: Students
                                              │ Reports              │◄── D4: Sections
                                              └──────────────────────┘
```

---

### Process 5.0 — Template Management (Detail)

```
                    ┌─────────────────────────────────────────────┐
                    │        5.0 TEMPLATE MANAGEMENT             │
                    └─────────────────────────────────────────────┘

 [Registrar] ─── Excel SF Template (.xlsx) ► ┌──────────────────────┐
                                              │ 5.1                  │
                                              │ Upload & Parse       │──► D13: ExcelTemplates
                                              │ SF Template          │    (SF1–SF10)
                                              │ (detect placeholders)│
                                              └──────────────────────┘

 [Teacher]  ─── ECR Template (.xlsx) ──────► ┌──────────────────────┐
                                              │ 5.2                  │
                                              │ Upload ECR Template  │──► D14: ECRTemplates
                                              │ (Class Record format)│
                                              └──────────────────────┘
```

---

### Process 6.0 — Report Generation (Detail)

```
                    ┌─────────────────────────────────────────────┐
                    │        6.0 REPORT GENERATION               │
                    └─────────────────────────────────────────────┘

 [Teacher/     ── Request SF Form ────────► ┌──────────────────────┐
  Registrar]                                │ 6.1                  │◄── D13: ExcelTemplates
                                            │ Load Template        │
                                            │                      │
                                            └──────────┬───────────┘
                                                       │
                                            ┌──────────▼───────────┐
                                            │ 6.2                  │◄── D3: Students
                                            │ Populate Template    │◄── D4: Sections
                                            │ with Real Data       │◄── D8: Grades
                                            │ (inject-placeholders)│◄── D9: Attendance
                                            └──────────┬───────────┘◄── D11: SystemSettings
                                                       │
            ◄── Generated Excel File ────── ┌──────────▼───────────┐
                                            │ 6.3                  │
                                            │ Download/Export      │
                                            │ School Form          │
                                            └──────────────────────┘
```

**Supported School Forms:**

| Form | Name | Main Data Source |
|------|------|-----------------|
| SF1 | School Register | Students, Enrollment |
| SF2 | Daily Attendance Register | Attendance |
| SF3 | Book of Accounts | Grades |
| SF4 | Monthly Attendance | Attendance |
| SF5 | Report on Promotion | Grades |
| SF6 | Summarized Report on Promotion | Grades |
| SF7 | Homeroom Guidance Monitoring | Advisory |
| SF8 | Summary of Learner's Time | Attendance |
| SF9 | Report Card | Grades |
| SF10 | Permanent Record | All data |

---

### Process 7.0 — System Administration (Detail)

```
                    ┌─────────────────────────────────────────────┐
                    │        7.0 SYSTEM ADMINISTRATION           │
                    └─────────────────────────────────────────────┘

 [Admin]  ─── Create/Update/Disable User ► ┌──────────────────────┐
          ◄── User List ─────────────────── │ 7.1                  │──► D1: Users
                                            │ User Management      │──► D2: Teachers
                                            └──────────────────────┘

 [Admin]  ─── Update Settings ───────────► ┌──────────────────────┐
          ◄── Current Settings ─────────── │ 7.2                  │──► D11: SystemSettings
                                            │ School Settings      │──► D12: GradingConfig
                                            │ (school year, colors)│
                                            └──────────────────────┘

 [Admin]  ◄── View Audit Logs ─────────── ┌──────────────────────┐
                                            │ 7.3                  │◄── D10: AuditLog
                                            │ Audit & Monitoring   │
                                            └──────────────────────┘

 [Admin]  ─── Trigger Sync ─────────────► ┌──────────────────────┐
          ◄── Sync Status ──────────────── │ 7.4                  │◄── (ATLAS)
                                            │ Integration Control  │◄── (EnrollPro)
                                            └──────────────────────┘
```

---

## 7. Data Stores Reference

These are all the database tables (from `schema.prisma`) that SMART uses internally.

| ID | Data Store | Table Name | Description |
|----|-----------|------------|-------------|
| D1 | Users | `User` | Login credentials, role (Admin / Teacher / Registrar) |
| D2 | Teachers | `Teacher` | Teacher profile, linked to User, employeeId |
| D3 | Students | `Student` | Student info: LRN, name, gender, guardian |
| D4 | Sections | `Section` | Section: name, grade level, school year, adviser |
| D5 | Subjects | `Subject` | Subject: code, name, type, grading weights |
| D6 | Class Assignments | `ClassAssignment` | Teacher–Subject–Section link per school year |
| D7 | Enrollments | `Enrollment` | Student enrolled in a section for a school year |
| D8 | Grades | `Grade` | Per-student, per-assignment, per-quarter grades and scores |
| D9 | Attendance | `Attendance` | Daily attendance records per student per section |
| D10 | Audit Log | `AuditLog` | All significant system actions for compliance |
| D11 | System Settings | `SystemSettings` | School name, current school year/quarter, colors |
| D12 | Grading Config | `GradingConfig` | DepEd-compliant component weights per subject type |
| D13 | Excel Templates | `ExcelTemplate` | Uploaded SF1–SF10 Excel template files |
| D14 | ECR Templates | `ECRTemplate` | Uploaded ECR (Electronic Class Record) template files |

---

## 8. Data Flows Reference

| # | From | To | Data Description |
|---|------|----|-----------------|
| F1 | ATLAS | Process 2.1 | Faculty assignments: teacher ID, subject, section, school year |
| F2 | EnrollPro | Process 2.2 | Students (LRN, name, gender), sections, enrollments, adviser mapping |
| F3 | Admin/Teacher/Registrar | Process 1.1 | Username, password, intended role |
| F4 | Process 1.2 | User browser | JWT token for session authorization |
| F5 | Teacher | Process 3.1 | Written work scores, performance task scores, quarterly assessment score |
| F6 | Process 3.2 | Teacher browser | Computed quarterly grade using DepEd formula |
| F7 | Teacher | Process 4.1 | Student ID, date, attendance status (Present/Absent/Late/Excused) |
| F8 | Registrar | Process 5.1 | Excel (.xlsx) SF template with placeholders |
| F9 | Teacher | Process 5.2 | Excel (.xlsx) ECR template |
| F10 | Teacher/Registrar | Process 6.1–6.3 | Form type request, section/school year parameters |
| F11 | Process 6.3 | Teacher/Registrar | Downloaded Excel file with real populated data |
| F12 | Admin | Process 7.1 | New user data or role change command |
| F13 | Admin | Process 7.2 | Updated school settings (school year, quarter dates, grading config) |
| F14 | Process 7.3 | Admin | Filtered audit log entries |
| F15 | Admin | Process 7.4 | Manual sync trigger command |
| F16 | All Processes | D10: AuditLog | Action, user, target, severity, timestamp |

---

## 9. External Entities Reference

| Entity | Type | Interaction |
|--------|------|-------------|
| **ATLAS** | External System | Auto-synced every 30 min. Provides teaching load data. SMART reads only. |
| **EnrollPro** | External System | Auto-synced every 30 min. Provides student/enrollment data. SMART reads only. |
| **Admin** | Human User | Manages users, school settings, grading config, monitors system, triggers syncs |
| **Teacher** | Human User | Records grades and attendance, views class lists, exports class records |
| **Registrar** | Human User | Uploads SF templates, generates and exports DepEd school forms |

---

## Architecture Notes for Documentation

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (via Prisma ORM) |
| Auth | JWT Bearer Tokens |
| Excel | xlsx-populate (template-based generation) |
| Network | Tailscale VPN (for ATLAS/EnrollPro access) |

### Data Flow Constraints

1. **ATLAS is READ-ONLY** — SMART never sends data back to ATLAS
2. **EnrollPro is READ-ONLY** — SMART never sends data back to EnrollPro
3. **All writes go to `smart_db`** — the local PostgreSQL database only
4. **Sync is scheduled + manual** — every 30 minutes automatically, or via admin trigger
5. **Role-based access** — each user type (Admin/Teacher/Registrar) sees only their authorized pages and data

### Roles and Permissions Summary

| Role | Can Do |
|------|--------|
| **Admin** | Manage users, configure system, monitor audit logs, trigger external syncs |
| **Teacher** | View assigned classes, enter/edit grades, take attendance, export class records |
| **Registrar** | Upload SF templates, generate all school forms, view all student/section data |

---

*This document was generated from a live scan of the SMART system's database schema (`schema.prisma`), server entry point (`index.ts`), route definitions, and sync service files.*
