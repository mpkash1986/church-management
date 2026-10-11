import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

const maxFileSize = 5 * 1024 * 1024;
const imageTypes = {
  "image/jpeg": { extension: ".jpg", matches: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/png": { extension: ".png", matches: (bytes: Uint8Array) => bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 },
  "image/webp": { extension: ".webp", matches: (bytes: Uint8Array) => bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50 }
} satisfies Record<string, { extension: string; matches: (bytes: Uint8Array) => boolean }>;

export async function POST(request: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sign in to upload images." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Upload must use multipart form data." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  if (file.size <= 0 || file.size > maxFileSize) {
    return NextResponse.json({ error: "Image must be smaller than 5 MB." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = Object.values(imageTypes).find((candidate) => candidate.matches(bytes));
  if (!type) {
    return NextResponse.json({ error: "Use a valid JPEG, PNG, or WebP image." }, { status: 400 });
  }

  const filename = `${randomUUID()}${type.extension}`;
  const directory = path.join(process.cwd(), "private-uploads");
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), bytes, { flag: "wx" });
  } catch (error) {
    console.error("Image upload failed:", error);
    return NextResponse.json({ error: "The image could not be saved. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ path: `/api/uploads/${filename}` }, { status: 201 });
}
