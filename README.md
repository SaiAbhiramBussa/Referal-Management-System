# Referral Reward Ledger + Rule-Based Flow Builder

A production-grade take-home project implementing a money-safe reward ledger and a rule-based referral flow engine with a visual builder.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Frontend                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │           React Flow Visual Builder (Next.js + TailwindCSS)      │   │
│  │  ┌──────────┐  ┌─────────────┐  ┌──────────┐  ┌───────────────┐ │   │
│  │  │ Start    │──│  Condition  │──│  Action  │──│     End       │ │   │
│  │  │ Node     │  │   Node      │  │  Node    │  │     Node      │ │   │
│  │  └──────────┘  └─────────────┘  └──────────┘  └───────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              Backend                                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────────┐ │
│  │    Rewards     │  │    Ledger      │  │         Rules              │ │
│  │    Module      │  │    Module      │  │         Module             │ │
│  │                │  │                │  │                            │ │
│  │  • Credit      │  │  • Append-only │  │  • JSON AST Conditions     │ │
│  │  • Confirm     │  │  • Immutable   │  │  • Versioned Rules         │ │
│  │  • Pay         │  │  • Reversal    │  │  • Event Evaluation        │ │
│  │  • Reverse     │  │  • Audit Trail │  │                            │ │
│  └────────────────┘  └────────────────┘  └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           PostgreSQL                                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  ┌───────────────────┐  │
│  │  users   │  │  rewards │  │ ledger_entries│  │ idempotency_keys  │  │
│  └──────────┘  └──────────┘  └───────────────┘  └───────────────────┘  │
│                              ┌───────────────┐                          │
│                              │     rules     │                          │
│                              └───────────────┘                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ (for local development)



**Services:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- Swagger Docs: http://localhost:3001/api/docs

### Local Development

#### Backend
```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed data
npm run prisma:seed

# Start dev server
npm run start:dev
```

#### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

## 📚 API Documentation

### Swagger UI
Access interactive API docs at: http://localhost:3001/api/docs

### Core Endpoints

#### Rewards
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/rewards/credit` | Create idempotent reward + CREDIT entry |
| `POST` | `/api/rewards/confirm` | PENDING → CONFIRMED |
| `POST` | `/api/rewards/pay` | CONFIRMED → PAID + DEBIT entry |
| `POST` | `/api/rewards/reverse` | Reverse reward + REVERSAL entry |
| `GET` | `/api/rewards/:id` | Get reward details |
| `GET` | `/api/rewards` | List all rewards |

#### Ledger
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ledger/:userId` | Get user's ledger (paginated) |
| `GET` | `/api/ledger/:userId/balance` | Get user's balance |
| `GET` | `/api/ledger/entry/:id` | Get ledger entry |

#### Rules
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/rules` | Create versioned rule |
| `GET` | `/api/rules` | List all rules |
| `POST` | `/api/rules/evaluate` | Evaluate event against rules |
| `GET` | `/api/rules/example` | Create sample rule |

## 🏦 Data Model

### Reward Status Transitions
```
PENDING ──┬── confirm() ──► CONFIRMED ──► pay() ──► PAID
          │
          └── reverse() ──► REVERSED (also from CONFIRMED)
```

### Ledger Entry Types
- **CREDIT**: Amount added to user balance
- **DEBIT**: Amount removed (on payout)
- **REVERSAL**: Reverses a previous entry

## ✅ Correctness Guarantees

### 1. Idempotency
Every reward creation request includes an `idempotencyKey`. Duplicate requests return the cached result:
```bash
# First request
curl -X POST /api/rewards/credit -d '{"idempotencyKey": "abc123", ...}'
# Returns: {reward: {...}, ledgerEntry: {...}}

# Retry with same key
curl -X POST /api/rewards/credit -d '{"idempotencyKey": "abc123", ...}'
# Returns: Same result (no duplicates created)
```

### 2. Immutable Ledger
- Ledger entries have **NO updatedAt** field
- No UPDATE/DELETE operations exposed via API
- Only status can change to VOID (for reversals)

### 3. Double Reversal Prevention
```sql
-- Unique constraint in schema
reversalOfEntryId String? @unique
```
Attempting to reverse the same entry twice returns an error.

### 4. Safe Money Handling
- Uses `Decimal.js` for all calculations
- PostgreSQL `DECIMAL(19,4)` for storage
- No floating-point math

### 5. Transactional Integrity
All reward operations use Prisma transactions:
```typescript
await this.prisma.$transaction(async (tx) => {
  // Create reward
  // Create ledger entry
  // Store idempotency key
});
```

## 🔄 Reversal Logic

1. Original CREDIT entry is marked as `VOID`
2. New REVERSAL entry is created referencing original
3. Reward status transitions to `REVERSED`
4. Unique constraint prevents double reversal

```typescript
// Simplified flow
const reversalEntry = await ledgerService.reverseEntry(creditEntryId);
// Original: status = VOID
// New: type = REVERSAL, reversalOfEntryId = creditEntryId
```

## 🧪 Testing

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e
```

### Test Coverage
- ✅ Idempotency verification
- ✅ Reversal safety
- ✅ Double reversal prevention
- ✅ Ledger immutability
- ✅ Status transition validation
- ✅ Rule evaluation

## 📐 Rule Engine

### JSON AST Format
```json
{
  "name": "Referral Reward Rule",
  "conditions": {
    "operator": "AND",
    "operands": [
      { "field": "referrer.status", "op": "=", "value": "PAID" },
      { "field": "referred.action", "op": "=", "value": "SUBSCRIBED" }
    ]
  },
  "actions": [
    { "type": "createReward", "params": { "amount": 500, "currency": "INR" } },
    { "type": "issueVoucher", "params": { "code": "REF500" } }
  ]
}
```

### Supported Operators
- Comparison: `=`, `!=`, `>`, `<`, `>=`, `<=`
- Set: `in`, `not_in`
- Existence: `exists`, `not_exists`

### Evaluate Event
```bash
curl -X POST /api/rules/evaluate -d '{
  "event": {
    "referrer": { "status": "PAID" },
    "referred": { "action": "SUBSCRIBED" }
  }
}'
# Returns: [{ type: "createReward", ... }, { type: "issueVoucher", ... }]
```

## 🎨 Flow Builder UI

The frontend provides a visual drag-and-drop interface:

- **Start Node**: Entry point (green)
- **Condition Node**: Configure conditions with operators (amber)
- **Action Node**: Configure actions like createReward (blue)
- **End Node**: Terminal node (red)

Features:
- Drag nodes from palette
- Connect nodes with edges
- Edit properties in sidebar
- Live JSON preview
- Export/Import JSON rules

## 🔮 Next Steps

- [ ] Add authentication/authorization
- [ ] Implement rate limiting
- [ ] Add webhook notifications
- [ ] Build admin dashboard
- [ ] Add rule simulation/dry-run mode
- [ ] Implement rule scheduling
- [ ] Add analytics and reporting

## 📁 Project Structure

```
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── seed.ts            # Sample data
│   ├── src/
│   │   ├── modules/
│   │   │   ├── rewards/       # Reward lifecycle
│   │   │   ├── ledger/        # Immutable ledger
│   │   │   ├── rules/         # Rule engine
│   │   │   └── users/         # User management
│   │   ├── common/            # Shared utilities
│   │   └── prisma/            # Database service
│   └── test/                  # E2E tests
├── frontend/
│   └── src/
│       ├── components/
│       │   └── flow-builder/  # React Flow components
│       ├── store/             # Zustand state
│       └── pages/             # Next.js pages

└── README.md
```

## 📝 License

MIT
