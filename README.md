# AI Marketing Automation System (AMA-001)

A production-grade AI content operations platform that automates social media content generation with structured governance.

## Architecture

```
[Trainer Form] → [React Frontend] ←→ [Node.js API Gateway]
                                          ↓
                          ┌───────────────┼───────────────┐
                     [Submission]    [AI Queue]     [Review API]
                          ↓              ↓               ↓
                    [PostgreSQL]     [Redis]        [S3 Storage]
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS 3 |
| Backend | Node.js 20 + Express 4 |
| Database | PostgreSQL 16 |
| Queue | Redis 7 + BullMQ |
| Storage | AWS S3 (or local uploads) |
| Auth | JWT + Role-based middleware |
| AI | Claude 3.5 Sonnet (primary) + GPT-4o (fallback) |

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose (for PostgreSQL + Redis)

### 1. Start Database & Redis
```bash
docker-compose up -d
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env    # Edit with your API keys
npm install
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Default Users
| Role | Email | Password |
|------|-------|----------|
| Trainer | trainer@company.com | AMA2026! |
| Marketing Head | marketing@company.com | AMA2026! |
| Admin | admin@company.com | AMA2026! |

## User Roles

| Role | Submit | View Own | View All | Edit | Approve | Admin |
|------|--------|----------|----------|------|---------|-------|
| Trainer | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Marketing Head | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/login` | Public | Login |
| POST | `/api/v1/submissions` | All | Create submission |
| GET | `/api/v1/submissions/my` | All | My submissions |
| GET | `/api/v1/drafts` | Marketing/Admin | List drafts |
| GET | `/api/v1/drafts/:id` | Marketing/Admin | Draft detail |
| POST | `/api/v1/drafts/:id/regenerate` | Marketing/Admin | Regenerate draft |
| POST | `/api/v1/approvals` | Marketing/Admin | Approve/Reject |

## Environment Variables

See `backend/.env.example` for full list.

## License

Private — Dan Abraham Jose © 2026
