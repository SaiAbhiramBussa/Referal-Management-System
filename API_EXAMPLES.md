# API Examples

This document provides practical examples of using the Referral Management System API.

## Authentication

### Register a New User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "name": "John Doe",
    "password": "securePassword123"
  }'
```

Response:
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securePassword123"
  }'
```

Response:
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note:** Save the token for use in subsequent requests.

## Ledger API

All ledger endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Get Account Balance

```bash
curl -X GET http://localhost:3000/ledger/balance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
[
  {
    "id": "acc-123",
    "type": "ASSET",
    "name": "Rewards Account",
    "balance": "100.0000",
    "currency": "USD"
  }
]
```

### Get Ledger Entries

```bash
curl -X GET "http://localhost:3000/ledger/entries?limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "entries": [
    {
      "id": "entry-123",
      "transactionId": "txn-456",
      "amount": "10.0000",
      "description": "Referral reward - referrer",
      "createdAt": "2024-01-14T10:00:00.000Z",
      "debitAccount": {
        "name": "Rewards Account",
        "type": "ASSET"
      },
      "creditAccount": {
        "name": "Rewards Account",
        "type": "ASSET"
      }
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

### Create Ledger Entry (Double-Entry)

```bash
curl -X POST http://localhost:3000/ledger/entries \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "debitAccountId": "account-id-1",
    "creditAccountId": "account-id-2",
    "amount": 50.00,
    "description": "Payment for services",
    "metadata": {
      "invoiceId": "INV-123",
      "category": "consulting"
    }
  }'
```

## Flow API

### Create a Flow

```bash
curl -X POST http://localhost:3000/flows \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Referral Reward Flow",
    "description": "Automatically rewards users when referral completes",
    "definition": {
      "nodes": [
        {
          "id": "trigger-1",
          "type": "trigger",
          "data": {
            "label": "Referral Completed",
            "eventType": "referral.completed"
          },
          "position": { "x": 100, "y": 100 }
        },
        {
          "id": "condition-1",
          "type": "condition",
          "data": {
            "label": "Check Amount > 0",
            "field": "amount",
            "operator": "greaterThan",
            "value": 0
          },
          "position": { "x": 300, "y": 100 }
        },
        {
          "id": "action-1",
          "type": "action",
          "data": {
            "label": "Add Reward",
            "actionType": "setVariable",
            "config": {
              "name": "rewardAmount",
              "value": 10
            }
          },
          "position": { "x": 500, "y": 50 }
        },
        {
          "id": "action-2",
          "type": "action",
          "data": {
            "label": "Send Notification",
            "actionType": "sendNotification",
            "config": {
              "message": "Congratulations! You earned a reward!"
            }
          },
          "position": { "x": 500, "y": 150 }
        }
      ],
      "edges": [
        {
          "id": "e1",
          "source": "trigger-1",
          "target": "condition-1"
        },
        {
          "id": "e2",
          "source": "condition-1",
          "target": "action-1",
          "sourceHandle": "true"
        },
        {
          "id": "e3",
          "source": "condition-1",
          "target": "action-2",
          "sourceHandle": "false"
        }
      ]
    }
  }'
```

### List All Flows

```bash
curl -X GET "http://localhost:3000/flows?isActive=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Flow Details

```bash
curl -X GET http://localhost:3000/flows/FLOW_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Flow

```bash
curl -X PUT http://localhost:3000/flows/FLOW_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Flow Name",
    "isActive": true
  }'
```

### Execute Flow

```bash
curl -X POST http://localhost:3000/flows/FLOW_ID/execute \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "referralId": "ref-123",
    "userId": "user-456"
  }'
```

Response:
```json
{
  "executionId": "exec-789",
  "result": {
    "triggered": true,
    "amount": 100,
    "referralId": "ref-123",
    "userId": "user-456",
    "previousResult": {
      "rewardAmount": 10
    }
  }
}
```

### Get Flow Executions

```bash
curl -X GET "http://localhost:3000/flows/FLOW_ID/executions?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Delete Flow

```bash
curl -X DELETE http://localhost:3000/flows/FLOW_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Referral API

### Create a Referral

```bash
curl -X POST http://localhost:3000/referrals \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "referredEmail": "friend@example.com",
    "referredName": "Friend Name",
    "metadata": {
      "source": "email_campaign",
      "campaign_id": "winter2024"
    }
  }'
```

Response:
```json
{
  "id": "ref-123",
  "code": "ABC123DEF456",
  "status": "PENDING",
  "referrer": {
    "id": "user-1",
    "email": "john@example.com",
    "name": "John Doe"
  },
  "referred": {
    "id": "user-2",
    "email": "friend@example.com",
    "name": "Friend Name"
  },
  "createdAt": "2024-01-14T10:00:00.000Z",
  "metadata": {
    "source": "email_campaign",
    "campaign_id": "winter2024"
  }
}
```

**Important:** Share the `code` with the referred person.

### Complete a Referral

```bash
curl -X POST http://localhost:3000/referrals/complete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "ABC123DEF456"
  }'
```

Response:
```json
{
  "id": "ref-123",
  "code": "ABC123DEF456",
  "status": "COMPLETED",
  "completedAt": "2024-01-14T11:00:00.000Z",
  "referrerId": "user-1",
  "referredId": "user-2"
}
```

**Note:** This automatically awards rewards to both referrer and referred users.

### Get My Referrals

```bash
curl -X GET http://localhost:3000/referrals/my \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
[
  {
    "id": "ref-123",
    "code": "ABC123DEF456",
    "status": "COMPLETED",
    "referrer": {
      "id": "user-1",
      "email": "john@example.com",
      "name": "John Doe"
    },
    "referred": {
      "id": "user-2",
      "email": "friend@example.com",
      "name": "Friend Name"
    },
    "createdAt": "2024-01-14T10:00:00.000Z",
    "completedAt": "2024-01-14T11:00:00.000Z"
  }
]
```

### Get Referral Statistics

```bash
curl -X GET http://localhost:3000/referrals/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "totalReferred": 5,
  "completedReferred": 3,
  "pendingReferred": 2
}
```

## Complete Workflow Example

### 1. User Registration and Referral

```bash
# 1. Register user A
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "name": "Alice",
    "password": "password123"
  }'

# Save the token as TOKEN_A

# 2. Alice creates a referral for Bob
curl -X POST http://localhost:3000/referrals \
  -H "Authorization: Bearer TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{
    "referredEmail": "bob@example.com",
    "referredName": "Bob"
  }'

# Note the referral code (e.g., "XYZ789ABC123")

# 3. Bob registers
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob@example.com",
    "name": "Bob",
    "password": "password456"
  }'

# Save the token as TOKEN_B

# 4. Complete the referral
curl -X POST http://localhost:3000/referrals/complete \
  -H "Authorization: Bearer TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "XYZ789ABC123"
  }'

# 5. Check Alice's balance (she received $10 reward)
curl -X GET http://localhost:3000/ledger/balance \
  -H "Authorization: Bearer TOKEN_A"

# 6. Check Bob's balance (he received $5 reward)
curl -X GET http://localhost:3000/ledger/balance \
  -H "Authorization: Bearer TOKEN_B"
```

## Error Responses

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Invalid input",
  "error": "Bad Request"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Flow not found",
  "error": "Not Found"
}
```

## Rate Limiting

Currently, there are no rate limits enforced. For production use, consider implementing rate limiting using packages like `@nestjs/throttler`.

## API Versioning

The current API does not use versioning. Future versions may use URL versioning (e.g., `/v1/auth/login`).

## Further Reading

- [OpenAPI Documentation](http://localhost:3000/api/docs) - Interactive API explorer
- [README.md](README.md) - Main documentation
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
