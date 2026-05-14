# SMART - Student Management and Records Tracking

A full-stack web application for managing student grades and academic records built with React, Express, and Prisma.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Node.js + Express + Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: JWT

## Prerequisites

Before running this application, make sure you have installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [PostgreSQL](https://www.postgresql.org/download/) (v14 or higher)
- npm or yarn package manager

## Getting Started

### 1. Clone and Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 2. Database Setup

Create a PostgreSQL database for the application:

```sql
CREATE DATABASE smart_db;
```

Create a `.env` file in the `server` folder with your database credentials:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/smart_db"
JWT_SECRET="your-secret-key-here-change-in-production"
PORT=3000
```

Replace `username` and `password` with your PostgreSQL credentials.

### 3. Initialize Database

Run Prisma migrations to create the database schema:

```bash
cd server
npm run prisma:generate
npm run prisma:push
```

(Optional) Seed the database with sample data:

```bash
npm run prisma:seed
cd ..
```

### 4. Run the Application

You'll need **two terminal windows** to run both servers:

**Terminal 1 - Backend Server:**
```bash
cd server
npm run dev
```
The backend API will run on `http://localhost:3000`

**Terminal 2 - Frontend Development Server:**
```bash
npm run dev
```
The frontend will run on `http://localhost:5173`

### 5. Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

## Available Scripts

### Frontend (Root Directory)

- `npm run dev` - Start the Vite development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build locally

### Backend (Server Directory)

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:push` - Push schema changes to database
- `npm run prisma:seed` - Seed database with initial data
- `npm run prisma:studio` - Open Prisma Studio (database GUI)

## Project Structure

```
├── src/                    # Frontend source code
│   ├── components/        # React components
│   ├── pages/            # Page components
│   ├── layouts/          # Layout components
│   └── lib/              # Utility functions
├── server/               # Backend source code
│   ├── src/             # Express server code
│   ├── prisma/          # Database schema and migrations
│   └── middleware/      # Express middleware
└── public/              # Static assets
```

## Default Login Credentials

After seeding the database, you can use these credentials to log in:

- **Username**: (check `server/prisma/seed.ts` for default users)
- **Password**: (check `server/prisma/seed.ts` for default passwords)

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Verify your `DATABASE_URL` in `.env` is correct
- Check that the database exists

### Port Already in Use
- Frontend default port: 5173
- Backend default port: 3000
- Change ports in `vite.config.ts` or `.env` if needed

### Prisma Issues
```bash
cd server
npm run prisma:generate
npm run prisma:push
```

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
