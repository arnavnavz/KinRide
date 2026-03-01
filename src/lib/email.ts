import { Resend } from "resend";

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

function getFrom(): string {
  return process.env.EMAIL_FROM || "Kayu <noreply@kayu.app>";
}

const BRAND = {
  primary: "#6366f1",
  primaryDark: "#4f46e5",
  bg: "#f9fafb",
  text: "#111827",
  textMuted: "#6b7280",
  green: "#22c55e",
  white: "#ffffff",
  border: "#e5e7eb",
};

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:${BRAND.text};line-height:1.6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:${BRAND.white};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,${BRAND.primary},${BRAND.primaryDark});padding:28px 32px;text-align:center;">
<span style="font-size:28px;font-weight:800;color:${BRAND.white};letter-spacing:-0.5px;">Kayu</span>
</td></tr>
<tr><td style="padding:32px;">
${content}
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid ${BRAND.border};text-align:center;">
<p style="margin:0;font-size:12px;color:${BRAND.textMuted};">
&copy; ${new Date().getFullYear()} Kayu. All rights reserved.<br>
<a href="https://kayu.app/unsubscribe" style="color:${BRAND.textMuted};text-decoration:underline;">Unsubscribe</a> from these emails.
</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  body?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL-DEV] To: ${options.to} | Subject: ${options.subject}`);
    console.log(`[EMAIL-DEV] Body preview: ${(options.html || options.body || "").substring(0, 300)}...`);
    return true;
  }

  try {
    const resend = getResend();
    await resend.emails.send({
      from: getFrom(),
      to: options.to,
      subject: options.subject,
      html: options.html || options.body || "",
    });
    return true;
  } catch (err) {
    console.error("[EMAIL] Failed to send:", err);
    return false;
  }
}

export async function sendRideReceipt(
  to: string,
  ride: {
    pickupAddress: string;
    dropoffAddress: string;
    estimatedFare: number;
    platformFee: number | null;
    kinDiscount?: number | null;
    driverName: string;
    vehicleInfo?: string;
    date: string;
  }
): Promise<boolean> {
  const total = ride.estimatedFare;
  const fee = ride.platformFee ?? 0;
  const discount = ride.kinDiscount ?? 0;
  const charged = total - discount;

  let fareRows = `
<tr>
  <td style="padding:8px 0;color:${BRAND.text};">Trip fare</td>
  <td style="padding:8px 0;text-align:right;font-weight:600;color:${BRAND.text};">$${total.toFixed(2)}</td>
</tr>`;

  if (fee > 0) {
    fareRows += `
<tr>
  <td style="padding:8px 0;color:${BRAND.textMuted};font-size:14px;">Platform fee</td>
  <td style="padding:8px 0;text-align:right;color:${BRAND.textMuted};font-size:14px;">$${fee.toFixed(2)}</td>
</tr>`;
  }

  if (discount > 0) {
    fareRows += `
<tr>
  <td style="padding:8px 0;color:${BRAND.green};font-size:14px;">Kin discount</td>
  <td style="padding:8px 0;text-align:right;color:${BRAND.green};font-size:14px;">-$${discount.toFixed(2)}</td>
</tr>`;
  }

  fareRows += `
<tr>
  <td style="padding:12px 0 0;border-top:1px solid ${BRAND.border};font-weight:700;font-size:18px;color:${BRAND.text};">Total charged</td>
  <td style="padding:12px 0 0;border-top:1px solid ${BRAND.border};text-align:right;font-weight:700;font-size:18px;color:${BRAND.primary};">$${charged.toFixed(2)}</td>
</tr>`;

  const html = layout(`
<h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:${BRAND.text};">Trip Receipt</h1>
<p style="margin:0 0 24px;font-size:14px;color:${BRAND.textMuted};">${ride.date}</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
<tr>
  <td style="padding:0 12px 0 0;vertical-align:top;width:20px;">
    <div style="width:12px;height:12px;border-radius:50%;background-color:${BRAND.green};margin-top:4px;"></div>
    <div style="width:2px;height:28px;background-color:${BRAND.border};margin:4px auto;"></div>
    <div style="width:12px;height:12px;border-radius:50%;background-color:${BRAND.primary};"></div>
  </td>
  <td style="vertical-align:top;">
    <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:${BRAND.text};">Pickup</p>
    <p style="margin:0 0 16px;font-size:13px;color:${BRAND.textMuted};">${ride.pickupAddress}</p>
    <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:${BRAND.text};">Drop-off</p>
    <p style="margin:0;font-size:13px;color:${BRAND.textMuted};">${ride.dropoffAddress}</p>
  </td>
</tr>
</table>

<div style="background-color:${BRAND.bg};border-radius:8px;padding:16px;margin-bottom:24px;">
<p style="margin:0 0 4px;font-size:13px;color:${BRAND.textMuted};">Driver</p>
<p style="margin:0;font-size:15px;font-weight:600;color:${BRAND.text};">${ride.driverName}</p>
${ride.vehicleInfo ? `<p style="margin:4px 0 0;font-size:13px;color:${BRAND.textMuted};">${ride.vehicleInfo}</p>` : ""}
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${fareRows}
</table>

<p style="margin:28px 0 0;text-align:center;font-size:14px;color:${BRAND.textMuted};">Thank you for riding with Kayu</p>
`);

  return sendEmail({
    to,
    subject: `Your Kayu receipt — $${charged.toFixed(2)}`,
    html,
  });
}

export async function sendWelcomeEmail(
  to: string,
  name: string,
  role: "rider" | "driver"
): Promise<boolean> {
  const isDriver = role === "driver";
  const heading = isDriver ? "Welcome to the Kayu driver team!" : "Welcome to Kayu!";
  const message = isDriver
    ? "Your driver account has been created. Complete your verification to start accepting rides and earning on your terms."
    : "Your account is ready. Book your first ride and experience a better way to get around — powered by community.";
  const ctaText = isDriver ? "Complete Verification" : "Book Your First Ride";
  const ctaLink = isDriver ? "https://kayu.app/driver/dashboard" : "https://kayu.app/rider/request";

  const html = layout(`
<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${BRAND.text};">Hey ${name} 👋</h1>
<h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:${BRAND.primary};">${heading}</h2>
<p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};">${message}</p>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
<tr><td style="background-color:${BRAND.primary};border-radius:8px;">
<a href="${ctaLink}" style="display:inline-block;padding:12px 32px;color:${BRAND.white};font-size:15px;font-weight:600;text-decoration:none;">
${ctaText}
</a>
</td></tr>
</table>

<p style="margin:0;font-size:14px;color:${BRAND.textMuted};text-align:center;">
If you have questions, reply to this email — we're happy to help.
</p>
`);

  return sendEmail({
    to,
    subject: heading,
    html,
  });
}

export async function sendDriverVerificationUpdate(
  to: string,
  name: string,
  status: "approved" | "rejected" | "pending",
  reason?: string
): Promise<boolean> {
  const titles: Record<string, string> = {
    approved: "You're approved to drive!",
    rejected: "Verification update",
    pending: "Verification in progress",
  };

  const colors: Record<string, string> = {
    approved: BRAND.green,
    rejected: "#ef4444",
    pending: "#f59e0b",
  };

  const messages: Record<string, string> = {
    approved:
      "Great news — your documents have been verified and your account is now active. You can start accepting ride requests immediately.",
    rejected:
      "Unfortunately, we were unable to verify your documents at this time. Please review the details below and resubmit.",
    pending:
      "We've received your documents and they are currently under review. We'll notify you once the process is complete.",
  };

  const html = layout(`
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${BRAND.text};">Hi ${name},</h1>

<div style="background-color:${colors[status]}15;border-left:4px solid ${colors[status]};border-radius:0 8px 8px 0;padding:16px;margin-bottom:20px;">
<p style="margin:0;font-size:16px;font-weight:600;color:${colors[status]};">${titles[status]}</p>
</div>

<p style="margin:0 0 20px;font-size:15px;color:${BRAND.textMuted};">${messages[status]}</p>

${reason ? `
<div style="background-color:${BRAND.bg};border-radius:8px;padding:16px;margin-bottom:20px;">
<p style="margin:0 0 4px;font-size:13px;font-weight:600;color:${BRAND.text};">Reason</p>
<p style="margin:0;font-size:14px;color:${BRAND.textMuted};">${reason}</p>
</div>
` : ""}

${status === "approved" ? `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
<tr><td style="background-color:${BRAND.primary};border-radius:8px;">
<a href="https://kayu.app/driver/dashboard" style="display:inline-block;padding:12px 32px;color:${BRAND.white};font-size:15px;font-weight:600;text-decoration:none;">
Go to Dashboard
</a>
</td></tr>
</table>
` : ""}

${status === "rejected" ? `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
<tr><td style="background-color:${BRAND.primary};border-radius:8px;">
<a href="https://kayu.app/auth/driver-signup" style="display:inline-block;padding:12px 32px;color:${BRAND.white};font-size:15px;font-weight:600;text-decoration:none;">
Resubmit Documents
</a>
</td></tr>
</table>
` : ""}
`);

  return sendEmail({
    to,
    subject: `Kayu — ${titles[status]}`,
    html,
  });
}

export async function sendWeeklyEarningsEmail(
  to: string,
  driver: {
    name: string;
    weeklyGross: number;
    weeklyFees: number;
    weeklyNet: number;
    ridesCount: number;
  }
): Promise<boolean> {
  const avgPerRide = driver.ridesCount > 0 ? (driver.weeklyNet / driver.ridesCount).toFixed(2) : "0.00";

  const html = layout(`
<h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:${BRAND.text};">Weekly Earnings Summary</h1>
<p style="margin:0 0 24px;font-size:14px;color:${BRAND.textMuted};">Hi ${driver.name}, here's how you did this week.</p>

<div style="text-align:center;padding:24px;background:linear-gradient(135deg,${BRAND.primary},${BRAND.primaryDark});border-radius:12px;margin-bottom:24px;">
<p style="margin:0 0 4px;font-size:13px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:1px;">Net Earnings</p>
<p style="margin:0;font-size:36px;font-weight:800;color:${BRAND.white};">$${driver.weeklyNet.toFixed(2)}</p>
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
<tr>
  <td style="width:33%;text-align:center;padding:16px 8px;background-color:${BRAND.bg};border-radius:8px 0 0 8px;">
    <p style="margin:0 0 2px;font-size:20px;font-weight:700;color:${BRAND.text};">${driver.ridesCount}</p>
    <p style="margin:0;font-size:12px;color:${BRAND.textMuted};">Rides</p>
  </td>
  <td style="width:34%;text-align:center;padding:16px 8px;background-color:${BRAND.bg};border-left:2px solid ${BRAND.white};border-right:2px solid ${BRAND.white};">
    <p style="margin:0 0 2px;font-size:20px;font-weight:700;color:${BRAND.text};">$${driver.weeklyGross.toFixed(2)}</p>
    <p style="margin:0;font-size:12px;color:${BRAND.textMuted};">Gross</p>
  </td>
  <td style="width:33%;text-align:center;padding:16px 8px;background-color:${BRAND.bg};border-radius:0 8px 8px 0;">
    <p style="margin:0 0 2px;font-size:20px;font-weight:700;color:${BRAND.text};">$${avgPerRide}</p>
    <p style="margin:0;font-size:12px;color:${BRAND.textMuted};">Avg/Ride</p>
  </td>
</tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
  <td style="padding:10px 0;color:${BRAND.text};font-size:14px;">Gross earnings</td>
  <td style="padding:10px 0;text-align:right;font-weight:600;color:${BRAND.text};font-size:14px;">$${driver.weeklyGross.toFixed(2)}</td>
</tr>
<tr>
  <td style="padding:10px 0;color:${BRAND.textMuted};font-size:14px;">Platform fees</td>
  <td style="padding:10px 0;text-align:right;color:${BRAND.textMuted};font-size:14px;">-$${driver.weeklyFees.toFixed(2)}</td>
</tr>
<tr>
  <td style="padding:12px 0 0;border-top:1px solid ${BRAND.border};font-weight:700;color:${BRAND.text};">Net earnings</td>
  <td style="padding:12px 0 0;border-top:1px solid ${BRAND.border};text-align:right;font-weight:700;color:${BRAND.primary};">$${driver.weeklyNet.toFixed(2)}</td>
</tr>
</table>

<p style="margin:28px 0 0;text-align:center;font-size:14px;color:${BRAND.textMuted};">Keep up the great work — see you on the road!</p>
`);

  return sendEmail({
    to,
    subject: `Your weekly earnings: $${driver.weeklyNet.toFixed(2)}`,
    html,
  });
}

export function buildReceiptEmail(ride: {
  pickupAddress: string;
  dropoffAddress: string;
  estimatedFare: number;
  platformFee: number | null;
  driverName: string;
  date: string;
}): EmailOptions {
  return {
    to: "",
    subject: `Your Kayu receipt — $${ride.estimatedFare.toFixed(2)}`,
    body: `Trip Receipt\n\nDate: ${ride.date}\nDriver: ${ride.driverName}\n\nFrom: ${ride.pickupAddress}\nTo: ${ride.dropoffAddress}\n\nFare: $${ride.estimatedFare.toFixed(2)}${ride.platformFee ? `\nPlatform Fee: $${ride.platformFee.toFixed(2)}` : ""}\n\nThank you for riding with Kayu!`,
  };
}

export function buildWeeklyEarningsEmail(driver: {
  name: string;
  weeklyGross: number;
  weeklyFees: number;
  weeklyNet: number;
  ridesCount: number;
}): EmailOptions {
  return {
    to: "",
    subject: `Your weekly earnings: $${driver.weeklyNet.toFixed(2)}`,
    body: `Hi ${driver.name},\n\nRides completed: ${driver.ridesCount}\nGross earnings: $${driver.weeklyGross.toFixed(2)}\nPlatform fees: $${driver.weeklyFees.toFixed(2)}\nNet earnings: $${driver.weeklyNet.toFixed(2)}\n\nKeep driving with Kayu!`,
  };
}
