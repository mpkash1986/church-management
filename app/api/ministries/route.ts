import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  ministryCode: z.string().trim(),
  name: z.string().trim().min(1),
  leaderId: z.string(),
  status: z.enum(["ACTIVE", "INACTIVE", "COMPLETED"]),
  description: z.string().trim(),
  notes: z.string().trim(),
  memberIds: z.array(z.string())
});

export async function POST(request: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }
  const form = await request.formData();
  const result = schema.safeParse({
    ministryCode: String(form.get("ministryCode") || ""),
    name: String(form.get("name") || ""),
    leaderId: String(form.get("leaderId") || ""),
    status: String(form.get("status") || "ACTIVE"),
    description: String(form.get("description") || ""),
    notes: String(form.get("notes") || ""),
    memberIds: [...new Set(form.getAll("memberIds").map(String))]
  });
  if (!result.success) return NextResponse.redirect(new URL("/ministries?error=invalid", request.url), 303);
  const data = result.data;

  try {
    const church = await prisma.church.findUnique({ where: { id: "singleton" }, select: { id: true } });
    if (!church) return NextResponse.redirect(new URL("/church?error=required", request.url), 303);
    const referencedMembers = [...new Set([...data.memberIds, ...(data.leaderId ? [data.leaderId] : [])])];
    if (referencedMembers.length && (await prisma.member.count({ where: { id: { in: referencedMembers } } })) !== referencedMembers.length) {
      return NextResponse.redirect(new URL("/ministries?error=relation", request.url), 303);
    }
    const ministry = await prisma.ministry.create({
      data: {
        ministryCode: data.ministryCode || null,
        churchId: church.id,
        name: data.name,
        leaderId: data.leaderId || null,
        status: data.status,
        description: data.description || null,
        notes: data.notes || null
      }
    });
    if (data.memberIds.length) {
      await prisma.member.updateMany({ where: { id: { in: data.memberIds } }, data: { ministryId: ministry.id } });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.redirect(new URL("/ministries?error=duplicate", request.url), 303);
    }
    console.error("Ministry creation failed:", error);
    return NextResponse.redirect(new URL("/ministries?error=server", request.url), 303);
  }
  return NextResponse.redirect(new URL("/ministries", request.url), 303);
}
