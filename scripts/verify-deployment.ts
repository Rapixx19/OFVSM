#!/usr/bin/env npx ts-node
/**
 * @file verify-deployment.ts
 * @summary Pre-deployment environment validation script
 * Ensures all required environment variables are present before build
 */

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
}

const REQUIRED_ENV_VARS: EnvVar[] = [
  // Supabase (Required)
  { name: 'NEXT_PUBLIC_SUPABASE_URL', required: true, description: 'Supabase project URL' },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true, description: 'Supabase anon/public key' },

  // Solana (Required)
  { name: 'NEXT_PUBLIC_SOLANA_RPC_URL', required: true, description: 'Solana RPC endpoint' },
  { name: 'NEXT_PUBLIC_SOLANA_NETWORK', required: true, description: 'Solana network (devnet/mainnet-beta)' },

  // Sentinel Agent API (Required for production)
  { name: 'NEXT_PUBLIC_HELIUS_API_KEY', required: true, description: 'Helius API key for Sentinel Agent' },

  // Hype-Man Agent API (Required for production)
  { name: 'NEXT_PUBLIC_GEMINI_API_KEY', required: true, description: 'Gemini API key for Hype-Man Agent' },

  // Program IDs (Optional - have defaults)
  { name: 'NEXT_PUBLIC_LOCKER_PROGRAM_ID', required: false, description: 'Locker program ID' },
  { name: 'NEXT_PUBLIC_SESSION_PROGRAM_ID', required: false, description: 'Session program ID' },
  { name: 'NEXT_PUBLIC_VECTERAI_FEE_WALLET', required: false, description: 'Fee collection wallet' },
  { name: 'NEXT_PUBLIC_PLATFORM_FEE_BPS', required: false, description: 'Platform fee in basis points' },
  { name: 'NEXT_PUBLIC_JITO_BLOCK_ENGINE_URL', required: false, description: 'Jito block engine URL' },

  // Telegram (Optional)
  { name: 'TELEGRAM_BOT_TOKEN', required: false, description: 'Telegram bot token for notifications' },
  { name: 'TELEGRAM_CHANNEL_ID', required: false, description: 'Telegram channel ID' },

  // Server-side only (Required for edge functions)
  { name: 'SUPABASE_SERVICE_ROLE_KEY', required: false, description: 'Supabase service role key (server-side)' },
];

function checkEnvVars(): { missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar.name];

    if (!value || value.trim() === '') {
      if (envVar.required) {
        missing.push(`${envVar.name} - ${envVar.description}`);
      } else {
        warnings.push(`${envVar.name} - ${envVar.description}`);
      }
    }
  }

  return { missing, warnings };
}

function main(): void {
  console.log('\n🔍 VECTERAI Deployment Environment Validation\n');
  console.log('━'.repeat(50));

  const { missing, warnings } = checkEnvVars();

  // Show warnings for optional vars
  if (warnings.length > 0) {
    console.log('\n⚠️  Optional environment variables not set:\n');
    warnings.forEach((w) => console.log(`   • ${w}`));
  }

  // Show errors for required vars
  if (missing.length > 0) {
    console.log('\n❌ MISSING REQUIRED ENVIRONMENT VARIABLES:\n');
    missing.forEach((m) => console.log(`   • ${m}`));
    console.log('\n━'.repeat(50));
    console.log('❌ Build failed: Missing required environment variables');
    console.log('   Please set these in your Vercel Dashboard or .env.local\n');
    process.exit(1);
  }

  console.log('\n━'.repeat(50));
  console.log('✅ All required environment variables are set');
  console.log('   Ready for deployment!\n');
}

main();
