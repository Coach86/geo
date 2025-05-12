#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
  echo "Loading API keys from .env file..."
  export $(grep -v '^#' .env | xargs)
else
  echo "Warning: .env file not found, API keys may not be available."
fi

# Make sure the NestJS server is running
echo "Note: Make sure your NestJS server is running with 'npm run start' in another terminal window"
echo "      before running this test."

# Run the brand insight test with optional URL parameter
echo "=== Running Brand Insight Test ==="
if [ -n "$1" ]; then
  echo "Using provided URL: $1"
  node tests/brand-insight-test.js "$1"
else
  echo "Using default URL (https://www.backmarket.fr/)"
  node tests/brand-insight-test.js
fi

echo -e "\n=== Test completed! ==="