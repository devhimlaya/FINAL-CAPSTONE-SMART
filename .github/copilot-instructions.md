# Copilot Instructions for SMART Capstone

These instructions define how coding tasks should be handled in this repository.

## ⚠️ HIGHEST PRIORITY — External Systems Are Read-Only

**NEVER write to, modify, or delete data on any external system.**
This applies to EnrollPro, ATLAS, and any other integrated third-party database or API.
- Only READ from external systems (GET requests, SELECT queries, integration fetch endpoints).
- Never perform INSERT, UPDATE, DELETE, POST, PUT, or PATCH operations against external systems.
- Never run migration scripts, seed scripts, or any data-mutation code against external databases.
- SMART may only write to its own local database (`smart_db`).
- If a task seems to require writing to an external system, stop and ask the user first.

## User Preferences

- Always implement requests end-to-end when possible. Do not stop at partial setup.
- Keep UI simple, clear, and easy for non-technical users.
- Prefer complete functional flows (create, review, export) instead of one-off pages.
- Do not forget prior task context in the same feature area.

## Attendance and School Forms Rules

- For DepEd School Forms, prefer template-based Excel generation over hardcoded layouts.
- Use uploaded templates from the Template Manager whenever available.
- Keep hardcoded Excel output only as fallback when no active template exists.
- Preserve Excel formatting requirements from user-provided samples.
- If adding new school form exports, wire them into the same template system first.

## Architecture and Maintenance Rules

- Keep backend and frontend in sync for new features.
- When adding a page:
  1. Add the page component.
  2. Add route registration in `src/App.tsx`.
  3. Add navigation entry in the corresponding layout.
- When adding/changing API endpoints, update `API_ENDPOINTS.md` in the same task.
- Reuse existing services/utilities before introducing new patterns.

## Prisma and Database Rules

- If Prisma schema changes:
  1. Run `npx prisma db push`.
  2. Run `npx prisma generate`.
  3. Ensure server is restarted so types are refreshed.
- Do not leave schema changes undocumented.

## Quality Rules

- After code changes, check for TypeScript/build errors and fix relevant issues.
- Keep changes scoped to the request. Avoid unrelated refactors.
- Preserve role-based access checks for protected endpoints.
- Keep API responses consistent with existing project patterns.

## Documentation Rules

- Keep docs practical and actionable.
- Include request/response examples for new endpoints.
- If a feature depends on admin setup (like templates), document setup steps clearly.

## Priority Outcome

For feature work, prioritize:
1. Correct functionality.
2. Easy maintenance.
3. User-friendly workflow.
4. Clear documentation.
