# Project Setup Guide - Step by Step

## Prerequisites
- Node.js 20+ installed
- Docker Desktop installed and running
- Git installed

## Step 1: Install Backend Dependencies

```bash
cd backend
npm install
```

## Step 2: Generate Prisma Client

```bash
cd backend
npx prisma generate
```

## Step 3: Install Frontend Dependencies

```bash
cd frontend
npm install
```

## Step 4: Configure Database

1. Ensure PostgreSQL is installed and running locally.
2. Create a database named `referral_ledger`.
3. Update `backend/.env` with your credentials:
   ```
   DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/referral_ledger?schema=public
   ```


## Step 5: Run Database Migrations

```bash
cd backend
npx prisma migrate dev --name init
```

## Step 6: Seed Sample Data

```bash
cd backend
npm run prisma:seed
```

## Step 7: Start Backend Server

```bash
cd backend
npm run start:dev
```

Backend will be available at: http://localhost:3001/api
Swagger docs at: http://localhost:3001/api/docs

## Step 8: Start Frontend (New Terminal)

```bash
cd frontend
npm run dev
```

Frontend will be available at: http://localhost:3000

## Troubleshooting

### IDE Shows "Cannot find module" Errors
These are false positives. The actual code compiles fine. To fix IDE:
1. Press `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
2. Or close and reopen the files

### Database Connection Failed
### Database Connection Failed
Ensure PostgreSQL service is running locally and the credentials in `backend/.env` are correct.
```bash
# Check if port 5432 is listening
netstat -an | findstr 5432
```

### Prisma Client Not Found
Regenerate:
```bash
cd backend
npx prisma generate
```
