import { type Request } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const MAGIC_BYTES: Record<string, Buffer[]> = {
  jpeg: [Buffer.from([0xff, 0xd8, 0xff])],
  png: [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  webp: [Buffer.from("RIFF"), Buffer.from("WEBP")],
};

function detectFileType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  for (const [ext, signatures] of Object.entries(MAGIC_BYTES)) {
    if (ext === "webp") {
      const riffSig = signatures[0];
      const webpSig = signatures[1];
      if (!riffSig || !webpSig) continue;
      const riffMatch = buffer.subarray(0, 4).equals(riffSig);
      const webpMatch = buffer.subarray(8, 12).equals(webpSig);
      if (riffMatch && webpMatch) return ext;
    } else {
      const sig = signatures[0];
      if (!sig) continue;
      if (buffer.subarray(0, sig.length).equals(sig)) return ext;
    }
  }
  return null;
}

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const BLOCKED_EXTENSIONS = new Set([".htm", ".html", ".svg", ".js", ".php", ".exe", ".bat", ".cmd", ".sh"]);

const storage = multer.memoryStorage();

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (BLOCKED_EXTENSIONS.has(ext)) {
    cb(new Error("File type not allowed"));
    return;
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    cb(new Error("Only .jpeg, .jpg, .png, and .webp images are allowed"));
    return;
  }

  cb(null, true);
};

export const uploadSingleImage = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
}).single("image");

export function validateMagicBytes(buffer: Buffer): string | null {
  return detectFileType(buffer);
}

export function generateReturnImageFilename(originalname: string, detectedExt: string): string {
  return `return-${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${detectedExt}`;
}

export function generateReviewImageFilename(detectedExt: string): string {
  return `review-${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${detectedExt}`;
}

export const uploadMultipleImages = (maxCount = 3) =>
  multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE, files: maxCount },
    fileFilter,
  }).array("images", maxCount);
