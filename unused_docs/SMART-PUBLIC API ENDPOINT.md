# SMART Public API Endpoint Reference

Welcome to the comprehensive API reference for the **SMART (Student Monitoring and Reporting Tool)** system. This document provides technical details for all endpoints, including authentication, external system integrations, and core school operations.

## General Information
- **Base URL:** `http://<host>:5001/api`
- **Tailscale Host:** `100.88.55.125`
- **Content-Type:** `application/json`
- **Auth:** All protected endpoints require an `Authorization: Bearer <token>` header.

---

## 1. Authentication
Endpoints for login, user profiles, and session management.

### `POST /auth/login`
Authenticate and receive a JWT token. SMART supports multi-provider login (Local, EnrollPro).

| | |
|---|---|
| **Auth** | None |
| **Success** | `200 OK` |

**Request body:**
```json
{
  "email": "teacher@school.edu.ph",
  "password": "yourpassword"
}
```
> Note: `email` can also be an Employee ID or Username.

**Response:**
```json
{
  "message": "Login successful",
  "token": "<jwt_token>",
  "user": {
    "id": "user-uuid",
    "email": "teacher@school.edu.ph",
    "username": "TEACHER001",
    "role": "TEACHER",
    "firstName": "Juan",
    "lastName": "Dela Cruz"
  }
}
```

### `GET /auth/me`
Return the authenticated user's profile.

| | |
|---|---|
| **Auth** | Required |
| **Success** | `200 OK` |

**Response:**
```json
{
  "id": "user-uuid",
  "username": "TEACHER001",
  "role": "TEACHER",
  "createdAt": "2026-05-11T09:14:31.000Z"
}
```

### `POST /auth/logout`
Invalidate the current session (client-side) and log the audit event.

| | |
|---|---|
| **Auth** | Required |
| **Success** | `200 OK` |

---

## 2. Integration
Connectivity status and proxy data from EnrollPro, ATLAS, and AIMS.

### `GET /integration/status`
Check the health and connectivity status of external systems.

| | |
|---|---|
| **Auth** | Required |
| **Success** | `200 OK` |

**Response:**
```json
{
  "success": true,
  "data": {
    "enrollpro": { "online": true },
    "atlas": { "online": true },
    "aims": { "online": true },
    "checkedAt": "2026-05-14T10:00:00.000Z"
  }
}
```

### `POST /integration/enrollpro-webhook`
Webhook for EnrollPro to notify SMART of data changes. Triggers background sync.

| | |
|---|---|
| **Auth** | `x-api-key` header required |
| **Success** | `200 OK` |

### `GET /integration/enrollpro/my-advisory`
Get the teacher's advisory section and students directly from EnrollPro.

| | |
|---|---|
| **Auth** | Required — `TEACHER` only |
| **Success** | `200 OK` |

### `GET /integration/atlas/my-teaching-load`
Get the teacher's teaching load synced from ATLAS.

| | |
|---|---|
| **Auth** | Required — `TEACHER` only |
| **Success** | `200 OK` |

### `POST /integration/aims/auth`
Authenticate with AIMS using the teacher's AIMS password.

| | |
|---|---|
| **Auth** | Required — `TEACHER` only |
| **Success** | `200 OK` |

---

## 3. Advisory
Teacher advisory sections, student grade profiles, and rankings.

### `GET /advisory/my-advisory`
Get details about the teacher's advisory section and student subjects.

| | |
|---|---|
| **Auth** | Required — `TEACHER` only |
| **Success** | `200 OK` |

### `GET /advisory/student/:studentId/grades`
Get the complete grade profile for a specific student across all subjects.

| | |
|---|---|
| **Auth** | Required — Adviser or Teacher |
| **Success** | `200 OK` |

### `GET /advisory/summary`
Get a summary of the advisory section's performance and rankings.

| | |
|---|---|
| **Auth** | Required — `TEACHER` only |
| **Success** | `200 OK` |

### `POST /advisory/sync`
Manually trigger a re-sync of advisory data from EnrollPro.

---

## 4. Attendance
Daily attendance tracking, section summaries, and SF2 exports.

### `GET /attendance/section/:sectionId?date=YYYY-MM-DD`
Get the attendance status for all students in a section.

| | |
|---|---|
| **Auth** | Required — `TEACHER/ADMIN/REGISTRAR` |
| **Success** | `200 OK` |

### `POST /attendance/bulk`
Save or update attendance records for multiple students.

| | |
|---|---|
| **Auth** | Required — `TEACHER/ADMIN` |
| **Success** | `200 OK` |

**Request body:**
```json
{
  "sectionId": "sec-uuid",
  "date": "2026-05-14",
  "attendance": [
    { "studentId": "stud-uuid", "status": "ABSENT", "remarks": "Sick" }
  ]
}
```

### `GET /attendance/export/:sectionId`
Export attendance to a DepEd SF2 (School Form 2) format Excel file.

---

## 5. Grades
Class records, quarterly grades, ECR imports, and analytics.

### `GET /grades/my-classes`
List all class assignments for the authenticated teacher.

| | |
|---|---|
| **Auth** | Required — `TEACHER` only |
| **Success** | `200 OK` |

### `GET /grades/class-record/:classAssignmentId`
Get the full class record (students and grades) for a specific assignment.

| | |
|---|---|
| **Auth** | Required — `TEACHER` only |
| **Success** | `200 OK` |

### `POST /grades/grade`
Create or update a student's grade for a specific quarter.

| | |
|---|---|
| **Auth** | Required — `TEACHER` only |
| **Success** | `200 OK` |

**Request body:**
```json
{
  "studentId": "stud-uuid",
  "classAssignmentId": "ca-uuid",
  "quarter": "Q1",
  "writtenWorkScores": [{ "name": "WW1", "score": 15, "maxScore": 20 }],
  "perfTaskScores": [{ "name": "PT1", "score": 25, "maxScore": 30 }],
  "quarterlyAssessScore": 40,
  "quarterlyAssessMax": 50
}
```

### `POST /grades/ecr/import`
Import grades from a DepEd ECR Excel file into the SMART database.

---

## 6. Admin
User management, system settings, audit logs, and sync triggers.

### `GET /admin/dashboard`
Get system-wide statistics for the administrator dashboard.

| | |
|---|---|
| **Auth** | Required — `ADMIN` |
| **Success** | `200 OK` |

### `POST /admin/users`
Create a new user account (Admin, Registrar, or Teacher).

| | |
|---|---|
| **Auth** | Required — `ADMIN` |
| **Success** | `201 Created` |

### `PUT /admin/settings`
Update school profile, current school year/quarter, and colors.

| | |
|---|---|
| **Auth** | Required — `ADMIN` |
| **Success** | `200 OK` |

### `GET /admin/logs/export`
Download the full audit trail in CSV format.

---

## 7. Registrar
Student master list, SF9/SF10 generation, and SF1 exports.

### `GET /registrar/students`
List all enrolled students with optional filtering.

| | |
|---|---|
| **Auth** | Required — `REGISTRAR` |
| **Success** | `200 OK` |

### `GET /registrar/forms/sf9/:studentId`
Generate data for **School Form 9 (Progress Report Card)**.

| | |
|---|---|
| **Auth** | Required — `REGISTRAR` |
| **Success** | `200 OK` |

### `GET /registrar/export/sf1/:sectionId`
Export **School Form 1 (School Register)** for an entire section to Excel.

---

## Error Responses

All errors follow a standard format:

```json
{ "success": false, "message": "Error description" }
```

| HTTP Status | Meaning |
|---|---|
| `400` | Bad request — missing or invalid fields |
| `401` | Unauthorized — missing or expired token |
| `403` | Forbidden — insufficient role permissions |
| `404` | Not found |
| `500` | Internal server error |
