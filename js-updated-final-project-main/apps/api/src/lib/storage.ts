import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { config } from "./config.js";

const uploadsDir = path.resolve("uploads");

const s3 = new S3Client({
  region: config.awsRegion,
  endpoint: config.s3Endpoint || undefined,
  forcePathStyle: config.s3ForcePathStyle
});

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function putPdf(objectKey: string, bytes: Buffer) {
  if (config.localFileStorage) {
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(path.join(uploadsDir, objectKey.replace(/[\\/]/g, "_")), bytes);
    return;
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: config.s3Bucket,
      Key: objectKey,
      Body: bytes,
      ContentType: "application/pdf"
    })
  );
}

export async function getPdf(objectKey: string) {
  if (config.localFileStorage) {
    return fs.readFile(path.join(uploadsDir, objectKey.replace(/[\\/]/g, "_")));
  }

  const response = await s3.send(new GetObjectCommand({ Bucket: config.s3Bucket, Key: objectKey }));
  if (!response.Body) throw new Error("Empty object");
  return streamToBuffer(response.Body as Readable);
}

export async function deletePdf(objectKey: string) {
  if (config.localFileStorage) {
    await fs.rm(path.join(uploadsDir, objectKey.replace(/[\\/]/g, "_")), { force: true });
    return;
  }

  await s3.send(new DeleteObjectCommand({ Bucket: config.s3Bucket, Key: objectKey }));
}
