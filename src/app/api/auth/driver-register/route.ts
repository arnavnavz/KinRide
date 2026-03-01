import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail, sendEmail } from "@/lib/email";

function generateKinCode(name: string): string {
  const prefix = name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase();
  const digits = Math.floor(1000 + Math.random() * 9000).toString();
  return prefix + digits;
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, RATE_LIMITS.auth);
  if (limited) return limited;

  try {
    const body = await req.json();
    const {
      name,
      email,
      phone,
      password,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      vehicleColor,
      licensePlate,
    } = body;

    const missing = [];
    if (!name) missing.push("name");
    if (!email) missing.push("email");
    if (!phone) missing.push("phone");
    if (!password) missing.push("password");
    if (!vehicleMake) missing.push("vehicleMake");
    if (!vehicleModel) missing.push("vehicleModel");
    if (!vehicleYear) missing.push("vehicleYear");
    if (!vehicleColor) missing.push("vehicleColor");
    if (!licensePlate) missing.push("licensePlate");

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const year = parseInt(vehicleYear, 10);
    if (isNaN(year) || year < 1990 || year > new Date().getFullYear() + 1) {
      return NextResponse.json(
        { error: "Invalid vehicle year" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let kinCode = generateKinCode(name);
    let codeExists = await prisma.driverProfile.findUnique({
      where: { kinCode },
    });
    while (codeExists) {
      kinCode = generateKinCode(name);
      codeExists = await prisma.driverProfile.findUnique({
        where: { kinCode },
      });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        phone,
        passwordHash,
        role: "DRIVER",
        driverProfile: {
          create: {
            vehicleMake,
            vehicleModel,
            vehicleYear: year,
            vehicleColor,
            licensePlate: licensePlate.toUpperCase(),
            kinCode,
          },
        },
        driverSubscription: {
          create: {
            plan: "FREE",
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        driverProfile: {
          select: {
            kinCode: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleYear: true,
            vehicleColor: true,
            licensePlate: true,
          },
        },
      },
    });

    // Send verification email
    const verifyToken = crypto.randomBytes(32).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: { verifyToken },
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
          <p style="color:#6b7280;font-size:14px;margin-bottom:24px">Hi ${user.name}, click the button below to verify your email address and activate your driver account.</p>
          <a href="${verifyUrl}" style="display:inline-block;background:#6366f1;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Verify Email</a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">If you didn't create this account, you can ignore this email.</p>
        </div>
      `,
    }).catch(() => {});

    // Send welcome email
    sendWelcomeEmail(user.email, user.name, "driver").catch(() => {});

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Driver registration error:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
