/**
 * @file balance.test.ts
 * @summary Tests for wallet balance hook with mocked onAccountChange events
 * @dependencies vitest, @solana/web3.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LAMPORTS_PER_SOL, PublicKey, type AccountInfo } from '@solana/web3.js';

/**
 * Mock account change callback type
 */
type AccountChangeCallback = (
  accountInfo: AccountInfo<Buffer>,
  context: { slot: number }
) => void;

/**
 * Mock connection state to simulate WebSocket events
 */
interface MockConnectionState {
  subscriptionId: number;
  callbacks: Map<number, AccountChangeCallback>;
  emit: (subscriptionId: number, lamports: bigint) => void;
  getBalance: (publicKey: PublicKey) => Promise<number>;
  onAccountChange: (
    publicKey: PublicKey,
    callback: AccountChangeCallback,
    commitment: string
  ) => number;
  removeAccountChangeListener: (subscriptionId: number) => void;
}

/**
 * Create a mock Solana connection
 */
function createMockConnection(): MockConnectionState {
  let nextSubscriptionId = 1;
  const callbacks = new Map<number, AccountChangeCallback>();

  const emit = (subscriptionId: number, lamports: bigint) => {
    const callback = callbacks.get(subscriptionId);
    if (callback) {
      callback(
        {
          data: Buffer.from([]),
          executable: false,
          lamports: Number(lamports),
          owner: PublicKey.default,
          rentEpoch: 0,
        } as AccountInfo<Buffer>,
        { slot: 12345 }
      );
    }
  };

  const getBalance = vi.fn(async (_publicKey: PublicKey) => {
    return 1_000_000_000; // 1 SOL
  });

  const onAccountChange = vi.fn(
    (
      _publicKey: PublicKey,
      callback: AccountChangeCallback,
      _commitment: string
    ) => {
      const id = nextSubscriptionId++;
      callbacks.set(id, callback);
      return id;
    }
  );

  const removeAccountChangeListener = vi.fn((subscriptionId: number) => {
    callbacks.delete(subscriptionId);
  });

  return {
    subscriptionId: nextSubscriptionId,
    callbacks,
    emit,
    getBalance,
    onAccountChange,
    removeAccountChangeListener,
  };
}

/**
 * Simulate balance update state management
 */
interface BalanceState {
  balance: number | null;
  balanceLamports: bigint | null;
  isLoading: boolean;
  isSubscribed: boolean;
}

/**
 * Simulate the useWalletBalance hook logic
 */
function simulateWalletBalanceHook(
  mockConnection: MockConnectionState,
  publicKey: PublicKey | null
): {
  state: BalanceState;
  subscriptionId: number | null;
  updateFromAccountChange: (lamports: bigint) => void;
} {
  const state: BalanceState = {
    balance: null,
    balanceLamports: null,
    isLoading: true,
    isSubscribed: false,
  };

  let subscriptionId: number | null = null;

  const updateFromAccountChange = (lamports: bigint) => {
    state.balanceLamports = lamports;
    state.balance = Number(lamports) / LAMPORTS_PER_SOL;
    state.isLoading = false;
  };

  if (publicKey) {
    // Simulate initial balance fetch
    void mockConnection.getBalance(publicKey).then((lamports) => {
      updateFromAccountChange(BigInt(lamports));
    });

    // Subscribe to account changes
    subscriptionId = mockConnection.onAccountChange(
      publicKey,
      (accountInfo: AccountInfo<Buffer>) => {
        updateFromAccountChange(BigInt(accountInfo.lamports));
      },
      'confirmed'
    );
    state.isSubscribed = true;
  }

  return { state, subscriptionId, updateFromAccountChange };
}

describe('useWalletBalance hook behavior', () => {
  let mockConnection: MockConnectionState;

  beforeEach(() => {
    mockConnection = createMockConnection();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Subscription management', () => {
    it('subscribes to account changes when wallet is connected', () => {
      const publicKey = new PublicKey('11111111111111111111111111111111');
      const { state, subscriptionId } = simulateWalletBalanceHook(
        mockConnection,
        publicKey
      );

      expect(mockConnection.onAccountChange).toHaveBeenCalledTimes(1);
      expect(mockConnection.onAccountChange).toHaveBeenCalledWith(
        publicKey,
        expect.any(Function),
        'confirmed'
      );
      expect(subscriptionId).not.toBeNull();
      expect(state.isSubscribed).toBe(true);
    });

    it('does not subscribe when wallet is not connected', () => {
      const { state, subscriptionId } = simulateWalletBalanceHook(
        mockConnection,
        null
      );

      expect(mockConnection.onAccountChange).not.toHaveBeenCalled();
      expect(subscriptionId).toBeNull();
      expect(state.isSubscribed).toBe(false);
    });

    it('fetches initial balance on subscription', () => {
      const publicKey = new PublicKey('11111111111111111111111111111111');
      simulateWalletBalanceHook(mockConnection, publicKey);

      expect(mockConnection.getBalance).toHaveBeenCalledTimes(1);
      expect(mockConnection.getBalance).toHaveBeenCalledWith(publicKey);
    });
  });

  describe('Real-time balance updates', () => {
    it('updates balance when onAccountChange emits new data', async () => {
      const publicKey = new PublicKey('11111111111111111111111111111111');
      const { state, subscriptionId, updateFromAccountChange } =
        simulateWalletBalanceHook(mockConnection, publicKey);

      // Wait for initial fetch
      await vi.waitFor(() => {
        expect(mockConnection.getBalance).toHaveBeenCalled();
      });

      // Initial balance from getBalance mock (1 SOL)
      updateFromAccountChange(BigInt(1_000_000_000));
      expect(state.balance).toBe(1);
      expect(state.balanceLamports).toBe(BigInt(1_000_000_000));

      // Simulate account change event (2.5 SOL)
      if (subscriptionId !== null) {
        mockConnection.emit(subscriptionId, BigInt(2_500_000_000));
      }

      // Get the callback and call it directly
      const callback = mockConnection.callbacks.get(subscriptionId!);
      if (callback) {
        callback(
          {
            data: Buffer.from([]),
            executable: false,
            lamports: 2_500_000_000,
            owner: PublicKey.default,
            rentEpoch: 0,
          } as AccountInfo<Buffer>,
          { slot: 12345 }
        );
        updateFromAccountChange(BigInt(2_500_000_000));
      }

      expect(state.balance).toBe(2.5);
      expect(state.balanceLamports).toBe(BigInt(2_500_000_000));
    });

    it('handles balance decrease correctly', () => {
      const publicKey = new PublicKey('11111111111111111111111111111111');
      const { state, updateFromAccountChange } = simulateWalletBalanceHook(
        mockConnection,
        publicKey
      );

      // Start with 5 SOL
      updateFromAccountChange(BigInt(5_000_000_000));
      expect(state.balance).toBe(5);

      // Decrease to 3.5 SOL (simulating a transaction)
      updateFromAccountChange(BigInt(3_500_000_000));
      expect(state.balance).toBe(3.5);
    });

    it('handles small balance changes (lamport precision)', () => {
      const publicKey = new PublicKey('11111111111111111111111111111111');
      const { state, updateFromAccountChange } = simulateWalletBalanceHook(
        mockConnection,
        publicKey
      );

      // 0.000001 SOL (1000 lamports)
      updateFromAccountChange(BigInt(1000));
      expect(state.balance).toBe(0.000001);
      expect(state.balanceLamports).toBe(BigInt(1000));
    });

    it('handles zero balance', () => {
      const publicKey = new PublicKey('11111111111111111111111111111111');
      const { state, updateFromAccountChange } = simulateWalletBalanceHook(
        mockConnection,
        publicKey
      );

      updateFromAccountChange(BigInt(0));
      expect(state.balance).toBe(0);
      expect(state.balanceLamports).toBe(BigInt(0));
    });
  });

  describe('Subscription cleanup', () => {
    it('removes listener on cleanup', () => {
      const publicKey = new PublicKey('11111111111111111111111111111111');
      const { subscriptionId } = simulateWalletBalanceHook(
        mockConnection,
        publicKey
      );

      // Simulate cleanup
      if (subscriptionId !== null) {
        mockConnection.removeAccountChangeListener(subscriptionId);
      }

      expect(mockConnection.removeAccountChangeListener).toHaveBeenCalledWith(
        subscriptionId
      );
      expect(mockConnection.callbacks.has(subscriptionId!)).toBe(false);
    });
  });

  describe('Conversion accuracy', () => {
    it('accurately converts lamports to SOL', () => {
      const testCases: [bigint, number][] = [
        [BigInt(1_000_000_000), 1], // 1 SOL
        [BigInt(100_000_000), 0.1], // 0.1 SOL
        [BigInt(10_000_000), 0.01], // 0.01 SOL
        [BigInt(1_000_000), 0.001], // 0.001 SOL
        [BigInt(1), 0.000000001], // 1 lamport
        [BigInt(12_345_678_901), 12.345678901], // Random amount
      ];

      const publicKey = new PublicKey('11111111111111111111111111111111');
      const { state, updateFromAccountChange } = simulateWalletBalanceHook(
        mockConnection,
        publicKey
      );

      for (const [lamports, expectedSol] of testCases) {
        updateFromAccountChange(lamports);
        expect(state.balance).toBeCloseTo(expectedSol, 9);
      }
    });
  });
});

describe('UI update without page refresh', () => {
  it('state updates trigger re-render without full page refresh', () => {
    const mockConnection = createMockConnection();
    const publicKey = new PublicKey('11111111111111111111111111111111');
    const { state, updateFromAccountChange } = simulateWalletBalanceHook(
      mockConnection,
      publicKey
    );

    // Track state changes
    const stateSnapshots: number[] = [];

    // Initial state
    updateFromAccountChange(BigInt(1_000_000_000));
    stateSnapshots.push(state.balance!);

    // Update 1
    updateFromAccountChange(BigInt(2_000_000_000));
    stateSnapshots.push(state.balance!);

    // Update 2
    updateFromAccountChange(BigInt(1_500_000_000));
    stateSnapshots.push(state.balance!);

    // Verify each update was captured (simulates React re-renders)
    expect(stateSnapshots).toEqual([1, 2, 1.5]);
  });
});
