# API Design Best Practices

## Resource-Oriented Design

The most important principle in REST API design is to think in terms of **nouns, not verbs**. Your endpoints should represent resources, not actions. Instead of `POST /createUser`, use `POST /users`. Instead of `GET /fetchOrder`, use `GET /orders/{id}`.

Good resource naming follows a hierarchy:
- `/users` — collection of users
- `/users/{id}` — single user
- `/users/{id}/orders` — orders belonging to a user
- `/users/{id}/orders/{orderId}` — specific order for a user

## How to Structure REST Endpoints

When designing your API, group endpoints by resource and use HTTP methods to indicate the action:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /products | List all products |
| POST | /products | Create a product |
| GET | /products/{id} | Get a specific product |
| PUT | /products/{id} | Replace a product |
| PATCH | /products/{id} | Partially update a product |
| DELETE | /products/{id} | Remove a product |

## API Versioning

Always version your API from day one. The two most common strategies are:

1. **URL path versioning**: `/v1/users`, `/v2/users`
2. **Header versioning**: `Accept: application/vnd.myapi.v2+json`

URL versioning is simpler and more visible. Header versioning keeps URLs clean but is harder to test in a browser. We recommend URL versioning for most teams.

When introducing a breaking change, increment the major version. Non-breaking additions (new optional fields, new endpoints) don't require a version bump.

## JSON Response Codes and Error Messages

Use standard HTTP status codes consistently:

- `200 OK` — Successful GET, PUT, PATCH
- `201 Created` — Successful POST that creates a resource
- `204 No Content` — Successful DELETE
- `400 Bad Request` — Malformed request body or invalid parameters
- `401 Unauthorized` — Missing or invalid authentication token
- `403 Forbidden` — Valid token but insufficient permissions
- `404 Not Found` — Resource doesn't exist
- `422 Unprocessable Entity` — Validation errors
- `429 Too Many Requests` — Rate limit exceeded
- `500 Internal Server Error` — Unexpected server failure

Error responses should always include a structured JSON body:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email address is invalid",
    "details": [
      { "field": "email", "issue": "Must be a valid email format" }
    ]
  }
}
```

## Pagination

For list endpoints, always paginate. Cursor-based pagination is more reliable than offset-based for large datasets:

```
GET /orders?cursor=abc123&limit=25
```

Response should include navigation links:
```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "def456",
    "has_more": true
  }
}
```

## Rate Limiting

Protect your API with rate limits and communicate them via headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1699900000
```

## Authentication

Use Bearer tokens (JWT or opaque) in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Never put tokens in query strings — they end up in server logs and browser history.
