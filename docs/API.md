<!-- generated-by: gsd-doc-writer -->
# API Reference

This document outlines the API endpoints, authentication structures, request/response formats, error codes, and rate limits for Isian.

## Authentication

The Isian API uses three authentication models:
1. **Admin Session Cookies**: Admin endpoints (`/api/admin/*`) require a valid NextAuth session cookie, initiated via Google OAuth. Only emails allowed in `ADMIN_EMAILS` can successfully authenticate.
2. **Worker Authentication Token**: Internal worker processing endpoints (`/api/internal/*`) require the `x-worker-token` header. The value must exactly match `INTERNAL_WORKER_TOKEN`.
3. **Unauthenticated**: Public endpoints (`/api/public/*`) and health endpoints (`/api/health`) require no authentication.

## Endpoints overview

| Method | Path | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/health` | Service health status verification. | None |
| `GET` | `/api/public/forms/[slug]` | Retrieves the public definition and fields of a form. | None |
| `POST` | `/api/public/forms/[slug]/submit` | Submits form answers for validation and storage. | None |
| `GET` | `/api/admin/forms` | Lists all forms configured in the system. | Admin Session |
| `POST` | `/api/admin/forms` | Creates a new blank form draft. | Admin Session |
| `GET` | `/api/admin/forms/[id]` | Retrieves full config detail for a specific form. | Admin Session |
| `PUT` | `/api/admin/forms/[id]` | Updates fields, settings, or properties of a form. | Admin Session |
| `DELETE` | `/api/admin/forms/[id]` | Deletes a form and all of its associated fields/options. | Admin Session |
| `GET` | `/api/admin/forms/[id]/submissions` | Lists submissions for a form with pagination & filters. | Admin Session |
| `GET` | `/api/admin/forms/[id]/export` | Exports submissions for a form as an Excel workbook. | Admin Session |
| `POST` | `/api/internal/submission-jobs/process` | Background queue processor trigger. | Worker Token (`x-worker-token`) |

## Request/response formats

### 1. Retrieve Public Form
* **Endpoint**: `GET /api/public/forms/[slug]`
* **Response Headers**:
  `Cache-Control: public, s-maxage=30, stale-while-revalidate=300`
* **Response Example (200 OK)**:
  ```json
  {
    "form": {
      "id": "form_123",
      "slug": "webinar-feedback",
      "title": "Webinar Feedback",
      "description": "Please rate our webinar.",
      "submitLabel": "Submit Response",
      "settings": {
        "workflow": "STANDARD"
      },
      "fields": [
        {
          "id": "field_name",
          "name": "name",
          "label": "Full Name",
          "type": "text",
          "required": true
        }
      ]
    }
  }
  ```

### 2. Submit Public Form Answers
* **Endpoint**: `POST /api/public/forms/[slug]/submit`
* **Request Body Example**:
  ```json
  {
    "name": "Jane Doe",
    "rating": "4"
  }
  ```
* **Response Example (201 Created)**:
  ```json
  {
    "submissionId": "sub_987",
    "slug": "webinar-feedback"
  }
  ```

### 3. Trigger Submission Worker
* **Endpoint**: `POST /api/internal/submission-jobs/process?batch=25`
* **Request Headers**:
  `x-worker-token: <INTERNAL_WORKER_TOKEN>`
* **Response Example (200 OK)**:
  ```json
  {
    "processedCount": 12,
    "successCount": 12,
    "failedCount": 0
  }
  ```

## Error codes

Errors are returned with JSON payloads explaining the cause.

* **401 Unauthorized**:
  * Returned when an admin route is requested without an authenticated session, or when the background worker endpoint receives an incorrect token.
  ```json
  { "error": "Unauthorized" }
  ```
* **404 Not Found**:
  * Returned when requesting a form slug or form ID that does not exist.
  ```json
  { "error": "Form tidak ditemukan" }
  ```
* **429 Too Many Requests**:
  * Returned when a client exceeds public rate limits.
  ```json
  { "error": "Terlalu banyak permintaan. Silakan coba lagi nanti." }
  ```
* **500 Internal Server Error**:
  * Returned when an unhandled server error occurs.
  ```json
  { "error": "Terjadi kesalahan server. Silakan coba lagi." }
  ```

## Rate limits

Public submissions are protected using an in-memory sliding-window rate limiter (`src/lib/rate-limit.ts`):
* **Limit**: **5 submissions per 60 seconds** per IP address.
* **IP Discovery**: Extracted from the `X-Forwarded-For` (first entry) or `X-Real-IP` headers.
* **Headers returned on 429**:
  * `Retry-After`: Remaining seconds until reset.
  * `X-RateLimit-Limit`: `5`
  * `X-RateLimit-Remaining`: `0`
* **Multi-Instance warning**: The limiter defaults to in-memory state. In multi-instance deployments behind a load balancer, this limiter is not shared and must be replaced with a central store (like Redis) unless `RATE_LIMIT_SINGLE_INSTANCE_OK=true` is set.
