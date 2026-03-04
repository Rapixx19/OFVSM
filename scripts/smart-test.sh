#!/bin/bash

# Smart Test Script - Zone-Aware Test Execution
# Detects which architecture zones are affected and runs appropriate tests

set -e

# Determine which files have changed
# For pre-push: compare local commits against remote
# For pre-commit: check staged files
if git rev-parse --verify origin/main >/dev/null 2>&1; then
  CHANGED_FILES=$(git diff origin/main...HEAD --name-only 2>/dev/null || git diff --cached --name-only)
else
  CHANGED_FILES=$(git diff --cached --name-only)
fi

# Fallback: if no changes detected, check staged files
if [[ -z "$CHANGED_FILES" ]]; then
  CHANGED_FILES=$(git diff --cached --name-only)
fi

echo "📋 Analyzing changed files..."
echo "$CHANGED_FILES"
echo ""

# Exit early if no files changed
if [[ -z "$CHANGED_FILES" ]]; then
  echo "✅ No changed files detected, skipping tests"
  exit 0
fi

# Check for Red Zone changes
if [[ $CHANGED_FILES == *"src/features/auth"* ]] || \
   [[ $CHANGED_FILES == *"src/features/locker"* ]] || \
   [[ $CHANGED_FILES == *"anchor/"* ]] || \
   [[ $CHANGED_FILES == *"src/features/orchestrator"* ]]; then

  echo "🔴 RED ZONE DETECTED: Running Full Test Suite..."
  echo "----------------------------------------"
  npm run lint
  npm run typecheck
  npm run test:safe -- --run
  echo "✅ Red Zone validation complete"

# Check for Yellow Zone changes
elif [[ $CHANGED_FILES == *"src/features/"*"/hooks"* ]] || \
     [[ $CHANGED_FILES == *"src/features/"*"/services"* ]] || \
     [[ $CHANGED_FILES == *"src/core/pricingConfig.ts"* ]]; then

  echo "🟡 YELLOW ZONE DETECTED: Running Feature Tests..."
  echo "----------------------------------------"
  npm run lint
  npm run typecheck
  npm run test:safe -- --run
  echo "✅ Yellow Zone validation complete"

# Default to Green Zone
else
  echo "🟢 GREEN ZONE: Running Lint & Type Check..."
  echo "----------------------------------------"
  npm run lint
  npm run typecheck
  echo "✅ Green Zone validation complete"

fi

echo ""
echo "🎉 Smart test execution complete!"
