import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

function generateKinCode(name: string): string {
  const prefix = name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase();
  const digits = Math.floor(1000 + Math.random() * 9000).toString();
  return prefix + digits;
}

export async function POST(req: NextRequest) {
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

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Driver registration error:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
