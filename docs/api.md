# API Documentation - AI Marketing Automation System

Base URL: `http://localhost:5000/api/v1`

## Authentication

All endpoints except `/auth/login` require a Bearer token.

```
Authorization: Bearer <jwt_token>
```

---

## Auth Endpoints

### POST `/auth/login`

Login and receive JWT token.

**Request:**
```json
{
  "email": "trainer@company.com",
  "password": "AMA2026!"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "name": "Demo Trainer",
    "email": "trainer@company.com",
    "role": "trainer"
  }
}
```

**Errors:** 401 (invalid credentials)

### GET `/auth/profile`

Get current user profile. Requires authentication.

---

## Submission Endpoints

### POST `/submissions`

Create a new content submission. Requires authentication.

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| name | string | ✅ | max 100 chars |
| email | string | ✅ | valid email |
| team | string | ❌ | max 50 chars |
| content_title | string | ❌ | max 200 chars |
| content_description | string | ✅ | min 20 chars |
| content_type | enum | ❌ | post\|event\|course\|announcement |
| priority | enum | ❌ | low\|medium\|high (default: medium) |
| tone_preference | enum | ❌ | formal\|casual\|promotional (default: formal) |
| files[] | file | ❌ | max 5 files, 10MB each, image/* or PDF |

**Response (201):**
```json
{
  "success": true,
  "submission_id": "uuid",
  "status": "pending",
  "message": "Submission received and queued for AI processing"
}
```

**Errors:** 400 (validation), 413 (file too large)

### GET `/submissions/my`

Get current user's submissions. Requires authentication.

**Response (200):**
```json
{
  "success": true,
  "submissions": [...],
  "count": 5
}
```

---

## Draft Endpoints

### GET `/drafts`

List AI-generated drafts. **Marketing/Admin only.**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| status | enum | all | ready_for_review\|approved\|rejected\|regenerating |
| team | string | all | Filter by team |
| limit | number | 20 | 1-100 |
| offset | number | 0 | Pagination offset |

**Response (200):**
```json
{
  "success": true,
  "drafts": [
    {
      "id": "uuid",
      "submission_id": "uuid",
      "submitter_name": "Demo Trainer",
      "content_title": "AI Course Launch",
      "team": "AI",
      "linkedin_text": "...",
      "twitter_text": "...",
      "instagram_text": "...",
      "hashtags": ["AI", "Learning"],
      "status": "ready_for_review",
      "llm_model": "claude-3-5-sonnet",
      "generated_at": "2026-04-09T10:00:00Z"
    }
  ],
  "count": 10,
  "statusCounts": {
    "ready_for_review": 5,
    "approved": 3,
    "rejected": 2
  }
}
```

### GET `/drafts/:id`

Get single draft with full submission context. **Marketing/Admin only.**

### POST `/drafts/:id/regenerate`

Trigger new AI generation. Sets draft status to "regenerating". **Marketing/Admin only.**

---

## Approval Endpoints

### POST `/approvals`

Approve or reject a draft. **Marketing/Admin only.**

**Request:**
```json
{
  "draft_id": "uuid",
  "reviewer_name": "Marketing Head",
  "reviewer_email": "marketing@company.com",
  "decision": "approved",
  "feedback": "Great content! (required for rejection)",
  "edited_linkedin": "Optional edited text",
  "edited_twitter": "Optional edited text",
  "edited_instagram": "Optional edited text",
  "scheduled_time": "2026-04-10T09:00:00Z"
}
```

**Response (201):**
```json
{
  "success": true,
  "approval": { "id": "uuid", "decision": "approved", ... },
  "message": "Draft approved successfully."
}
```

**Rules:**
- Only `ready_for_review` drafts can be approved/rejected
- Rejection requires feedback (min 5 characters)
- Creates audit trail in approvals table
- Emails submitter on approval/rejection

### GET `/approvals`

List all approval audit records. **Marketing/Admin only.**

---

## Health Check

### GET `/api/health`

```json
{
  "status": "ok",
  "service": "AMA API",
  "version": "1.0.0",
  "timestamp": "2026-04-09T10:00:00Z",
  "environment": "development"
}
```
