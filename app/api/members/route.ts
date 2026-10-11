import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatMemberNumber } from "@/lib/member-number";

const imagePath = z.union([z.string().regex(/^\/api\/uploads\/[0-9a-f-]+\.(?:jpg|png|webp)$/i), z.literal("")]);
const schema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  salutation: z.string().trim(),
  dateOfBirth: z.string(),
  gender: z.string(),
  maritalStatus: z.string(),
  profilePhotoPath: imagePath,
  addressLine1: z.string().trim(),
  area: z.string().trim(),
  landmark: z.string().trim(),
  city: z.string().trim(),
  district: z.string().trim(),
  state: z.string().trim(),
  postalCode: z.string().trim(),
  phone: z.string().trim(),
  email: z.union([z.string().trim().email(), z.literal("")]),
  emergencyContact: z.string().trim(),
  joinedAt: z.string(),
  membershipStatus: z.enum(["ACTIVE", "INACTIVE", "TRANSFERRED", "DECEASED"]),
  subscriptionEligible: z.enum(["true", "false"]),
  membershipExpiresAt: z.string(),
  baptismStatus: z.string(),
  notes: z.string().trim(),
  familyId: z.string(),
  ministryId: z.string(),
  primaryFellowshipId: z.string(),
  fellowshipIds: z.array(z.string())
});

function parseDate(value: string) {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? parsed
    : undefined;
}

export async function POST(request: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const form = await request.formData();
  const nameParts = String(form.get("name") || "").trim().split(/\s+/).filter(Boolean);
  const result = schema.safeParse({
    firstName: String(form.get("firstName") || nameParts[0] || ""),
    lastName: String(form.get("lastName") || nameParts.slice(1).join(" ") || nameParts[0] || ""),
    salutation: String(form.get("salutation") || ""),
    dateOfBirth: String(form.get("dateOfBirth") || ""),
    gender: String(form.get("gender") || ""),
    maritalStatus: String(form.get("maritalStatus") || ""),
    profilePhotoPath: String(form.get("profilePhotoPath") || ""),
    addressLine1: String(form.get("addressLine1") || ""),
    area: String(form.get("area") || ""),
    landmark: String(form.get("landmark") || ""),
    city: String(form.get("city") || ""),
    district: String(form.get("district") || ""),
    state: String(form.get("state") || ""),
    postalCode: String(form.get("postalCode") || ""),
    phone: String(form.get("phone") || ""),
    email: String(form.get("email") || ""),
    emergencyContact: String(form.get("emergencyContact") || ""),
    joinedAt: String(form.get("joinedAt") || ""),
    membershipStatus: String(form.get("membershipStatus") || "ACTIVE"),
    subscriptionEligible: String(form.get("subscriptionEligible") || "false"),
    membershipExpiresAt: String(form.get("membershipExpiresAt") || ""),
    baptismStatus: String(form.get("baptismStatus") || ""),
    notes: String(form.get("notes") || ""),
    familyId: String(form.get("familyId") || ""),
    ministryId: String(form.get("ministryId") || ""),
    primaryFellowshipId: String(form.get("primaryFellowshipId") || ""),
    fellowshipIds: [...new Set(form.getAll("fellowshipIds").map(String))]
  });
  if (!result.success) return NextResponse.redirect(new URL("/members?error=invalid", request.url), 303);
  const data = result.data;
  const dateOfBirth = parseDate(data.dateOfBirth);
  const joinedAt = parseDate(data.joinedAt);
  const membershipExpiresAt = parseDate(data.membershipExpiresAt);
  if ((data.dateOfBirth && !dateOfBirth) || (data.joinedAt && !joinedAt) || (data.membershipExpiresAt && !membershipExpiresAt)) {
    return NextResponse.redirect(new URL("/members?error=invalid", request.url), 303);
  }

  try {
    if (!await prisma.church.findUnique({ where: { id: "singleton" }, select: { id: true } })) {
      return NextResponse.redirect(new URL("/church?error=required", request.url), 303);
    }
    if (data.familyId && !(await prisma.family.count({ where: { id: data.familyId } }))) {
      return NextResponse.redirect(new URL("/members?error=relation", request.url), 303);
    }
    if (data.ministryId && !(await prisma.ministry.count({ where: { id: data.ministryId } }))) {
      return NextResponse.redirect(new URL("/members?error=relation", request.url), 303);
    }
    if (data.primaryFellowshipId && !(await prisma.fellowship.count({ where: { id: data.primaryFellowshipId } }))) {
      return NextResponse.redirect(new URL("/members?error=relation", request.url), 303);
    }
    const fellowshipIds = [...new Set([...data.fellowshipIds, ...(data.primaryFellowshipId ? [data.primaryFellowshipId] : [])])];
    if (fellowshipIds.length && (await prisma.fellowship.count({ where: { id: { in: fellowshipIds } } })) !== fellowshipIds.length) {
      return NextResponse.redirect(new URL("/members?error=relation", request.url), 303);
    }
    await prisma.$transaction(async (tx) => {
      let counter = await tx.memberNumberCounter.update({
        where: { id: "singleton" },
        data: { value: { increment: 1 } }
      });
      let memberNumber = formatMemberNumber(counter.value);
      while (await tx.member.findUnique({ where: { memberNumber }, select: { id: true } })) {
        counter = await tx.memberNumberCounter.update({
          where: { id: "singleton" },
          data: { value: { increment: 1 } }
        });
        memberNumber = formatMemberNumber(counter.value);
      }
      await tx.member.create({
        data: {
          memberNumber,
          firstName: data.firstName,
          lastName: data.lastName,
          salutation: data.salutation || null,
          dateOfBirth,
          gender: data.gender || null,
          maritalStatus: data.maritalStatus || null,
          profilePhotoPath: data.profilePhotoPath || null,
          addressLine1: data.addressLine1 || null,
          area: data.area || null,
          landmark: data.landmark || null,
          city: data.city || null,
          district: data.district || null,
          state: data.state || null,
          postalCode: data.postalCode || null,
          phone: data.phone || null,
          email: data.email.toLowerCase() || null,
          emergencyContact: data.emergencyContact || null,
          joinedAt: joinedAt || new Date(),
          membershipStatus: data.membershipStatus,
          isActive: data.membershipStatus === "ACTIVE",
          subscriptionEligible: data.subscriptionEligible === "true",
          membershipExpiresAt,
          baptismStatus: data.baptismStatus || null,
          notes: data.notes || null,
          familyId: data.familyId || null,
          ministryId: data.ministryId || null,
          primaryFellowshipId: data.primaryFellowshipId || null,
          fellowships: { create: fellowshipIds.map((fellowshipId) => ({ fellowshipId })) }
        }
      });
    });
    return NextResponse.redirect(new URL("/members", request.url), 303);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.redirect(new URL("/members?error=duplicate", request.url), 303);
    }
    console.error("Member creation failed:", error);
    return NextResponse.redirect(new URL("/members?error=server", request.url), 303);
  }
}
