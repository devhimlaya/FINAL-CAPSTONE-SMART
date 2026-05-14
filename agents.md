# Codex 5.2 Agent Guide

## Tech Stack
- Language: TypeScript, JavaScript, HTML, CSS
- Frontend: React 19, Vite, React Router, React Query, Tailwind CSS, shadcn/ui
- Backend: Node.js, Express 5, Prisma (PostgreSQL), ts-node-dev
- Tooling: ESLint, TypeScript, Vite, Prisma CLI
- Package manager: npm (package-lock.json)

## Speed & Execution Rules
- Reasoning level: Medium; avoid deep or recursive reasoning loops.
- Prefer one-shot code generation and minimal edits; skip long planning phases.
- Avoid recursive file searches; use direct paths or targeted reads.
- Ask questions only if blocked by missing requirements.

## Coding Standards
- TypeScript: keep types explicit, avoid `any`, use `zod` for validation where applicable.
- React: function components with hooks; avoid class components; keep components small and focused.
- State/data: use existing React Query and Zustand patterns; do not introduce new state libraries.
- Backend: use async/await, validate inputs, keep routes thin, and centralize error handling.
- Prisma: use the Prisma client; avoid raw SQL unless required; use transactions for multi-step writes.

## Boundaries
- Do not refactor unrelated code.
- Do not modify `.env` or `.env.*` files.
- Do not write to external systems (EnrollPro/ATLAS); read-only integrations only.

## Common Commands
- Root (frontend): `npm run dev`, `npm run build`, `npm run lint`, `npm run preview`
- Server (backend, run in `server/`): `npm run dev`, `npm run build`, `npm run start`, `npm run prisma:generate`, `npm run prisma:migrate`, `npm run prisma:push`, `npm run prisma:seed`, `npm run prisma:studio`
- Tests: no `test` script found in package.json
