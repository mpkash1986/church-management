import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  role: z.nativeEnum(UserRole),
  password: z.string().min(12, "Password must contain at least 12 characters.")
});

export async function POST(request: Request) {
  let actor;
  try {
    actor = await requireUser();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }
  if (actor.role !== "ADMIN") return NextResponse.redirect(new URL("/dashboard?error=forbidden", request.url), 303);

  const form = await request.formData();
  const result = schema.safeParse({
    name: String(form.get("name") || ""),
    email: String(form.get("email") || ""),
    role: String(form.get("role") || "VIEWER"),
    password: String(form.get("password") || "")
  });
  if (!result.success) return NextResponse.redirect(new URL("/users?error=invalid", request.url), 303);

  try {
    await prisma.user.create({
      data: {
        name: result.data.name,
        email: result.data.email,
        role: result.data.role,
        passwordHash: await bcrypt.hash(result.data.password, 12)
      }
    });
    return NextResponse.redirect(new URL("/users?success=created", request.url), 303);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.redirect(new URL("/users?error=duplicate", request.url), 303);
    }
    console.error("User creation failed:", error);
    return NextResponse.redirect(new URL("/users?error=server", request.url), 303);
  }
}
