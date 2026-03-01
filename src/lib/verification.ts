import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { sendDriverVerificationUpdate } from "@/lib/email";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}
const CHECKR_API_KEY = process.env.CHECKR_API_KEY || "";
const CHECKR_BASE = "https://api.checkr.com/v1";

// ─── Stripe Identity ───────────────────────────────────────────────

export async function createStripeVerificationSession(driverId: string) {
  const driver = await prisma.user.findUnique({
    where: { id: driverId },
    include: { driverProfile: true },
  });

  if (!driver || !driver.driverProfile) {
    throw new Error("Driver not found");
  }

  const session = await getStripe().identity.verificationSessions.create({
    type: "document",
    metadata: {
      driverId: driver.id,
      driverProfileId: driver.driverProfile.id,
    },
    options: {
      document: {
        require_matching_selfie: true,
        allowed_types: ["driving_license"],
      },
    },
    return_url: `${process.env.NEXTAUTH_URL}/driver/dashboard?verified=1`,
  });

  await prisma.driverProfile.update({
    where: { userId: driverId },
    data: {
      stripeVerificationId: session.id,
      stripeVerificationStatus: "pending",
    },
  });

  return { sessionId: session.id, url: session.url };
}

export async function handleStripeVerificationResult(sessionId: string) {
  const session = await getStripe().identity.verificationSessions.retrieve(sessionId);

  const profile = await prisma.driverProfile.findFirst({
    where: { stripeVerificationId: sessionId },
  });

  if (!profile) {
    console.error("No driver profile found for verification session:", sessionId);
    return;
  }

  const status = session.status;
  const updates: Record<string, unknown> = {
    stripeVerificationStatus: status,
  };

  if (status === "verified") {
    updates.isVerified = true;
    updates.idVerifiedAt = new Date();

    // Email the driver about successful ID verification
    const driver = await prisma.user.findUnique({ where: { id: profile.userId }, select: { email: true, name: true } });
    if (driver?.email) {
      sendDriverVerificationUpdate(driver.email, driver.name, "approved").catch(() => {});
    }

    // Kick off Checkr background check in the background
    initiateCheckrBackgroundCheck(profile.userId).catch((err) =>
      console.error("Checkr initiation failed:", err)
    );
  }

  await prisma.driverProfile.update({
    where: { id: profile.id },
    data: updates,
  });
}

// ─── Checkr Background Check ───────────────────────────────────────

export async function initiateCheckrBackgroundCheck(driverId: string) {
  if (!CHECKR_API_KEY) {
    console.warn("CHECKR_API_KEY not set, skipping background check");
    // In dev, auto-mark as clear
    await prisma.driverProfile.update({
      where: { userId: driverId },
      data: { checkrStatus: "clear", backgroundCheckAt: new Date() },
    });
    return;
  }

  const driver = await prisma.user.findUnique({
    where: { id: driverId },
    select: { id: true, name: true, email: true, phone: true },
  });

  if (!driver) throw new Error("Driver not found");

  const nameParts = driver.name.split(" ");
  const firstName = nameParts[0] || driver.name;
  const lastName = nameParts.slice(1).join(" ") || "N/A";

  // Create candidate
  const candidateRes = await fetch(`${CHECKR_BASE}/candidates`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(CHECKR_API_KEY + ":").toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      email: driver.email,
      phone: driver.phone,
    }),
  });

  if (!candidateRes.ok) {
    const err = await candidateRes.text();
    throw new Error(`Checkr candidate creation failed: ${err}`);
  }

  const candidate = await candidateRes.json();

  // Create invitation (triggers background check)
  const inviteRes = await fetch(`${CHECKR_BASE}/invitations`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(CHECKR_API_KEY + ":").toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      candidate_id: candidate.id,
      package: "driver_pro", // Rideshare-specific package
    }),
  });

  if (!inviteRes.ok) {
    const err = await inviteRes.text();
    throw new Error(`Checkr invitation failed: ${err}`);
  }

  await prisma.driverProfile.update({
    where: { userId: driverId },
    data: {
      checkrCandidateId: candidate.id,
      checkrStatus: "pending",
    },
  });
}

export async function handleCheckrWebhook(event: {
  type: string;
  data: { object: { id: string; candidate_id: string; status: string; result?: string } };
}) {
  const { type, data } = event;

  if (type !== "report.completed") return;

  const report = data.object;
  const profile = await prisma.driverProfile.findFirst({
    where: { checkrCandidateId: report.candidate_id },
  });

  if (!profile) {
    console.error("No driver profile for Checkr candidate:", report.candidate_id);
    return;
  }

  const result = report.result || report.status;
  const updates: Record<string, unknown> = {
    checkrReportId: report.id,
    checkrStatus: result,
    backgroundCheckAt: new Date(),
  };

  // If Checkr flags something, revoke verification
  if (result === "consider" || result === "suspended") {
    updates.isVerified = false;
    updates.isOnline = false;
    updates.verificationRevokedAt = new Date();
    updates.revocationReason =
      result === "consider"
        ? "Background check flagged for review — your account has been temporarily suspended pending manual review."
        : "Background check failed — your account has been suspended.";

    // Email the driver about revocation
    const revokedDriver = await prisma.user.findUnique({ where: { id: profile.userId }, select: { email: true, name: true } });
    if (revokedDriver?.email) {
      sendDriverVerificationUpdate(
        revokedDriver.email,
        revokedDriver.name,
        result === "consider" ? "pending" : "rejected",
        updates.revocationReason as string
      ).catch(() => {});
    }

    // Notify the driver
    await prisma.notification.create({
      data: {
        userId: profile.userId,
        title: "Account Update",
        body:
          result === "consider"
            ? "Your background check requires further review. Your account has been temporarily paused."
            : "Your background check did not pass. Your account has been suspended.",
        type: "system",
        linkUrl: "/driver/dashboard",
      },
    });
  }

  await prisma.driverProfile.update({
    where: { id: profile.id },
    data: updates,
  });
}

// ─── Status Helpers ────────────────────────────────────────────────

export type VerificationStatus = {
  idVerification: "not_started" | "pending" | "verified" | "failed";
  backgroundCheck: "not_started" | "pending" | "clear" | "consider" | "suspended";
  overallApproved: boolean;
  revoked: boolean;
  revocationReason: string | null;
};

export function getVerificationStatus(profile: {
  stripeVerificationStatus: string | null;
  checkrStatus: string | null;
  isVerified: boolean;
  verificationRevokedAt: Date | null;
  revocationReason: string | null;
}): VerificationStatus {
  let idVerification: VerificationStatus["idVerification"] = "not_started";
  if (profile.stripeVerificationStatus === "verified") idVerification = "verified";
  else if (profile.stripeVerificationStatus === "pending" || profile.stripeVerificationStatus === "processing")
    idVerification = "pending";
  else if (profile.stripeVerificationStatus === "requires_input") idVerification = "failed";

  let backgroundCheck: VerificationStatus["backgroundCheck"] = "not_started";
  if (profile.checkrStatus === "clear") backgroundCheck = "clear";
  else if (profile.checkrStatus === "pending") backgroundCheck = "pending";
  else if (profile.checkrStatus === "consider") backgroundCheck = "consider";
  else if (profile.checkrStatus === "suspended") backgroundCheck = "suspended";

  return {
    idVerification,
    backgroundCheck,
    overallApproved: profile.isVerified,
    revoked: !!profile.verificationRevokedAt,
    revocationReason: profile.revocationReason,
  };
}
