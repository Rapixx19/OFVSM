# Test Plan

Automated pre-push quality gate for the VECTERAI Foundation project.

## Smart Execution Logic

Zone-aware test execution that runs appropriate test suites based on changed files.

### scripts/smart-test.sh

```bash
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
```

---

## Tooling Integration

### Husky Pre-Push Hook

Prevents broken Red Zone logic from reaching the remote repository.

**.husky/pre-push**

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔒 Running pre-push quality gate..."
./scripts/smart-test.sh

# Exit code from smart-test.sh determines push success/failure
```

**Setup:**
```bash
npx husky install
npx husky add .husky/pre-push "./scripts/smart-test.sh"
```

---

### Lint-Staged Configuration

Handles Green Zone cleanup automatically on every commit.

**package.json addition:**

```json
{
  "lint-staged": {
    "src/ui/**/*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "src/app/**/*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "styles/**/*.{css,scss}": [
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

**.husky/pre-commit**

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

---

## Test Suite Commands

| Command | Zone | Description |
|---------|------|-------------|
| `npm run test:unit` | 🟢 Green | Vitest unit tests with snapshots |
| `npm run test:integration` | 🟡 Yellow | Integration tests with mocks |
| `npm run test:e2e` | 🔴 Red | Playwright E2E tests |
| `npm run security-scan` | 🔴 Red | Security analysis (audit, SAST) |
| `npm run lint` | 🟢 Green | ESLint + Prettier checks |

---

## CI/CD Integration

The smart test script integrates with CI pipelines:

```yaml
# Example GitHub Actions workflow
name: Quality Gate

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Smart Tests
        run: |
          chmod +x ./scripts/smart-test.sh
          ./scripts/smart-test.sh
```

---

## Execution Flow

```
Developer commits code
        ↓
   lint-staged runs
   (Green Zone cleanup)
        ↓
Developer pushes code
        ↓
   Husky pre-push hook
        ↓
   smart-test.sh executes
        ↓
   Zone detection via git diff
        ↓
    ┌────┴────┐────────┐
    ↓         ↓        ↓
  🟢 Green  🟡 Yellow  🔴 Red
  lint +    integration  E2E +
  unit      tests       security
    ↓         ↓        ↓
    └────┬────┘────────┘
        ↓
   Tests pass? → Push succeeds
   Tests fail? → Push blocked
```
