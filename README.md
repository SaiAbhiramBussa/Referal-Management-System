# Referral Management System

This repository contains a comprehensive implementation of a Referral Management System with two core components:
1. **Financial Ledger System** - An immutable, audit-friendly, user-level financial ledger for referral rewards
2. **Rule-Based Flow Builder** - A visual rule engine for building referral reward logic

## Screenshots

### Flow Builder UI
![Flow Builder with Nodes](https://github.com/user-attachments/assets/1cf27c27-17e4-4470-8e6e-27647a1df1ae)

*Visual flow builder with Start, Condition, Action, and End nodes connected in a workflow*

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Setup Instructions](#setup-instructions)
- [Data Model](#data-model)
- [API Documentation](#api-documentation)
- [Correctness Guarantees](#correctness-guarantees)
- [Rule Engine](#rule-engine)
- [Next Steps](#next-steps)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ┌─────────────────┐  ┌────────────────┐  ┌──────────────┐ │
│  │   Flow Canvas   │  │    Sidebar     │  │ JSON Preview │ │
│  │  (React Flow)   │  │   (Editor)     │  │   (Export)   │ │
│  └─────────────────┘  └────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend (NestJS)                        │
│  ┌─────────────────┐  ┌────────────────┐  ┌──────────────┐ │
│  │ Rewards Module  │  │ Ledger Module  │  │ Rules Module │ │
│  │  - Credit       │  │  - Entries     │  │  - Create    │ │
│  │  - Reverse      │  │  - Balance     │  │  - Evaluate  │ │
│  │  - Confirm      │  │  - Pagination  │  │  - Versioning│ │
│  │  - Pay          │  │                │  │              │ │
│  └─────────────────┘  └────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     PostgreSQL Database                      │
│  ┌──────────┐ ┌──────────┐ ┌─────────────────┐ ┌─────────┐ │
│  │  users   │ │  rewards │ │ ledger_entries  │ │  rules  │ │
│  └──────────┘ └──────────┘ └─────────────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Setup Instructions

### Prerequisites
- Node.js 20+
- Docker and Docker Compose
- PostgreSQL (if running without Docker)

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/SaiAbhiramBussa/Referal-Management-System.git
cd Referal-Management-System

# Start all services
docker-compose up -d

# Access the applications
# Backend API: http://localhost:3000
# API Docs (Swagger): http://localhost:3000/api/docs
# Frontend: http://localhost:3001
```

### Manual Setup

#### Backend
```bash
cd backend

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database credentials

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed the database
npm run seed

# Start the server
npm run start:dev
```

#### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Data Model

### Users
```sql
users(id UUID PK, email UNIQUE, createdAt)
```

### Rewards
```sql
rewards(
  id UUID PK,
  referrerId FK → users,
  referredId FK → users,
  amount DECIMAL(18,2),
  currency VARCHAR DEFAULT 'INR',
  status ENUM(PENDING, CONFIRMED, PAID, REVERSED),
  idempotencyKey VARCHAR UNIQUE,
  metadata JSONB,
  createdAt, updatedAt
)
```

### Ledger Entries (Append-Only)
```sql
ledger_entries(
  id UUID PK,
  userId FK → users,
  rewardId FK → rewards NULLABLE,
  type ENUM(CREDIT, DEBIT, REVERSAL),
  amount DECIMAL(18,2),
  currency VARCHAR,
  status ENUM(POSTED, VOID),
  reversalOfEntryId UUID UNIQUE NULLABLE,  -- Prevents double reversal
  metadata JSONB,
  createdAt
)
```

### Idempotency Keys
```sql
idempotency_keys(
  key VARCHAR PK UNIQUE,
  requestHash VARCHAR,
  response JSONB,
  createdAt
)
```

### Rules
```sql
rules(
  id UUID PK,
  name VARCHAR,
  version INT,
  conditions JSONB,
  actions JSONB,
  isActive BOOLEAN,
  metadata JSONB,
  createdAt, updatedAt,
  UNIQUE(name, version)
)
```

## API Documentation

### Rewards API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/rewards/credit` | POST | Create reward with CREDIT ledger entry (idempotent) |
| `/rewards/reverse` | POST | Reverse a ledger entry |
| `/rewards/confirm` | POST | Confirm a PENDING reward |
| `/rewards/pay` | POST | Pay a CONFIRMED reward |
| `/rewards/:id` | GET | Get reward by ID |

### Ledger API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ledger/:userId` | GET | Get user's ledger entries (paginated) |
| `/ledger/:userId/balance` | GET | Get user's current balance |

### Rules API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/rules` | POST | Create a new rule |
| `/rules` | GET | Get all rules |
| `/rules/:id` | GET | Get rule by ID |
| `/rules/:id` | PUT | Update rule (creates new version) |
| `/rules/evaluate` | POST | Evaluate event against rules |

Full Swagger documentation available at `/api/docs`.

## Correctness Guarantees

### 1. Idempotency
- Every reward creation uses an `idempotencyKey`
- On retry, same request returns same response
- Different parameters with same key throws `ConflictException`

```typescript
// Idempotency verification
const hash = sha256(JSON.stringify({referrerId, referredId, amount, currency}));
if (existingKey.requestHash !== hash) {
  throw new ConflictException();
}
```

### 2. Ledger Immutability
- Ledger entries are **append-only** - never updated or deleted
- Reversals create new entries referencing the original
- Database has no UPDATE/DELETE triggers on ledger_entries

### 3. Double Reversal Prevention
- `reversalOfEntryId` has UNIQUE constraint
- Attempting to reverse an already-reversed entry fails

```sql
-- Unique constraint prevents double reversal
reversalOfEntryId UUID UNIQUE NULLABLE
```

### 4. Valid Status Transitions
```
PENDING → CONFIRMED → PAID
    ↘         ↘
      REVERSED   REVERSED
```

Invalid transitions throw `BadRequestException`.

### 5. Transactional Correctness
- All multi-step operations use Prisma transactions
- Reward creation + ledger entry is atomic
- Failure in any step rolls back the entire transaction

### 6. Safe Money Handling
- Using `Decimal.js` for all currency calculations
- Database stores DECIMAL(18,2) for precision
- No floating-point arithmetic

## Rule Engine

### Rule Format (JSON AST)
```json
{
  "name": "referral_subscription_reward",
  "conditions": {
    "type": "AND",
    "children": [
      { "type": "CONDITION", "field": "referrer.status", "operator": "=", "value": "paid" },
      { "type": "CONDITION", "field": "referred.subscribed", "operator": "=", "value": true }
    ]
  },
  "actions": [
    { "type": "createReward", "params": { "amount": 500, "currency": "INR", "type": "voucher" } }
  ]
}
```

### Supported Operators
- `=` (equals)
- `!=` (not equals)
- `>`, `<`, `>=`, `<=` (comparison)
- `in`, `not_in` (array membership)
- `exists` (field existence)
- `contains` (string contains)

### Action Types
- `createReward` - Create a reward
- `setRewardStatus` - Update reward status
- `issueVoucher` - Issue a voucher
- `sendNotification` - Send notification

### Versioning
- Rules are versioned automatically
- Creating a rule with existing name increments version
- Historical versions are preserved

## Next Steps

### Short-term
- [ ] Add batch processing for bulk reward creation
- [ ] Implement rate limiting on API endpoints
- [ ] Add audit logging with user tracking
- [ ] Create admin dashboard for monitoring

### Medium-term
- [ ] Implement webhook notifications for status changes
- [ ] Add support for multiple currencies with exchange rates
- [ ] Build reporting and analytics dashboard
- [ ] Add A/B testing for rule variations

### Long-term
- [ ] Machine learning for fraud detection
- [ ] Real-time rule evaluation with streaming
- [ ] Multi-tenant support
- [ ] GraphQL API layer

## License

ISC
