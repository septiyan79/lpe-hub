import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const MIME_MAP = {
  pdf:  "application/pdf",
  jpg:  "image/jpeg",
  jpeg: "image/jpeg",
  png:  "image/png",
};

export async function GET(req, { params }) {
  const segments = (await params).slug;
  if (!segments?.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Prevent path traversal
  const joined = segments.join("/");
  if (joined.includes("..")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const filePath = path.join(process.cwd(), "public", "uploads", ...segments);
  const ext = segments[segments.length - 1].split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME_MAP[ext] ?? "application/octet-stream";

  try {
    const file = await readFile(filePath);
    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
