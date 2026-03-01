import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile, getFileUrl } from "@/lib/storage";
import crypto from "crypto";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const VALID_DOC_TYPES = ["license_front", "license_back", "insurance", "vehicle_photo", "profile_photo"];

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, RATE_LIMITS.upload);
  if (limited) return limited;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "DRIVER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const docType = formData.get("type") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!docType || !VALID_DOC_TYPES.includes(docType)) {
      return NextResponse.json(
        { error: `Invalid document type. Must be one of: ${VALID_DOC_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, PDF" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const hash = crypto.randomBytes(8).toString("hex");
    const filename = `${docType}_${hash}.${ext}`;

    const url = await uploadFile(buffer, `documents/${session.user.id}/${docType}_${hash}.${ext}`, file.type);

    const existing = await prisma.driverDocument.findFirst({
      where: { driverId: session.user.id, type: docType },
    });

    let doc;
    if (existing) {
      doc = await prisma.driverDocument.update({
        where: { id: existing.id },
        data: { filename, url, status: "pending", reviewNote: null },
      });
    } else {
      doc = await prisma.driverDocument.create({
        data: {
          driverId: session.user.id,
          type: docType,
          filename,
          url,
        },
      });
    }

    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    console.error("Document upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const driverId = req.nextUrl.searchParams.get("driverId") || session.user.id;

    if (session.user.role !== "ADMIN" && driverId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const docs = await prisma.driverDocument.findMany({
      where: { driverId },
      orderBy: { createdAt: "desc" },
    });

    const resolved = await Promise.all(
      docs.map(async (doc) => ({
        ...doc,
        url: await getFileUrl(doc.url),
      }))
    );

    return NextResponse.json(resolved);
  } catch (err) {
    console.error("Get documents error:", err);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}
