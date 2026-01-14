# Referral Management System

This repository contains a production-grade implementation of the **Referral Reward Ledger + Rule-Based Flow Builder** for PineOS.ai. The system features a money-safe reward ledger using double-entry accounting and a visual rule-based flow engine with a drag-and-drop builder.

## 🏗️ Architecture

### Tech Stack

**Backend:**
- Node.js 20 LTS with TypeScript
- NestJS framework
- Prisma ORM
- PostgreSQL database
- JWT authentication
- OpenAPI/Swagger documentation
- Zod validation
- Jest testing

**Frontend:**
- Next.js 15 with TypeScript
- React Flow for visual flow builder
- TailwindCSS for styling
- Axios for API communication
- Zustand for state management

**DevOps:**
- Docker & Docker Compose
- PostgreSQL container
- Multi-stage builds

## 📋 Features

### 1. Reward Ledger (Double-Entry Accounting)
- ✅ Double-entry bookkeeping system
- ✅ Money-safe transaction recording
- ✅ Account balance tracking
- ✅ Transaction history with pagination
- ✅ Support for multiple account types (ASSET, LIABILITY, EQUITY)

### 2. Rule-Based Flow Builder
- ✅ Visual flow builder with React Flow
- ✅ Drag-and-drop interface
- ✅ Multiple node types: Trigger, Condition, Action, Delay
- ✅ Flow execution engine
- ✅ Execution history tracking
- ✅ Conditional branching support

### 3. Referral Management
- ✅ Create and track referrals
- ✅ Unique referral codes
- ✅ Automatic reward distribution
- ✅ Referral statistics dashboard
- ✅ Referral status tracking (PENDING, COMPLETED, REWARDED)

### 4. Authentication & Security
- ✅ JWT-based authentication
- ✅ API key support
- ✅ Password hashing with bcrypt
- ✅ Protected routes and endpoints

### 5. API Documentation
- ✅ OpenAPI/Swagger documentation
- ✅ Interactive API explorer
- ✅ Available at `/api/docs`

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL (if running locally without Docker)

### Option 1: Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/SaiAbhiramBussa/Referal-Management-System.git
cd Referal-Management-System
```

2. Start all services:
```bash
docker-compose up --build
```

3. Access the application:
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- API Documentation: http://localhost:3000/api/docs

### Option 2: Local Development

#### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Start PostgreSQL (if not using Docker):
```bash
# Using Docker for PostgreSQL only
docker run --name postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=referral_db -p 5432:5432 -d postgres:16-alpine
```

5. Run database migrations:
```bash
npm run prisma:generate
npm run prisma:migrate
```

6. Start the backend:
```bash
npm run start:dev
```

#### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > .env.local
```

4. Start the frontend:
```bash
npm run dev
```

## 📖 API Documentation

Once the backend is running, visit http://localhost:3000/api/docs for interactive API documentation.

### Key Endpoints

**Authentication:**
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user

**Ledger:**
- `GET /ledger/balance` - Get account balances
- `GET /ledger/entries` - Get ledger entries
- `POST /ledger/entries` - Create ledger entry

**Flows:**
- `GET /flows` - List all flows
- `POST /flows` - Create new flow
- `GET /flows/:id` - Get flow details
- `PUT /flows/:id` - Update flow
- `DELETE /flows/:id` - Delete flow
- `POST /flows/:id/execute` - Execute flow
- `GET /flows/:id/executions` - Get execution history

**Referrals:**
- `POST /referrals` - Create referral
- `POST /referrals/complete` - Complete referral with code
- `GET /referrals/my` - Get user's referrals
- `GET /referrals/stats` - Get referral statistics

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm test                 # Run all tests
npm run test:watch      # Watch mode
npm run test:cov        # Coverage report
```

### Running Specific Tests

```bash
npm test -- auth.service.spec.ts
npm test -- ledger.service.spec.ts
```

## 🏛️ Database Schema

### Key Models

**User** - User accounts with authentication
**Account** - Financial accounts (double-entry system)
**LedgerEntry** - Transaction records (debit/credit)
**Referral** - Referral tracking
**Flow** - Flow definitions
**FlowExecution** - Flow execution history

See `backend/prisma/schema.prisma` for complete schema.

## 🔧 Development

### Database Management

```bash
cd backend

# Generate Prisma client
npm run prisma:generate

# Create migration
npx prisma migrate dev --name migration_name

# View database in Prisma Studio
npm run prisma:studio
```

### Building for Production

```bash
# Backend
cd backend
npm run build
npm run start:prod

# Frontend
cd frontend
npm run build
npm start
```

## 🐳 Docker Commands

```bash
# Build and start all services
docker-compose up --build

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## 📁 Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── auth/          # Authentication module
│   │   ├── ledger/        # Double-entry ledger
│   │   ├── flow/          # Flow builder & executor
│   │   ├── referral/      # Referral management
│   │   ├── prisma/        # Prisma service
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── dashboard/     # Dashboard page
│   │   ├── flow-builder/  # Flow builder UI
│   │   └── page.tsx       # Login/Register
│   ├── components/
│   │   └── flow/          # Flow components
│   ├── lib/
│   │   └── api.ts         # API client
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## 🔒 Security Considerations

- JWT tokens for authentication
- Password hashing with bcrypt
- Environment variable configuration
- API key authentication support
- Input validation with Zod
- SQL injection protection via Prisma

## 🚦 Production Deployment

1. Update environment variables in `.env` files
2. Use strong secrets for `JWT_SECRET` and `API_KEY`
3. Configure proper CORS settings
4. Set up SSL/TLS certificates
5. Use production database credentials
6. Enable logging and monitoring
7. Set up backup strategies for PostgreSQL

## 📝 License

ISC

## 👨‍💻 Author

Sai Abhiram Bussa

## 🙏 Acknowledgments

Built for PineOS.ai Take-Home Challenge
