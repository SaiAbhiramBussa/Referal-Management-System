# Deployment Guide

This guide provides step-by-step instructions for deploying the Referral Management System.

## Prerequisites

- Docker and Docker Compose installed
- Git installed
- (Optional) Node.js 20+ for local development

## Quick Start with Docker

### 1. Clone the Repository

```bash
git clone https://github.com/SaiAbhiramBussa/Referal-Management-System.git
cd Referal-Management-System
```

### 2. Start All Services

```bash
docker-compose up --build
```

This will:
- Start PostgreSQL database on port 5432
- Build and start the backend on port 3000
- Build and start the frontend on port 3001
- Run database migrations automatically

### 3. Access the Application

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api/docs

### 4. Create Your First User

1. Open http://localhost:3001
2. Click "Register"
3. Enter your name, email, and password
4. You'll be automatically logged in and redirected to the dashboard

## Local Development Setup

### Backend Development

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start PostgreSQL with Docker
docker run --name postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=referral_db -p 5432:5432 -d postgres:16-alpine

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start development server
npm run start:dev
```

Backend will be available at http://localhost:3000

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > .env.local

# Start development server
npm run dev
```

Frontend will be available at http://localhost:3001

## Testing the System

### 1. Test Authentication

```bash
# Register a new user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 2. Test Ledger API

```bash
# Get balance (replace TOKEN with your JWT token)
curl -X GET http://localhost:3000/ledger/balance \
  -H "Authorization: Bearer TOKEN"

# Get ledger entries
curl -X GET http://localhost:3000/ledger/entries \
  -H "Authorization: Bearer TOKEN"
```

### 3. Test Flow API

```bash
# Create a flow
curl -X POST http://localhost:3000/flows \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome Flow",
    "description": "Sends welcome message to new users",
    "definition": {
      "nodes": [
        {
          "id": "trigger-1",
          "type": "trigger",
          "data": { "label": "User Registered" },
          "position": { "x": 100, "y": 100 }
        },
        {
          "id": "action-1",
          "type": "action",
          "data": { "label": "Send Welcome Email", "actionType": "sendNotification" },
          "position": { "x": 300, "y": 100 }
        }
      ],
      "edges": [
        {
          "id": "e1",
          "source": "trigger-1",
          "target": "action-1"
        }
      ]
    }
  }'
```

### 4. Test Referral API

```bash
# Create a referral
curl -X POST http://localhost:3000/referrals \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "referredEmail": "friend@example.com",
    "referredName": "Friend Name"
  }'

# Get referral stats
curl -X GET http://localhost:3000/referrals/stats \
  -H "Authorization: Bearer TOKEN"
```

## Running Tests

### Backend Tests

```bash
cd backend
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov
```

### Frontend Tests

```bash
cd frontend
npm test
```

## Production Deployment

### Environment Variables

For production, update these environment variables:

**Backend (.env):**
```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"
JWT_SECRET="your-strong-random-secret-min-32-chars"
API_KEY="your-strong-random-api-key"
PORT=3000
FRONTEND_URL="https://your-frontend-domain.com"
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

### Security Checklist

- [ ] Change default JWT_SECRET to a strong random string
- [ ] Change default API_KEY to a strong random string
- [ ] Use strong PostgreSQL password
- [ ] Enable HTTPS/TLS
- [ ] Configure proper CORS settings
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Set up monitoring and logging
- [ ] Use environment-specific configurations
- [ ] Implement proper secret management

### Docker Production Build

```bash
# Build images
docker-compose build

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Database Backup

```bash
# Backup database
docker exec postgres pg_dump -U postgres referral_db > backup.sql

# Restore database
docker exec -i postgres psql -U postgres referral_db < backup.sql
```

## Monitoring

### Health Checks

```bash
# Backend health
curl http://localhost:3000

# Database health
docker exec postgres pg_isready -U postgres
```

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

## Troubleshooting

### Backend won't start

1. Check if PostgreSQL is running: `docker ps | grep postgres`
2. Check backend logs: `docker-compose logs backend`
3. Verify DATABASE_URL in .env file
4. Ensure migrations are run: `docker exec backend npx prisma migrate deploy`

### Frontend can't connect to backend

1. Check NEXT_PUBLIC_API_URL in .env.local
2. Verify backend is running: `curl http://localhost:3000`
3. Check browser console for CORS errors
4. Verify network connectivity between containers

### Database connection issues

1. Check PostgreSQL is running: `docker-compose ps postgres`
2. Verify credentials in DATABASE_URL
3. Check PostgreSQL logs: `docker-compose logs postgres`
4. Test connection: `docker exec postgres psql -U postgres -d referral_db -c "SELECT 1"`

### Build failures

1. Clear node_modules: `rm -rf node_modules package-lock.json`
2. Reinstall dependencies: `npm install`
3. Clear Docker cache: `docker-compose build --no-cache`

## Scaling

### Horizontal Scaling

To scale the backend:

```bash
docker-compose up --scale backend=3
```

Add a load balancer (nginx, HAProxy) in front of backend instances.

### Database Optimization

1. Add database indexes for frequently queried fields
2. Use connection pooling (built-in with Prisma)
3. Consider read replicas for read-heavy workloads
4. Implement caching (Redis) for frequently accessed data

## Support

For issues and questions:
- Check the main README.md
- Review API documentation at /api/docs
- Check logs: `docker-compose logs -f`
- File an issue on GitHub

## License

ISC
