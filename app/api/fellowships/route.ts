import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  fellowshipCode: z.string().trim(),
  name: z.string().trim().min(1),
  meetingDay: z.string().trim(),
  meetingTime: z.string().trim(),
  leaderId: z.string(),
  assistantLeaderId: z.string(),
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
    fellowshipCode: String(form.get("fellowshipCode") || ""),
    name: String(form.get("name") || ""),
    meetingDay: String(form.get("meetingDay") || ""),
    meetingTime: String(form.get("meetingTime") || ""),
    leaderId: String(form.get("leaderId") || ""),
    assistantLeaderId: String(form.get("assistantLeaderId") || ""),
    status: String(form.get("status") || "ACTIVE"),
    description: String(form.get("description") || ""),
    notes: String(form.get("notes") || ""),
    memberIds: [...new Set(form.getAll("memberIds").map(String))]
  });
  if (!result.success) return NextResponse.redirect(new URL("/fellowships?error=invalid", request.url), 303);
  const data = result.data;

  try {
    const church = await prisma.church.findUnique({ where: { id: "singleton" }, select: { id: true } });
    if (!church) return NextResponse.redirect(new URL("/church?error=required", request.url), 303);
    const referencedMembers = [...new Set([...data.memberIds, data.leaderId, data.assistantLeaderId].filter(Boolean))];
    if (referencedMembers.length && (await prisma.member.count({ where: { id: { in: referencedMembers } } })) !== referencedMembers.length) {
      return NextResponse.redirect(new URL("/fellowships?error=relation", request.url), 303);
    }
    await prisma.fellowship.create({
      data: {
        fellowshipCode: data.fellowshipCode || null,
        churchId: church.id,
        name: data.name,
        meetingDay: data.meetingDay || null,
        meetingTime: data.meetingTime || null,
        leaderId: data.leaderId || null,
        assistantLeaderId: data.assistantLeaderId || null,
        status: data.status,
        description: data.description || null,
        notes: data.notes || null,
        members: { create: data.memberIds.map((memberId) => ({ memberId })) }
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.redirect(new URL("/fellowships?error=duplicate", request.url), 303);
    }
    console.error("Fellowship creation failed:", error);
    return NextResponse.redirect(new URL("/fellowships?error=server", request.url), 303);
  }
  return NextResponse.redirect(new URL("/fellowships", request.url), 303);
}
