#!/bin/bash

# Smart Test Script - Zone-Aware Test Execution
# Detects which architecture zones are affected and runs appropriate tests

set -e

CHANGED_FILES=$(git diff --cached --name-only)

echo "📋 Analyzing changed files..."
echo "$CHANGED_FILES"
echo ""

# Check for Red Zone changes
if [[ $CHANGED_FILES == *"src/features/auth"* ]] || \
   [[ $CHANGED_FILES == *"src/features/locker"* ]] || \
   [[ $CHANGED_FILES == *"anchor/"* ]] || \
   [[ $CHANGED_FILES == *"src/features/orchestrator"* ]]; then

  echo "🔴 RED ZONE DETECTED: Running Full Security & E2E Suite..."
  echo "----------------------------------------"
  npm run test:e2e
  npm run security-scan
  echo "✅ Red Zone validation complete"

# Check for Yellow Zone changes
elif [[ $CHANGED_FILES == *"src/features/"*"/hooks"* ]] || \
     [[ $CHANGED_FILES == *"src/features/"*"/services"* ]] || \
     [[ $CHANGED_FILES == *"src/core/pricingConfig.ts"* ]]; then

  echo "🟡 YELLOW ZONE DETECTED: Running Integration Tests..."
  echo "----------------------------------------"
  npm run test:integration --related
  echo "✅ Yellow Zone validation complete"

# Default to Green Zone
else
  echo "🟢 GREEN ZONE: Running Lint & Snapshots..."
  echo "----------------------------------------"
  npm run lint
  npm run test:unit
  echo "✅ Green Zone validation complete"

fi

echo ""
echo "🎉 Smart test execution complete!"
