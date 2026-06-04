import { writeFile, mkdir, unlink, access } from "fs/promises";
import path from "path";

export const ALLOWED_IMAGE = ["image/jpeg", "image/png"];
export const ALLOWED_PDF   = ["application/pdf"];
export const MAX_BYTES     = 10 * 1024 * 1024; // 10 MB

const EXT_MAP = {
  "image/jpeg":    "jpg",
  "image/png":     "png",
  "application/pdf": "pdf",
};

/**
 * Saves an uploaded file from FormData to public/uploads/...
 * @param {FormData} formData
 * @param {string} fieldName - FormData field name containing the file
 * @param {string[]} allowedTypes - e.g. ALLOWED_IMAGE or ALLOWED_PDF
 * @param {string[]} dirSegments - path segments under public/uploads/ (e.g. ["expat", id])
 * @param {string} baseName - filename without extension (e.g. "photo", "passport", "scan")
 * @returns {{ url: string|null, error: string|null }}
 */
export async function saveUploadedFile(formData, fieldName, allowedTypes, dirSegments, baseName) {
  const file = formData.get(fieldName);
  if (!file || typeof file === "string") return { url: null, error: "File tidak ditemukan" };

  if (!allowedTypes.includes(file.type)) {
    return { url: null, error: `Format tidak didukung. Gunakan: ${allowedTypes.join(", ")}` };
  }

  if (file.size > MAX_BYTES) {
    return { url: null, error: "Ukuran file maksimal 10 MB" };
  }

  const ext = EXT_MAP[file.type];
  const filename = `${baseName}.${ext}`;
  const relDir = ["uploads", ...dirSegments];
  const absDir = path.join(process.cwd(), "public", ...relDir);

  await mkdir(absDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(absDir, filename), buffer);

  // Always use forward slashes for the public URL
  const url = "/" + [...relDir, filename].join("/");
  return { url, error: null };
}

/**
 * Deletes a file given its public URL (e.g. "/uploads/expat/abc/photo.jpg").
 * Silent if the file does not exist.
 */
export async function deleteFileIfExists(publicUrl) {
  if (!publicUrl) return;
  // Strip leading slash and resolve to filesystem path
  const relative = publicUrl.replace(/^\//, "").split("/");
  const absPath = path.join(process.cwd(), "public", ...relative);
  try {
    await access(absPath);
    await unlink(absPath);
  } catch {
    // File doesn't exist or can't be accessed — ignore
  }
}
