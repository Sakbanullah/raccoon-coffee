# Raccoon Coffee

A coffee shop website and community platform featuring the Raccoon Wall.

## Project Structure

- `frontend/` - Website UI (Next.js)
- `backend/` - API, business logic, and Prisma ORM
- `docs/` - Architecture and system documentation

## Database

- **Engine:** MySQL or MariaDB
- **Database name:** `raccoon`
- **ORM:** Prisma v6.19.0
- **Source of truth:** `docs/raccoon-database-architecture.md`

## Development Guide

### Terminal 1: Frontend
```bash
cd frontend
npm run dev
```

### Terminal 2: Backend
```bash
cd backend
npm run start:dev
```

### Database Operations (Backend)
```bash
cd backend
npx prisma format
npx prisma validate
npx prisma migrate status
```
