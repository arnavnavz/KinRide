import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verifyToken = crypto.randomUUID();

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase(),
        passwordHash,
        role: "RIDER",
        emailVerified: false,
        verifyToken,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${verifyToken}`;

    sendEmail({
      to: user.email,
      subject: "Verify your Kayu email",
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <div style="text-align:center;margin-bottom:24px">
            <span style="font-size:28px;font-weight:700;color:#6366f1">Ka</span><span style="font-size:28px;font-weight:300;color:#111827">yu</span>
          </div>
          <h2 style="font-size:20px;font-weight:600;margin-bottom:8px;color:#111827">Verify your email</h2>
          <p style="color:#6b7280;font-size:14px;margin-bottom:24px">Hi ${user.name}, click the button below to verify your email address and activate your account.</p>
          <a href="${verifyUrl}" style="display:inline-block;background:#6366f1;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Verify Email</a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">If you didn't create this account, you can ignore this email.</p>
        </div>
      `,
    }).catch(() => {});

    return NextResponse.json(
      { message: "Account created. Check your email to verify." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Rider registration error:", error);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
