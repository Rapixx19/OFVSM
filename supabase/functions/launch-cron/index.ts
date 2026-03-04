/**
 * @file index.ts
 * @summary Supabase Edge Function for processing scheduled launches
 * @dependencies supabase-js, @solana/web3.js
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Connection, VersionedTransaction } from 'https://esm.sh/@solana/web3.js@1';

const JITO_BLOCK_ENGINE_URL = Deno.env.get('JITO_BLOCK_ENGINE_URL') ||
  'https://mainnet.block-engine.jito.wtf';
const SOLANA_RPC_URL = Deno.env.get('SOLANA_RPC_URL') ||
  'https://api.mainnet-beta.solana.com';

interface ScheduledLaunchRow {
  id: string;
  serialized_bundle: string;
  jito_tip_lamports: number;
}

Deno.serve(async (req) => {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

    // Get pending launches that are due
    const { data: launches, error } = await supabase
      .from('scheduled_launches')
      .select('id, serialized_bundle, jito_tip_lamports')
      .eq('status', 'pending')
      .lte('launch_at', new Date().toISOString())
      .limit(10);

    if (error) throw error;
    if (!launches?.length) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let processed = 0;
    let failed = 0;

    for (const launch of launches as ScheduledLaunchRow[]) {
      try {
        // Mark as processing
        await supabase
          .from('scheduled_launches')
          .update({ status: 'processing' })
          .eq('id', launch.id);

        // Deserialize and submit
        const buffer = Uint8Array.from(atob(launch.serialized_bundle), c => c.charCodeAt(0));
        const transaction = VersionedTransaction.deserialize(buffer);

        const signature = await submitToJito(transaction);

        // Confirm transaction
        await connection.confirmTransaction(signature, 'confirmed');

        // Mark as completed
        await supabase
          .from('scheduled_launches')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            signature,
          })
          .eq('id', launch.id);

        processed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';

        await supabase
          .from('scheduled_launches')
          .update({
            status: 'failed',
            error_message: message,
          })
          .eq('id', launch.id);

        failed++;
      }
    }

    return new Response(JSON.stringify({ processed, failed }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function submitToJito(transaction: VersionedTransaction): Promise<string> {
  const serializedTx = btoa(String.fromCharCode(...transaction.serialize()));

  const response = await fetch(`${JITO_BLOCK_ENGINE_URL}/api/v1/bundles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'sendBundle',
      params: [[serializedTx]],
    }),
  });

  const result = await response.json();
  if (result.error) throw new Error(result.error.message);

  // Poll for confirmation
  const bundleId = result.result;
  for (let i = 0; i < 30; i++) {
    const statusRes = await fetch(`${JITO_BLOCK_ENGINE_URL}/api/v1/bundles/${bundleId}`);
    const status = await statusRes.json();

    if (status.status === 'Landed') return status.transactions[0].signature;
    if (status.status === 'Failed') throw new Error(status.error || 'Bundle failed');

    await new Promise(r => setTimeout(r, 500));
  }

  throw new Error('Bundle confirmation timeout');
}
