#!/bin/bash

# Exit on error
set -e

echo "===== Installing dependencies ====="
npm install

echo "===== Building backend ====="
npm run build:backend

echo "===== Building frontend ====="
npm run build:frontend

echo "===== Build completed successfully ====="
echo "Run 'npm run start:dev' to start the development server"