# Testing the Brand Insight Service

This document explains how to test the Brand Insight Service.

## Setup

Before testing, make sure you have set up the environment correctly:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up the database, generate Prisma client, and build the app:
   ```bash
   npm run setup
   ```

## Testing Options

### Option 1: Running the Test Scripts (Automated)

For the easiest and most reliable testing, use our automated test scripts that handle server startup and shutdown:

1. **Run All Tests** (Comprehensive testing):
   ```bash
   npm run test:all
   ```

   This script:
   - Runs all the tests below in sequence
   - Handles server startup/shutdown between tests
   - Uses different ports for each test to avoid conflicts

2. **LLM Adapter Test** (Tests available LLM providers):
   ```bash
   npm run test:llm:auto
   ```

   This script:
   - Starts the server on port 3001
   - Tests which LLM adapters are available based on provided API keys
   - Shuts down the server when done

3. **Identity Card Test** (Tests company profile creation):
   ```bash
   npm run test:identity:auto
   ```

   This script:
   - Starts the server on port 3002
   - Creates a company identity card
   - Shuts down the server when done

4. **Batch Process Test** (Tests weekly insight generation):
   ```bash
   npm run test:batch:auto
   ```

   This script:
   - Starts the server on port 3003
   - Runs the batch process directly
   - Shuts down the server when done

### Option 2: Running the Test Scripts (Manual)

If you prefer more control, you can run server and tests in separate terminals:

1. **Simple API Test** (No database required):
   ```bash
   # Start the server in one terminal
   npm run start:dev

   # In another terminal, run the test
   npm run test:simple
   ```

   This script:
   - Checks API health
   - Creates a company identity card
   - Attempts to retrieve reports

2. **Full Flow Test** (Requires database):
   ```bash
   # Start the server in one terminal
   npm run start:dev

   # In another terminal, run the test
   npm run test:flow
   ```

   This script runs the complete flow:
   - Sets up the database
   - Creates a company identity card
   - Runs the batch process
   - Retrieves the report

3. **LLM Adapter Test**:
   ```bash
   # Start the server in one terminal
   npm run start:dev

   # In another terminal, run the test
   npm run test:llm
   ```

4. **Identity Card Test**:
   ```bash
   # Start the server in one terminal
   npm run start:dev

   # In another terminal, run the test
   npm run test:identity
   ```

5. **Direct Batch Test** (Uses NestJS modules directly):
   ```bash
   npm run test:batch
   ```

### Option 2: Manual Testing with cURL

You can also test the API endpoints using cURL:

1. **Create an Identity Card**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/profile \
     -H "Content-Type: application/json" \
     -d '{
       "data": {
         "brandName": "Example Corp",
         "website": "https://example.com",
         "industry": "Technology",
         "shortDescription": "Example description",
         "fullDescription": "Detailed description",
         "keyFeatures": ["Feature 1", "Feature 2"],
         "competitors": ["Competitor 1"]
       }
     }'
   ```

2. **Get Latest Report** (replace COMPANY_ID with the actual ID):
   ```bash
   curl http://localhost:3000/api/v1/reports/COMPANY_ID/latest
   ```

3. **Health Check**:
   ```bash
   curl http://localhost:3000/healthz
   ```

## Expected Results

1. **Identity Card Creation**:
   - Should return a JSON object with:
     - companyId (UUID)
     - brandName, website, industry
     - shortDescription, fullDescription
     - keyFeatures, competitors
     - updatedAt timestamp

2. **Report Retrieval**:
   - Initially, this will likely return a 404 error (no reports yet)
   - After running the batch process (either via cron or manual trigger), it should return a JSON object with:
     - companyId
     - weekStart timestamp
     - spontaneous, sentimentAccuracy, and comparison results
     - llmVersions and generatedAt timestamp

3. **Health Check**:
   - Should return a status of "ok" and database connection status