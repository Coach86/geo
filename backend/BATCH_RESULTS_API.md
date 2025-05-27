# Batch Results API Documentation

The Batch Results API provides endpoints to retrieve batch processing results from the system.

## Base URL
```
/admin/batch-results
```

## Endpoints

### 1. Get All Results for a Batch Execution
```
GET /admin/batch-results/execution/:executionId
```

Retrieves all batch results for a specific batch execution.

**Parameters:**
- `executionId` (path parameter): The ID of the batch execution

**Response:**
```json
{
  "executionId": "uuid",
  "companyId": "uuid",
  "status": "completed",
  "executedAt": "2024-01-01T00:00:00Z",
  "results": [
    {
      "id": "uuid",
      "resultType": "spontaneous",
      "result": { /* result data */ },
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    },
    // ... more results
  ]
}
```

### 2. Get Specific Result Type for a Batch Execution
```
GET /admin/batch-results/execution/:executionId/:resultType
```

Retrieves a specific type of result for a batch execution.

**Parameters:**
- `executionId` (path parameter): The ID of the batch execution
- `resultType` (path parameter): The type of result - one of: `spontaneous`, `sentiment`, `comparison`, `accuracy`

**Response:**
```json
{
  "id": "uuid",
  "executionId": "uuid",
  "resultType": "spontaneous",
  "result": { /* result data */ },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### 3. Get Latest Results for a Company
```
GET /admin/batch-results/company/:companyId/latest
```

Retrieves the latest batch results for a company from the most recent completed batch execution.

**Parameters:**
- `companyId` (path parameter): The ID of the company
- `resultType` (query parameter, optional): Filter by result type - one of: `spontaneous`, `sentiment`, `comparison`, `accuracy`

**Response (without resultType filter):**
```json
{
  "executionId": "uuid",
  "companyId": "uuid",
  "executedAt": "2024-01-01T00:00:00Z",
  "results": [
    {
      "id": "uuid",
      "resultType": "spontaneous",
      "result": { /* result data */ },
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    },
    // ... more results
  ]
}
```

**Response (with resultType filter):**
```json
{
  "executionId": "uuid",
  "companyId": "uuid",
  "executedAt": "2024-01-01T00:00:00Z",
  "result": {
    "id": "uuid",
    "resultType": "spontaneous",
    "result": { /* result data */ },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 4. Get Batch Result by ID
```
GET /admin/batch-results/:id
```

Retrieves a specific batch result by its ID.

**Parameters:**
- `id` (path parameter): The ID of the batch result

**Response:**
```json
{
  "id": "uuid",
  "executionId": "uuid",
  "resultType": "spontaneous",
  "result": { /* result data */ },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

## Result Types

Each batch execution can produce the following types of results:

1. **spontaneous**: Brand visibility and spontaneous mention analysis
2. **sentiment**: Sentiment analysis of brand mentions
3. **comparison**: Competitive comparison analysis
4. **accuracy**: Brand attribute accuracy analysis

## Error Responses

All endpoints return appropriate HTTP status codes:

- `200 OK`: Successful request
- `404 Not Found`: Resource not found (batch execution, result, or company)
- `500 Internal Server Error`: Server error

Error response format:
```json
{
  "statusCode": 404,
  "message": "Batch execution {id} not found",
  "error": "Not Found"
}
```