import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: token,
          resetTokenExp: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

      await sendEmail({
        to: email,
        subject: "Reset your Kayu password",
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px">
            <div style="text-align:center;margin-bottom:24px">
              <span style="font-size:28px;font-weight:700;color:#6366f1">Ka</span><span style="font-size:28px;font-weight:300;color:#111827">yu</span>
            </div>
            <h2 style="font-size:20px;font-weight:600;margin-bottom:8px;color:#111827">Reset your password</h2>
            <p style="color:#6b7280;font-size:14px;margin-bottom:24px">Click the button below to set a new password. This link expires in 1 hour.</p>
            <a href="${resetUrl}" style="display:inline-block;background:#6366f1;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Reset Password</a>
            <p style="color:#9ca3af;font-size:12px;margin-top:24px">If you didn't request this, you can ignore this email.</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
