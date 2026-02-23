import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generateReferralCode(name: string): string {
  const prefix = name.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase();
  const suffix = Math.floor(1000 + Math.random() * 9000).toString();
  return `${prefix}${suffix}`;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "RIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let referral = await prisma.referral.findFirst({
      where: { referrerId: session.user.id },
      orderBy: { createdAt: "asc" },
    });

    if (!referral) {
      let code = generateReferralCode(session.user.name || "USER");
      let attempts = 0;
      while (attempts < 10) {
        const exists = await prisma.referral.findUnique({ where: { referralCode: code } });
        if (!exists) break;
        code = generateReferralCode(session.user.name || "USER");
        attempts++;
      }

      referral = await prisma.referral.create({
        data: {
          referrerId: session.user.id,
          referralCode: code,
          rewardAmount: 5.0,
        },
      });
    }

    const allReferrals = await prisma.referral.findMany({
      where: { referrerId: session.user.id },
      include: {
        referee: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      referralCode: referral.referralCode,
      rewardAmount: referral.rewardAmount,
      referrals: allReferrals.map((r) => ({
        id: r.id,
        referralCode: r.referralCode,
        refereeName: r.referee?.name || null,
        isRedeemed: r.isRedeemed,
        rewardAmount: r.rewardAmount,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error("GET /api/referral error:", err);
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
      return NextResponse.json({ error: "Referral code is required" }, { status: 400 });
    }

    const referral = await prisma.referral.findUnique({
      where: { referralCode: code.toUpperCase().trim() },
    });

    if (!referral) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
    }

    if (referral.referrerId === session.user.id) {
      return NextResponse.json({ error: "You can't use your own referral code" }, { status: 400 });
    }

    if (referral.isRedeemed) {
      return NextResponse.json({ error: "This referral code has already been used" }, { status: 400 });
    }

    const alreadyReferred = await prisma.referral.findFirst({
      where: {
        refereeId: session.user.id,
        isRedeemed: true,
      },
    });

    if (alreadyReferred) {
      return NextResponse.json({ error: "You have already used a referral code" }, { status: 400 });
    }

    const creditAmount = Math.round(referral.rewardAmount * 100);

    await prisma.$transaction([
      prisma.referral.update({
        where: { id: referral.id },
        data: {
          refereeId: session.user.id,
          isRedeemed: true,
        },
      }),
      prisma.riderLoyalty.upsert({
        where: { riderId: session.user.id },
        create: { riderId: session.user.id, credits: creditAmount },
        update: { credits: { increment: creditAmount } },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          riderId: session.user.id,
          amount: creditAmount,
          reason: `Referral bonus from code ${referral.referralCode}`,
        },
      }),
      prisma.riderLoyalty.upsert({
        where: { riderId: referral.referrerId },
        create: { riderId: referral.referrerId, credits: creditAmount },
        update: { credits: { increment: creditAmount } },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          riderId: referral.referrerId,
          amount: creditAmount,
          reason: `Referral reward — friend used code ${referral.referralCode}`,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      rewardAmount: referral.rewardAmount,
      message: `$${referral.rewardAmount.toFixed(2)} credit added for both you and your friend!`,
    });
  } catch (err) {
    console.error("POST /api/referral error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
