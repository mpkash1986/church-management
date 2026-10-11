import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "development-only-change-this-secret");

export async function createSession(user: { id: string; email: string; role: string }) {
  const token = await new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" }).setSubject(user.id)
    .setIssuedAt().setExpirationTime("7d").sign(secret);
  (await cookies()).set("church_session", token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7
  });
}

export async function getSession() {
  const token = (await cookies()).get("church_session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.sub;
    if (!userId) return null;
    return await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, role: true, isActive: true } });
  } catch { return null; }
}

export async function requireUser() {
  const user = await getSession();
  if (!user || !user.isActive) throw new Error("UNAUTHORIZED");
  return user;
}
