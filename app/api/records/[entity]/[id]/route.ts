import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getPaymentStatus } from "@/lib/subscriptions";
import { createSubscriptionName } from "@/lib/subscription-name";
import { generateReceiptNumber } from "@/lib/receipt-number";
import { isCurrentOrPastFinancialYear } from "@/lib/financial-year";

const optionalText = z.string().trim().optional().transform((value) => value || null);
const optionalImagePath = z.union([z.string().regex(/^\/api\/uploads\/[0-9a-f-]+\.(?:jpg|png|webp)$/i), z.literal("")]).optional().transform((value) => value || null);
const optionalDate = z.string().optional().transform((value) => value || null).refine((value) => {
  if (!value) return true;
  const parsed = new Date(`${value}T12:00:00`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Enter a valid date.");
const uniqueIds = z.array(z.string()).default([]).refine((items) => new Set(items).size === items.length, "Remove duplicate selections.");

const memberSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  salutation: optionalText,
  gender: optionalText,
  maritalStatus: optionalText,
  profilePhotoPath: optionalImagePath,
  addressLine1: optionalText,
  area: optionalText,
  landmark: optionalText,
  city: optionalText,
  district: optionalText,
  state: optionalText,
  postalCode: optionalText,
  email: z.union([z.string().trim().email(), z.literal("")]).optional().transform((value) => value || null),
  phone: optionalText,
  emergencyContact: optionalText,
  dateOfBirth: optionalDate,
  weddingAnniversary: optionalDate,
  joinedAt: optionalDate,
  membershipStatus: z.enum(["ACTIVE", "INACTIVE", "TRANSFERRED", "DECEASED"]),
  subscriptionEligible: z.enum(["true", "false"]).transform((value) => value === "true"),
  membershipExpiresAt: optionalDate,
  baptismStatus: optionalText,
  notes: optionalText,
  familyId: optionalText,
  ministryId: optionalText,
  primaryFellowshipId: optionalText,
  fellowshipIds: uniqueIds
});

const familySchema = z.object({
  familyCode: optionalText,
  name: z.string().trim().min(1),
  addressLine1: optionalText,
  addressLine2: optionalText,
  city: optionalText,
  district: optionalText,
  state: optionalText,
  postalCode: optionalText,
  phone: optionalText,
  email: z.union([z.string().trim().email(), z.literal("")]).optional().transform((value) => value || null),
  familyHeadId: optionalText,
  status: z.enum(["ACTIVE", "INACTIVE"]),
  notes: optionalText,
  memberIds: uniqueIds
});

const fellowshipSchema = z.object({
  fellowshipCode: optionalText,
  name: z.string().trim().min(1),
  meetingDay: optionalText,
  meetingTime: optionalText,
  description: optionalText,
  notes: optionalText,
  leaderId: optionalText,
  assistantLeaderId: optionalText,
  status: z.enum(["ACTIVE", "INACTIVE", "COMPLETED"]),
  memberIds: uniqueIds
});

const ministrySchema = z.object({
  ministryCode: optionalText,
  name: z.string().trim().min(1),
  leaderId: optionalText,
  memberIds: uniqueIds,
  description: optionalText,
  status: z.enum(["ACTIVE", "INACTIVE", "COMPLETED"]),
  notes: optionalText
});

const churchSchema = z.object({
  churchCode: optionalText,
  name: z.string().trim().min(1),
  logoPath: optionalImagePath,
  addressLine1: optionalText,
  addressLine2: optionalText,
  city: optionalText,
  district: optionalText,
  state: optionalText,
  postalCode: optionalText,
  phone: optionalText,
  email: z.union([z.string().trim().email(), z.literal("")]).optional().transform((value) => value || null),
  websiteUrl: z.union([z.string().trim().url(), z.literal("")]).optional().transform((value) => value || null),
  websiteLinkText: optionalText,
  description: optionalText,
  status: z.enum(["ACTIVE", "INACTIVE"]),
  seniorPastorId: optionalText
});

const subscriptionSchema = z.object({
  subscriptionCode: optionalText,
  name: z.string().trim().min(1),
  memberId: z.string().min(1),
  financialYear: z.string().trim().refine((value) => isCurrentOrPastFinancialYear(value), "Select the current or a previous financial year."),
  period: z.string().trim().min(1),
  monthlySubscription: z.coerce.number().int().min(0),
  buildingFund: z.coerce.number().int().min(0),
  cemeteryFund: z.coerce.number().int().min(0),
  gospelFund: z.coerce.number().int().min(0),
  poorWelfareFund: z.coerce.number().int().min(0),
  menFellowshipFund: z.coerce.number().int().min(0),
  womenFellowshipFund: z.coerce.number().int().min(0),
  youthFellowshipFund: z.coerce.number().int().min(0),
  womenMinistryFund: z.coerce.number().int().min(0),
  healthFacilityFund: z.coerce.number().int().min(0),
  amountPaid: z.coerce.number().int().min(0).optional(),
  paidAt: optionalDate,
  requestDate: optionalDate,
  isVerified: z.boolean(),
  verifiedById: optionalText,
  isApproved: z.boolean(),
  approvedById: optionalText,
  receiptNo: optionalText,
  notes: optionalText
});

const accountSchema = z.object({
  entryDate: optionalDate,
  kind: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().trim().min(1),
  description: z.string().trim().min(1),
  amount: z.coerce.number().int().positive(),
  reference: optionalText
});

const userSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  role: z.enum(["ADMIN", "TREASURER", "SECRETARY", "VIEWER"]),
  isActive: z.boolean(),
  password: z.string().optional().refine((value) => !value || value.length >= 12, "Password must contain at least 12 characters.")
});

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isAdmin(user: { role: string }) {
  return user.role === "ADMIN";
}

function parseFailure(error: unknown) {
  if (error instanceof z.ZodError) return jsonError(error.issues[0]?.message || "Invalid input.", 400);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return jsonError("A record with these unique values already exists.", 409);
    if (error.code === "P2025") return jsonError("This record no longer exists.", 404);
    if (error.code === "P2003") return jsonError("The selected related record does not exist.", 400);
  }
  console.error("Record operation failed:", error);
  return jsonError("The record could not be saved. Please try again.", 500);
}

async function remainingActiveAdmin(targetId: string) {
  return prisma.user.count({
    where: { id: { not: targetId }, role: "ADMIN", isActive: true }
  });
}

function toDate(value: string | null) {
  return value ? new Date(`${value}T12:00:00`) : null;
}

function subscriptionTotal(data: z.infer<typeof subscriptionSchema>) {
  return data.monthlySubscription + data.buildingFund + data.cemeteryFund + data.gospelFund +
    data.poorWelfareFund + data.menFellowshipFund + data.womenFellowshipFund +
    data.youthFellowshipFund + data.womenMinistryFund + data.healthFacilityFund;
}

export async function PATCH(request: Request, context: { params: Promise<{ entity: string; id: string }> }) {
  let actor;
  try {
    actor = await requireUser();
  } catch {
    return jsonError("Sign in to update records.", 401);
  }

  const { entity, id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  try {
    switch (entity) {
      case "church": {
        const data = churchSchema.parse(body);
        if (data.seniorPastorId && !(await prisma.member.count({ where: { id: data.seniorPastorId } }))) {
          return jsonError("Selected senior pastor does not exist.", 400);
        }
        await prisma.church.upsert({
          where: { id: "singleton" },
          update: { ...data, seniorPastorId: data.seniorPastorId },
          create: { id: "singleton", ...data, seniorPastorId: data.seniorPastorId }
        });
        break;
      }
      case "members": {
        const data = memberSchema.parse(body);
        if (data.familyId && !(await prisma.family.count({ where: { id: data.familyId } }))) {
          return jsonError("Selected family does not exist.", 400);
        }
        if (data.ministryId && !(await prisma.ministry.count({ where: { id: data.ministryId } }))) {
          return jsonError("Selected ministry does not exist.", 400);
        }
        if (data.primaryFellowshipId && !(await prisma.fellowship.count({ where: { id: data.primaryFellowshipId } }))) {
          return jsonError("Selected fellowship does not exist.", 400);
        }
        const fellowshipIds = [...new Set([...data.fellowshipIds, ...(data.primaryFellowshipId ? [data.primaryFellowshipId] : [])])];
        if (fellowshipIds.length && (await prisma.fellowship.count({ where: { id: { in: fellowshipIds } } })) !== fellowshipIds.length) {
          return jsonError("One or more selected fellowships do not exist.", 400);
        }
        await prisma.member.update({
          where: { id },
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            salutation: data.salutation,
            gender: data.gender,
            maritalStatus: data.maritalStatus,
            profilePhotoPath: data.profilePhotoPath,
            addressLine1: data.addressLine1,
            area: data.area,
            landmark: data.landmark,
            city: data.city,
            district: data.district,
            state: data.state,
            postalCode: data.postalCode,
            email: data.email,
            phone: data.phone,
            emergencyContact: data.emergencyContact,
            dateOfBirth: toDate(data.dateOfBirth),
            weddingAnniversary: toDate(data.weddingAnniversary),
            joinedAt: toDate(data.joinedAt) || new Date(),
            membershipStatus: data.membershipStatus,
            subscriptionEligible: data.subscriptionEligible,
            membershipExpiresAt: toDate(data.membershipExpiresAt),
            baptismStatus: data.baptismStatus,
            notes: data.notes,
            isActive: data.membershipStatus === "ACTIVE",
            familyId: data.familyId,
            ministryId: data.ministryId,
            primaryFellowshipId: data.primaryFellowshipId,
            fellowships: {
              deleteMany: {},
              create: fellowshipIds.map((fellowshipId) => ({ fellowshipId }))
            }
          }
        });
        break;
      }
      case "families": {
        const data = familySchema.parse(body);
        if (data.familyHeadId && !(await prisma.member.count({ where: { id: data.familyHeadId } }))) {
          return jsonError("Selected family head does not exist.", 400);
        }
        if (data.memberIds.length && (await prisma.member.count({ where: { id: { in: data.memberIds } } })) !== data.memberIds.length) {
          return jsonError("One or more selected members do not exist.", 400);
        }
        const memberIds = [...new Set([...data.memberIds, ...(data.familyHeadId ? [data.familyHeadId] : [])])];
        await prisma.$transaction(async (tx) => {
          await tx.member.updateMany({ where: { familyId: id }, data: { familyId: null } });
          if (memberIds.length) {
            await tx.member.updateMany({ where: { id: { in: memberIds } }, data: { familyId: id } });
          }
          await tx.family.update({
            where: { id },
            data: {
              familyCode: data.familyCode,
              name: data.name,
              address: data.addressLine1,
              addressLine1: data.addressLine1,
              addressLine2: data.addressLine2,
              city: data.city,
              district: data.district,
              state: data.state,
              postalCode: data.postalCode,
              phone: data.phone,
              email: data.email,
              familyHeadId: data.familyHeadId,
              status: data.status,
              notes: data.notes
            }
          });
        });
        break;
      }
      case "fellowships": {
        const data = fellowshipSchema.parse(body);
        const referencedMembers = [data.leaderId, data.assistantLeaderId, ...data.memberIds].filter((memberId): memberId is string => Boolean(memberId));
        if (referencedMembers.length && (await prisma.member.count({ where: { id: { in: [...new Set(referencedMembers)] } } })) !== new Set(referencedMembers).size) {
          return jsonError("One or more selected members do not exist.", 400);
        }
        await prisma.fellowship.update({
          where: { id },
          data: {
            fellowshipCode: data.fellowshipCode,
            name: data.name,
            meetingDay: data.meetingDay,
            meetingTime: data.meetingTime,
            description: data.description,
            notes: data.notes,
            leaderId: data.leaderId,
            assistantLeaderId: data.assistantLeaderId,
            status: data.status,
            members: {
              deleteMany: {},
              create: data.memberIds.map((memberId) => ({ memberId }))
            }
          }
        });
        break;
      }
      case "ministries": {
        const data = ministrySchema.parse(body);
        const referencedMembers = [data.leaderId, ...data.memberIds].filter((memberId): memberId is string => Boolean(memberId));
        if (referencedMembers.length && (await prisma.member.count({ where: { id: { in: [...new Set(referencedMembers)] } } })) !== new Set(referencedMembers).size) {
          return jsonError("One or more selected members do not exist.", 400);
        }
        await prisma.$transaction(async (tx) => {
          await tx.member.updateMany({ where: { ministryId: id }, data: { ministryId: null } });
          if (data.memberIds.length) {
            await tx.member.updateMany({ where: { id: { in: data.memberIds } }, data: { ministryId: id } });
          }
          await tx.ministry.update({
            where: { id },
            data: {
              ministryCode: data.ministryCode,
              name: data.name,
              leaderId: data.leaderId,
              description: data.description,
              status: data.status,
              notes: data.notes
            }
          });
        });
        break;
      }
      case "subscriptions": {
        const data = subscriptionSchema.parse(body);
        const existingSubscription = await prisma.subscription.findUnique({
          where: { id },
          select: { paidAt: true, receiptNo: true }
        });
        if (!existingSubscription) return jsonError("Subscription no longer exists.", 404);
        const referencedUsers = [data.verifiedById, data.approvedById].filter((userId): userId is string => Boolean(userId));
        const member = await prisma.member.findUnique({
          where: { id: data.memberId },
          select: { firstName: true, lastName: true }
        });
        if (!member) return jsonError("Selected member does not exist.", 400);
        if (referencedUsers.length && (await prisma.user.count({ where: { id: { in: [...new Set(referencedUsers)] } } })) !== new Set(referencedUsers).size) {
          return jsonError("One or more selected approvers do not exist.", 400);
        }
        const amountDue = subscriptionTotal(data);
        const amountPaid = amountDue;
        const paidAt = existingSubscription.paidAt || new Date();
        const receiptNo = existingSubscription.receiptNo || generateReceiptNumber(paidAt);
        const status = getPaymentStatus(amountDue, amountPaid);
        const subscriptionName = createSubscriptionName(`${member.firstName} ${member.lastName}`, data.financialYear, data.period);
        await prisma.$transaction(async (tx) => {
          await tx.subscription.update({
            where: { id },
            data: {
              subscriptionCode: data.subscriptionCode,
              name: subscriptionName,
              memberId: data.memberId,
              financialYear: data.financialYear,
              period: data.period,
              monthlySubscription: data.monthlySubscription,
              buildingFund: data.buildingFund,
              cemeteryFund: data.cemeteryFund,
              gospelFund: data.gospelFund,
              poorWelfareFund: data.poorWelfareFund,
              menFellowshipFund: data.menFellowshipFund,
              womenFellowshipFund: data.womenFellowshipFund,
              youthFellowshipFund: data.youthFellowshipFund,
              womenMinistryFund: data.womenMinistryFund,
              healthFacilityFund: data.healthFacilityFund,
              amountDue,
              amountPaid,
              paidAt,
              requestDate: toDate(data.requestDate) || new Date(),
              isVerified: data.isVerified,
              verifiedById: data.isVerified ? data.verifiedById : null,
              isApproved: data.isApproved,
              approvedById: data.isApproved ? data.approvedById : null,
              receiptNo,
              notes: data.notes,
              status
            }
          });
          if (amountPaid > 0) {
            await tx.accountEntry.upsert({
              where: { sourceSubscriptionId: id },
              create: {
                sourceSubscriptionId: id,
                kind: "INCOME",
                category: "Subscription",
                description: subscriptionName,
                amount: amountPaid,
                reference: receiptNo,
                entryDate: paidAt || new Date()
              },
              update: {
                kind: "INCOME",
                category: "Subscription",
                description: subscriptionName,
                amount: amountPaid,
                reference: receiptNo,
                entryDate: paidAt || new Date()
              }
            });
          } else {
            await tx.accountEntry.deleteMany({ where: { sourceSubscriptionId: id } });
          }
        });
        break;
      }
      case "accounts": {
        const data = accountSchema.parse(body);
        const entry = await prisma.accountEntry.findUnique({ where: { id }, select: { sourceSubscriptionId: true } });
        if (entry?.sourceSubscriptionId) return jsonError("Edit this payment from its subscription record to keep the ledger balanced.", 409);
        await prisma.accountEntry.update({
          where: { id },
          data: { ...data, entryDate: data.entryDate ? new Date(`${data.entryDate}T12:00:00`) : new Date() }
        });
        break;
      }
      case "users": {
        if (!isAdmin(actor)) return jsonError("Only administrators can manage users.", 403);
        const data = userSchema.parse(body);
        const keepAdmin = data.role === "ADMIN" && data.isActive;
        if (actor.id === id && !keepAdmin) return jsonError("You cannot deactivate or demote your own account.", 400);
        if (!keepAdmin && (await remainingActiveAdmin(id)) === 0) return jsonError("The system must have at least one active administrator.", 400);
        const passwordHash = data.password ? await bcrypt.hash(data.password, 12) : undefined;
        await prisma.user.update({
          where: { id },
          data: {
            name: data.name,
            email: data.email,
            role: data.role,
            isActive: data.isActive,
            ...(passwordHash ? { passwordHash } : {})
          }
        });
        break;
      }
      default:
        return jsonError("Unknown record type.", 404);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return parseFailure(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ entity: string; id: string }> }) {
  let actor;
  try {
    actor = await requireUser();
  } catch {
    return jsonError("Sign in to delete records.", 401);
  }

  const { entity, id } = await context.params;
  try {
    switch (entity) {
      case "church":
        return jsonError("The single church profile cannot be deleted.", 409);
      case "members":
        await prisma.member.delete({ where: { id } });
        break;
      case "families":
        await prisma.family.delete({ where: { id } });
        break;
      case "fellowships":
        await prisma.fellowship.delete({ where: { id } });
        break;
      case "ministries":
        await prisma.ministry.delete({ where: { id } });
        break;
      case "subscriptions":
        await prisma.subscription.delete({ where: { id } });
        break;
      case "accounts": {
        const entry = await prisma.accountEntry.findUnique({ where: { id }, select: { sourceSubscriptionId: true } });
        if (entry?.sourceSubscriptionId) return jsonError("Delete or update this payment from its subscription record.", 409);
        await prisma.accountEntry.delete({ where: { id } });
        break;
      }
      case "users": {
        if (!isAdmin(actor)) return jsonError("Only administrators can manage users.", 403);
        if (actor.id === id) return jsonError("You cannot delete your own account.", 400);
        const target = await prisma.user.findUnique({ where: { id }, select: { role: true, isActive: true } });
        if (!target) return jsonError("This record no longer exists.", 404);
        if (target.role === "ADMIN" && target.isActive && (await remainingActiveAdmin(id)) === 0) {
          return jsonError("The system must have at least one active administrator.", 400);
        }
        await prisma.user.delete({ where: { id } });
        break;
      }
      default:
        return jsonError("Unknown record type.", 404);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return parseFailure(error);
  }
}
