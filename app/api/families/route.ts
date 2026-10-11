import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  familyCode: z.string().trim(),
  name: z.string().trim().min(1),
  addressLine1: z.string().trim(),
  addressLine2: z.string().trim(),
  city: z.string().trim(),
  district: z.string().trim(),
  state: z.string().trim(),
  postalCode: z.string().trim(),
  phone: z.string().trim(),
  email: z.union([z.string().trim().email(), z.literal("")]),
  familyHeadId: z.string(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
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
    familyCode: String(form.get("familyCode") || ""),
    name: String(form.get("name") || ""),
    addressLine1: String(form.get("addressLine1") || ""),
    addressLine2: String(form.get("addressLine2") || ""),
    city: String(form.get("city") || ""),
    district: String(form.get("district") || ""),
    state: String(form.get("state") || ""),
    postalCode: String(form.get("postalCode") || ""),
    phone: String(form.get("phone") || ""),
    email: String(form.get("email") || ""),
    familyHeadId: String(form.get("familyHeadId") || ""),
    status: String(form.get("status") || "ACTIVE"),
    notes: String(form.get("notes") || ""),
    memberIds: [...new Set(form.getAll("memberIds").map(String))]
  });
  if (!result.success) return NextResponse.redirect(new URL("/families?error=invalid", request.url), 303);
  const data = result.data;

  try {
    const church = await prisma.church.findUnique({ where: { id: "singleton" }, select: { id: true } });
    if (!church) return NextResponse.redirect(new URL("/church?error=required", request.url), 303);
    const memberIds = [...new Set([...data.memberIds, ...(data.familyHeadId ? [data.familyHeadId] : [])])];
    const referencedMembers = memberIds;
    if (referencedMembers.length && (await prisma.member.count({ where: { id: { in: referencedMembers } } })) !== referencedMembers.length) {
      return NextResponse.redirect(new URL("/families?error=relation", request.url), 303);
    }
    await prisma.$transaction(async (tx) => {
      const family = await tx.family.create({
        data: {
          familyCode: data.familyCode || null,
          churchId: church.id,
          name: data.name,
          address: data.addressLine1 || null,
          addressLine1: data.addressLine1 || null,
          addressLine2: data.addressLine2 || null,
          city: data.city || null,
          district: data.district || null,
          state: data.state || null,
          postalCode: data.postalCode || null,
          phone: data.phone || null,
          email: data.email || null,
          familyHeadId: data.familyHeadId || null,
          status: data.status,
          notes: data.notes || null
        }
      });
      if (memberIds.length) {
        await tx.member.updateMany({ where: { id: { in: memberIds } }, data: { familyId: family.id } });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.redirect(new URL("/families?error=duplicate", request.url), 303);
    }
    console.error("Family creation failed:", error);
    return NextResponse.redirect(new URL("/families?error=server", request.url), 303);
  }
  return NextResponse.redirect(new URL("/families", request.url), 303);
}
