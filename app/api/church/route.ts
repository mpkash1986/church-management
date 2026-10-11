import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const imagePath = z.union([z.string().regex(/^\/api\/uploads\/[0-9a-f-]+\.(?:jpg|png|webp)$/i), z.literal("")]);
const schema = z.object({
  churchCode: z.string().trim(),
  name: z.string().trim().min(1),
  logoPath: imagePath,
  addressLine1: z.string().trim(),
  area: z.string().trim(),
  landmark: z.string().trim(),
  city: z.string().trim(),
  district: z.string().trim(),
  state: z.string().trim(),
  postalCode: z.string().trim(),
  phone: z.string().trim(),
  email: z.union([z.string().trim().email(), z.literal("")]),
  websiteUrl: z.union([z.string().trim().url(), z.literal("")]),
  websiteLinkText: z.string().trim(),
  description: z.string().trim(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  seniorPastorId: z.string()
});

export async function POST(request: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }
  const form = await request.formData();
  const result = schema.safeParse({
    churchCode: String(form.get("churchCode") || ""),
    name: String(form.get("name") || ""),
    logoPath: String(form.get("logoPath") || ""),
    addressLine1: String(form.get("addressLine1") || ""),
    area: String(form.get("area") || ""),
    landmark: String(form.get("landmark") || ""),
    city: String(form.get("city") || ""),
    district: String(form.get("district") || ""),
    state: String(form.get("state") || ""),
    postalCode: String(form.get("postalCode") || ""),
    phone: String(form.get("phone") || ""),
    email: String(form.get("email") || ""),
    websiteUrl: String(form.get("websiteUrl") || ""),
    websiteLinkText: String(form.get("websiteLinkText") || ""),
    description: String(form.get("description") || ""),
    status: String(form.get("status") || "ACTIVE"),
    seniorPastorId: String(form.get("seniorPastorId") || "")
  });
  if (!result.success) return NextResponse.redirect(new URL("/church?error=invalid", request.url), 303);
  const data = result.data;

  try {
    if (data.seniorPastorId && !(await prisma.member.count({ where: { id: data.seniorPastorId } }))) {
      return NextResponse.redirect(new URL("/church?error=relation", request.url), 303);
    }
    await prisma.church.upsert({
      where: { id: "singleton" },
      update: {
        churchCode: data.churchCode || null,
        name: data.name,
        logoPath: data.logoPath || null,
        addressLine1: data.addressLine1 || null,
        area: data.area || null,
        landmark: data.landmark || null,
        city: data.city || null,
        district: data.district || null,
        state: data.state || null,
        postalCode: data.postalCode || null,
        phone: data.phone || null,
        email: data.email || null,
        websiteUrl: data.websiteUrl || null,
        websiteLinkText: data.websiteLinkText || null,
        description: data.description || null,
        status: data.status,
        seniorPastorId: data.seniorPastorId || null
      },
      create: {
        id: "singleton",
        churchCode: data.churchCode || null,
        name: data.name,
        logoPath: data.logoPath || null,
        addressLine1: data.addressLine1 || null,
        area: data.area || null,
        landmark: data.landmark || null,
        city: data.city || null,
        district: data.district || null,
        state: data.state || null,
        postalCode: data.postalCode || null,
        phone: data.phone || null,
        email: data.email || null,
        websiteUrl: data.websiteUrl || null,
        websiteLinkText: data.websiteLinkText || null,
        description: data.description || null,
        status: data.status,
        seniorPastorId: data.seniorPastorId || null
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.redirect(new URL("/church?error=duplicate", request.url), 303);
    }
    console.error("Church profile update failed:", error);
    return NextResponse.redirect(new URL("/church?error=server", request.url), 303);
  }
  return NextResponse.redirect(new URL("/church?success=saved", request.url), 303);
}
