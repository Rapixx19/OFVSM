/**
 * @file TelegramService.ts
 * @summary Telegram Bot API integration for launch alerts
 * @dependencies N/A
 */

/**
 * Telegram Bot API endpoint
 */
const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

/**
 * Launch alert payload
 */
interface LaunchAlert {
  ticker: string;
  mintAddress: string;
  lockDays: number;
  isVerified: boolean;
  signature?: string;
}

/**
 * TelegramService - Sends launch alerts to project channel
 */
export class TelegramService {
  private readonly botToken: string;
  private readonly channelId: string;

  constructor(botToken?: string, channelId?: string) {
    this.botToken = botToken || process.env.TELEGRAM_BOT_TOKEN || '';
    this.channelId = channelId || process.env.TELEGRAM_CHANNEL_ID || '';
  }

  /**
   * Send a launch alert to the project channel
   */
  async sendLaunchAlert(alert: LaunchAlert): Promise<boolean> {
    if (!this.botToken || !this.channelId) {
      console.warn('Telegram not configured, skipping alert');
      return false;
    }

    const message = this.formatAlertMessage(alert);

    try {
      const response = await fetch(
        `${TELEGRAM_API_URL}${this.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.channelId,
            text: message,
            parse_mode: 'HTML',
            disable_web_page_preview: false,
          }),
        }
      );

      if (!response.ok) {
        console.error('Telegram API error:', response.status);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to send Telegram alert:', error);
      return false;
    }
  }

  /**
   * Format the alert message with HTML markup
   */
  private formatAlertMessage(alert: LaunchAlert): string {
    const verifiedBadge = alert.isVerified ? '✅ Sentinel Verified' : '⚠️ Unverified';
    const solscanUrl = alert.signature
      ? `https://solscan.io/tx/${alert.signature}`
      : `https://solscan.io/token/${alert.mintAddress}`;

    return `🚀 <b>New Token Launch</b>

<b>$${alert.ticker}</b>
${verifiedBadge}

🔒 LP Lock: <b>${alert.lockDays} Days</b>
📍 Mint: <code>${this.truncateAddress(alert.mintAddress)}</code>

<a href="${solscanUrl}">View on Solscan</a>

Launched via VECTERAI Foundation`;
  }

  /**
   * Truncate address for display
   */
  private truncateAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
}

let telegramInstance: TelegramService | null = null;

export function getTelegramService(): TelegramService {
  if (!telegramInstance) {
    telegramInstance = new TelegramService();
  }
  return telegramInstance;
}
