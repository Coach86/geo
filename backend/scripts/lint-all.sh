#!/bin/bash

echo "=== Running JavaScript Syntax Checks ==="
echo ""

# Check all JS files for syntax errors
echo "1. Checking JavaScript syntax..."
find scripts -name "*.js" -type f | while read file; do
  if ! node -c "$file" 2>/dev/null; then
    echo "❌ Syntax error in: $file"
    node -c "$file"
    exit 1
  fi
done
echo "✅ All JavaScript files have valid syntax"
echo ""

# Run ESLint if available
if command -v npx &> /dev/null && [ -f ".eslintrc.json" ]; then
  echo "2. Running ESLint..."
  npx eslint scripts/**/*.js --max-warnings 0
else
  echo "2. ESLint not configured (skipping)"
fi
echo ""

# Test that all rules can be loaded
echo "3. Testing rule modules..."
node scripts/test-all-rules.js
echo ""

# Run a quick test with 1 page
echo "4. Running integration test..."
node scripts/test-page-intelligence-standalone.js --companies 1 --max-pages 1 > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Integration test passed"
else
  echo "❌ Integration test failed"
  exit 1
fi

echo ""
echo "=== All checks passed! ==="