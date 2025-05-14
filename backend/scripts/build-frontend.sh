#!/bin/bash

# Exit on error
set -e

echo "===== Building frontend with TypeScript ====="

# Ensure directories exist
mkdir -p public/static/js

# Run webpack with our configuration
NODE_ENV=production npx webpack --config webpack.config.js

echo "===== Frontend build completed successfully ====="