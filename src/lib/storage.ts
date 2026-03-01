import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

let s3Client: S3Client | null = null;

function getS3(): S3Client | null {
  if (s3Client) return s3Client;
  const region = process.env.AWS_REGION || "us-east-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return null;
  s3Client = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
  return s3Client;
}

function getBucket(): string {
  return process.env.AWS_S3_BUCKET || "kayu-uploads";
}

export async function uploadFile(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const client = getS3();

  if (client) {
    await client.send(new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
    return `s3://${getBucket()}/${key}`;
  }

  // Local fallback for development
  const uploadDir = path.join(process.cwd(), "public", "uploads", "documents");
  await mkdir(uploadDir, { recursive: true });
  const filename = key.split("/").pop()!;
  await writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/documents/${filename}`;
}

export async function getFileUrl(key: string): Promise<string> {
  if (!key.startsWith("s3://")) return key;

  const client = getS3();
  if (!client) return key;

  const s3Key = key.replace(`s3://${getBucket()}/`, "");
  const command = new GetObjectCommand({ Bucket: getBucket(), Key: s3Key });
  return getSignedUrl(client, command, { expiresIn: 3600 });
}

export async function deleteFile(key: string): Promise<void> {
  if (key.startsWith("s3://")) {
    const client = getS3();
    if (!client) return;
    const s3Key = key.replace(`s3://${getBucket()}/`, "");
    await client.send(new DeleteObjectCommand({ Bucket: getBucket(), Key: s3Key }));
  } else {
    const filePath = path.join(process.cwd(), "public", key);
    await unlink(filePath).catch(() => {});
  }
}
