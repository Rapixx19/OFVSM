# Architecture Zones

Risk zone classification for the VECTERAI Foundation project. Each zone defines AI autonomy policies and testing requirements.

## Zone Classification Table

| Zone | Risk | Directories | Policy | Testing |
|------|------|-------------|--------|---------|
| 🟢 Green | Low | `src/ui/`, `src/app/`, `styles/` | AI-Fluid | Vitest Snapshots + Playwright |
| 🟡 Yellow | Med | `src/features/*/hooks`, `src/features/*/services`, `src/core/pricingConfig.ts` | AI-Assisted | 100% Branch Coverage + Integration Mocks |
| 🔴 Red | High | `src/features/auth/`, `src/features/locker/`, `anchor/`, `src/features/orchestrator/` | Human-Gated | E2E + Security Analysis + Mainnet Fork |

## Zone Definitions

### 🟢 Green Zone (Low Risk)

**Directories:**
- `src/ui/` - UI components
- `src/app/` - Application routing and pages
- `styles/` - Styling files

**Policy:** AI-Fluid
- AI can make autonomous changes
- No human approval required for modifications
- Fast iteration cycle

**Testing Requirements:**
- Vitest snapshot tests for component rendering
- Playwright E2E tests for user interactions

### 🟡 Yellow Zone (Medium Risk)

**Directories:**
- `src/features/*/hooks` - Feature-specific React hooks
- `src/features/*/services` - Feature-specific service layers
- `src/core/pricingConfig.ts` - Pricing configuration

**Policy:** AI-Assisted
- AI proposes changes
- Human review recommended
- Changes require additional validation

**Testing Requirements:**
- 100% branch coverage mandatory
- Integration tests with mocked dependencies

### 🔴 Red Zone (High Risk)

**Directories:**
- `src/features/auth/` - Authentication and authorization
- `src/features/locker/` - Locker/vault functionality
- `anchor/` - Solana Anchor programs
- `src/features/orchestrator/` - Orchestration logic

**Policy:** Human-Gated
- All changes require explicit human approval
- Security-critical modifications
- No autonomous AI changes permitted

**Testing Requirements:**
- Full E2E test coverage
- Security analysis review
- Mainnet fork testing before deployment
