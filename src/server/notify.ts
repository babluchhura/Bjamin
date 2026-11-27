import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { notifications } from '../db/schema.ts';

type QueueInput = {
  userId?: number | null;
  bookingId?: number | null;
  channel: 'email' | 'sms';
  recipient: string;
  subject?: string;
  body: string;
};

/**
 * Records every notification in the database (so admins keep a delivery trail)
 * and dispatches it when a provider is configured:
 *  - Email: RESEND_API_KEY + EMAIL_FROM
 *  - SMS:   TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER
 * Without a provider the record is stored with status "logged" — never faked as sent.
 */
export async function queueNotification(input: QueueInput): Promise<void> {
  const [row] = await db
    .insert(notifications)
    .values({
      userId: input.userId ?? null,
      bookingId: input.bookingId ?? null,
      channel: input.channel,
      recipient: input.recipient,
      subject: input.subject || '',
      body: input.body,
      status: 'queued',
    })
    .returning();

  try {
    if (input.channel === 'email') {
      const apiKey = (process.env.RESEND_API_KEY || '').trim();
      const from = (process.env.EMAIL_FROM || '').trim();
      if (!apiKey || !from) {
        await db.update(notifications).set({ status: 'logged' }).where(eqId(row.id));
        return;
      }
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [input.recipient],
          subject: input.subject || 'Your Utkal Yatra ticket',
          html: `<div style="font-family:system-ui,sans-serif;line-height:1.6">${input.body
            .split('\n')
            .map((line) => `<p style="margin:4px 0">${line}</p>`)
            .join('')}</div>`,
        }),
      });
      await db
        .update(notifications)
        .set({ status: res.ok ? 'sent' : 'failed', error: res.ok ? null : `HTTP ${res.status}` })
        .where(eqId(row.id));
      return;
    }

    const sid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
    const token = (process.env.TWILIO_AUTH_TOKEN || '').trim();
    const fromNumber = (process.env.TWILIO_FROM_NUMBER || '').trim();
    if (!sid || !token || !fromNumber) {
      await db.update(notifications).set({ status: 'logged' }).where(eqId(row.id));
      return;
    }
    const params = new URLSearchParams({ To: input.recipient, From: fromNumber, Body: input.body });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    await db
      .update(notifications)
      .set({ status: res.ok ? 'sent' : 'failed', error: res.ok ? null : `HTTP ${res.status}` })
      .where(eqId(row.id));
  } catch (error) {
    console.error('Notification dispatch failed:', error);
    await db
      .update(notifications)
      .set({ status: 'failed', error: error instanceof Error ? error.message : 'unknown error' })
      .where(eqId(row.id));
  }
}

function eqId(id: number) {
  return eq(notifications.id, id);
}
