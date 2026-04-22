import 'server-only';
import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM || 'onboarding@resend.dev';
const adminNotify = process.env.ADMIN_NOTIFY_EMAIL;

const resend = apiKey ? new Resend(apiKey) : null;

/**
 * Send an email. If Resend rejects (e.g. sandbox sender refusing to deliver
 * to an unverified recipient), we log and continue — callers should never
 * have their flow fail because an email couldn't be delivered.
 */
async function sendSafe(args: {
  to: string | null | undefined;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!resend || !apiKey) {
    console.warn('[email] RESEND_API_KEY not set; skipping send to', args.to);
    return { ok: false, error: 'no_api_key' };
  }
  if (!args.to) {
    return { ok: false, error: 'no_recipient' };
  }
  try {
    const res = await resend.emails.send({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
    });
    if (res.error) {
      console.warn('[email] Resend error:', res.error);
      return { ok: false, error: String(res.error.message ?? res.error) };
    }
    return { ok: true, id: res.data?.id };
  } catch (err) {
    console.warn('[email] send threw:', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendClaimAdminNotification(args: {
  claimantDisplayName: string;
  claimantEmail: string;
  claimantPhone: string | null;
  personId: number;
  personFullName: string;
  siteOrigin: string;
}): Promise<void> {
  await sendSafe({
    to: adminNotify,
    subject: `Koja Family: new claim — ${args.claimantDisplayName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#141e2e; max-width:540px">
        <h2 style="font-family: Georgia, serif; font-weight: 500; color:#0f1f38">New claim awaiting review</h2>
        <p><strong>${escapeHtml(args.claimantDisplayName)}</strong>
          has claimed the spot of <strong>${escapeHtml(args.personFullName)}</strong>
          (<code>#${args.personId}</code>).</p>
        <table style="margin-top:12px; font-size:14px">
          <tr><td style="padding:4px 12px 4px 0; color:#6b7890">Email</td><td>${escapeHtml(args.claimantEmail)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0; color:#6b7890">Phone</td><td>${escapeHtml(args.claimantPhone ?? '\u2014')}</td></tr>
        </table>
        <p style="margin-top:20px">
          <a href="${args.siteOrigin}/admin"
             style="display:inline-block; padding:10px 20px; background:#0f1f38; color:#fdfbf6; text-decoration:none; font-family: Georgia, serif">
             Review claim \u2192
          </a>
        </p>
        <p style="margin-top:16px; font-size:12px; color:#6b7890">
          They'll see the normal site until you approve or reject. Their edits
          stay in the pending queue until approval.
        </p>
      </div>
    `,
  });
}

export async function sendClaimWelcome(args: {
  to: string;
  displayName: string;
  siteOrigin: string;
}): Promise<void> {
  await sendSafe({
    to: args.to,
    subject: 'Welcome to the Koja Family site',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#141e2e; max-width:540px">
        <h2 style="font-family: Georgia, serif; font-weight: 500; color:#0f1f38">Welcome, ${escapeHtml(args.displayName)}</h2>
        <p>Your spot on the Koja family tree is claimed. You can sign in any time at
          <a href="${args.siteOrigin}/login">${args.siteOrigin}/login</a>.</p>
        <p>An administrator will review your claim soon. Until then, edits you make
          to your own profile and your direct ancestors (father, grandfather,
          great-grandfather) are saved and visible only to you. Once approved,
          they\u2019ll become visible to the whole family.</p>
        <p style="margin-top:20px">
          <a href="${args.siteOrigin}/profile/me"
             style="display:inline-block; padding:10px 20px; background:#0f1f38; color:#fdfbf6; text-decoration:none; font-family: Georgia, serif">
             Go to your profile \u2192
          </a>
        </p>
      </div>
    `,
  });
}

export async function sendClaimReminderAdmin(args: {
  kind: '24h' | '1wk';
  claimantDisplayName: string;
  claimantEmail: string;
  personId: number;
  personFullName: string;
  ageHours: number;
  siteOrigin: string;
}): Promise<void> {
  const ageLabel =
    args.kind === '24h'
      ? 'over 24 hours ago'
      : `about ${Math.round(args.ageHours / 24)} days ago`;
  await sendSafe({
    to: adminNotify,
    subject:
      args.kind === '24h'
        ? `Koja Family: 24-hour reminder — ${args.claimantDisplayName}`
        : `Koja Family: 1-week reminder — ${args.claimantDisplayName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#141e2e; max-width:540px">
        <h2 style="font-family: Georgia, serif; font-weight: 500; color:#0f1f38">Claim still awaiting your review</h2>
        <p><strong>${escapeHtml(args.claimantDisplayName)}</strong>
          claimed the spot of <strong>${escapeHtml(args.personFullName)}</strong>
          (<code>#${args.personId}</code>) <strong>${ageLabel}</strong>
          and is still waiting.</p>
        <table style="margin-top:12px; font-size:14px">
          <tr><td style="padding:4px 12px 4px 0; color:#6b7890">Email</td><td>${escapeHtml(args.claimantEmail)}</td></tr>
        </table>
        <p style="margin-top:20px">
          <a href="${args.siteOrigin}/admin"
             style="display:inline-block; padding:10px 20px; background:#0f1f38; color:#fdfbf6; text-decoration:none; font-family: Georgia, serif">
             Review claim \u2192
          </a>
        </p>
      </div>
    `,
  });
}

export async function sendClaimApproved(args: {
  to: string;
  displayName: string;
  siteOrigin: string;
}): Promise<void> {
  await sendSafe({
    to: args.to,
    subject: 'Your Koja Family account is active',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#141e2e; max-width:540px">
        <h2 style="font-family: Georgia, serif; font-weight: 500; color:#0f1f38">You\u2019re approved, ${escapeHtml(args.displayName)}</h2>
        <p>Your claim has been reviewed and approved. Any edits you had saved
          are now visible to the whole family.</p>
        <p style="margin-top:20px">
          <a href="${args.siteOrigin}"
             style="display:inline-block; padding:10px 20px; background:#0f1f38; color:#fdfbf6; text-decoration:none; font-family: Georgia, serif">
             Visit kojafamily.com
          </a>
        </p>
      </div>
    `,
  });
}

export async function sendAdditionRequest(args: {
  firstName: string;
  gender: 'M' | 'F' | null;
  fatherName: string;
  fatherId: number;
  fatherFullName: string;
  requesterEmail: string;
  requesterNote: string | null;
  siteOrigin: string;
}): Promise<void> {
  await sendSafe({
    to: adminNotify,
    subject: `Koja Family: request to add ${args.firstName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#141e2e; max-width:540px">
        <h2 style="font-family: Georgia, serif; font-weight: 500; color:#0f1f38">New request to be added to the tree</h2>
        <table style="margin-top:12px; font-size:14px">
          <tr><td style="padding:4px 12px 4px 0; color:#6b7890">First name</td><td><strong>${escapeHtml(args.firstName)}</strong></td></tr>
          ${args.gender ? `<tr><td style="padding:4px 12px 4px 0; color:#6b7890">Gender</td><td>${args.gender === 'F' ? 'Female' : 'Male'}</td></tr>` : ''}
          <tr><td style="padding:4px 12px 4px 0; color:#6b7890; vertical-align:top">Father</td><td>${escapeHtml(args.fatherName)} <code>#${args.fatherId}</code><br><span style="color:#6b7890; font-size:12px">${escapeHtml(args.fatherFullName)}</span></td></tr>
          <tr><td style="padding:4px 12px 4px 0; color:#6b7890">Requester email</td><td>${escapeHtml(args.requesterEmail)}</td></tr>
          ${args.requesterNote ? `<tr><td style="padding:4px 12px 4px 0; color:#6b7890; vertical-align:top">Note</td><td style="white-space:pre-wrap">${escapeHtml(args.requesterNote)}</td></tr>` : ''}
        </table>
        <p style="margin-top:20px">
          <a href="${args.siteOrigin}/profile/${args.fatherId}"
             style="display:inline-block; padding:10px 20px; background:#0f1f38; color:#fdfbf6; text-decoration:none; font-family: Georgia, serif">
             Open father\u2019s profile \u2192
          </a>
        </p>
        <p style="margin-top:16px; font-size:12px; color:#6b7890">
          On the father's profile you can click "Add a child" to add the person directly.
        </p>
      </div>
    `,
  });
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
