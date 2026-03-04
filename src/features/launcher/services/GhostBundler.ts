/**
 * @file GhostBundler.ts
 * @summary Re-export from TransactionBuilder for backward compatibility
 * @deprecated Import from TransactionBuilder.ts directly
 */

export {
  GhostBundler,
  createGhostBundler,
  EXPECTED_INSTRUCTIONS,
  getExpectedInstructionCount,
} from './TransactionBuilder';
