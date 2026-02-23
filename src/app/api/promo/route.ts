import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "RIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const redemptions = await prisma.promoRedemption.findMany({
      where: { userId: session.user.id },
      include: {
        promoCode: {
          select: {
            code: true,
            description: true,
            discountType: true,
            discountValue: true,
            expiresAt: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ redemptions });
  } catch (err) {
    console.error("GET /api/promo error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "RIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Promo code is required" }, { status: 400 });
    }

    const promo = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!promo) {
      return NextResponse.json({ error: "Invalid promo code" }, { status: 404 });
    }

    if (!promo.isActive) {
      return NextResponse.json({ error: "This promo code is no longer active" }, { status: 400 });
    }

    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return NextResponse.json({ error: "This promo code has expired" }, { status: 400 });
    }

    if (promo.maxUses !== null && promo.usesCount >= promo.maxUses) {
      return NextResponse.json({ error: "This promo code has reached its usage limit" }, { status: 400 });
    }

    const existing = await prisma.promoRedemption.findUnique({
      where: {
        promoCodeId_userId: {
          promoCodeId: promo.id,
          userId: session.user.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "You have already applied this promo code" }, { status: 409 });
    }

    const [redemption] = await prisma.$transaction([
      prisma.promoRedemption.create({
        data: {
          promoCodeId: promo.id,
          userId: session.user.id,
          discount: promo.discountValue,
        },
        include: {
          promoCode: {
            select: {
              code: true,
              description: true,
              discountType: true,
              discountValue: true,
              expiresAt: true,
            },
          },
        },
      }),
      prisma.promoCode.update({
        where: { id: promo.id },
        data: { usesCount: { increment: 1 } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      redemption,
      message: promo.discountType === "percentage"
        ? `${promo.discountValue}% off applied!`
        : `$${promo.discountValue.toFixed(2)} off applied!`,
    });
  } catch (err) {
    console.error("POST /api/promo error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
