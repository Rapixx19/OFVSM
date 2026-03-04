# Scalability Plan

Strategic approach for scaling the VECTERAI Foundation project architecture.

## Modularization Strategy

### Monolith to Feature-Encapsulated Engines

Transition from monolithic architecture to feature-encapsulated engines:

1. **Current State:** Monolithic structure with shared dependencies
2. **Target State:** Independent feature engines with clear boundaries

Each feature becomes a self-contained engine with:
- Own state management
- Isolated business logic
- Defined public API surface
- Independent deployment capability

### Service Injection Pattern

Implement dependency injection using `SolanaProvider`:

```typescript
// SolanaProvider handles connection lifecycle
// Services receive provider instance for Solana interactions
// Enables testability through mock provider injection
```

Benefits:
- Decoupled service dependencies
- Simplified testing with mock providers
- Consistent connection management
- Environment-agnostic service logic

## Testing Scalability

### Vitest Sharding Strategy

Scale test execution across multiple workers:

1. **Shard Configuration:** Split test suites by feature domain
2. **Parallel Execution:** Run independent test shards concurrently
3. **CI Integration:** Distribute shards across CI matrix jobs

```bash
# Example: Run shard 1 of 4
vitest --shard=1/4

# Example: Run shard 2 of 4
vitest --shard=2/4
```

### Local Validator Forking

Use `solana-test-validator` for local development and testing:

1. **Fork Mainnet State:** Clone relevant account state from mainnet
2. **Isolated Testing:** Run tests against forked validator
3. **Reproducible Environment:** Consistent state across test runs

```bash
# Start local validator with mainnet fork
solana-test-validator --clone <program-id> --url mainnet-beta
```

Benefits:
- Realistic testing environment
- No mainnet transaction costs
- Fast iteration cycles
- Deterministic test outcomes
