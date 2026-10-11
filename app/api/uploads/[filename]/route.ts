import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

const images = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
};

export async function GET(_request: Request, context: { params: Promise<{ filename: string }> }) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sign in to view this image." }, { status: 401 });
  }
  const { filename } = await context.params;
  if (!/^[0-9a-f-]+\.(?:jpg|png|webp)$/i.test(filename)) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }
  try {
    const bytes = await readFile(path.join(process.cwd(), "private-uploads", filename));
    const extension = filename.split(".").pop() as keyof typeof images;
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": images[extension],
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return NextResponse.json({ error: "Image not found." }, { status: 404 });
    }
    console.error("Image read failed:", error);
    return NextResponse.json({ error: "The image could not be loaded." }, { status: 500 });
  }
}
