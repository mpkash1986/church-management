import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getPaymentStatus } from "@/lib/subscriptions";
import { createSubscriptionName } from "@/lib/subscription-name";
import { generateReceiptNumber } from "@/lib/receipt-number";
import { isCurrentOrPastFinancialYear } from "@/lib/financial-year";

const schema = z.object({
  subscriptionCode: z.string().trim(),
  name: z.string().trim().min(1),
  memberIds: z.array(z.string()).min(1),
  financialYear: z.string().trim().refine((value) => isCurrentOrPastFinancialYear(value), "Select the current or a previous financial year."),
  period: z.string().trim().min(1),
  monthlySubscription: z.number().int().min(0),
  buildingFund: z.number().int().min(0),
  cemeteryFund: z.number().int().min(0),
  gospelFund: z.number().int().min(0),
  poorWelfareFund: z.number().int().min(0),
  menFellowshipFund: z.number().int().min(0),
  womenFellowshipFund: z.number().int().min(0),
  youthFellowshipFund: z.number().int().min(0),
  womenMinistryFund: z.number().int().min(0),
  healthFacilityFund: z.number().int().min(0),
  requestDate: z.string(),
  isVerified: z.boolean(),
  verifiedById: z.string(),
  isApproved: z.boolean(),
  approvedById: z.string(),
  notes: z.string().trim()
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
  const numberField = (name: string) => {
    const value = String(form.get(name) || "0");
    return value !== "" && Number.isSafeInteger(Number(value)) ? Number(value) : -1;
  };
  const result = schema.safeParse({
    subscriptionCode: String(form.get("subscriptionCode") || ""),
    name: String(form.get("name") || ""),
    memberIds: [...new Set(form.getAll("memberIds").map(String))],
    financialYear: String(form.get("financialYear") || ""),
    period: String(form.get("period") || ""),
    monthlySubscription: numberField("monthlySubscription"),
    buildingFund: numberField("buildingFund"),
    cemeteryFund: numberField("cemeteryFund"),
    gospelFund: numberField("gospelFund"),
    poorWelfareFund: numberField("poorWelfareFund"),
    menFellowshipFund: numberField("menFellowshipFund"),
    womenFellowshipFund: numberField("womenFellowshipFund"),
    youthFellowshipFund: numberField("youthFellowshipFund"),
    womenMinistryFund: numberField("womenMinistryFund"),
    healthFacilityFund: numberField("healthFacilityFund"),
    requestDate: String(form.get("requestDate") || ""),
    isVerified: form.get("isVerified") === "on",
    verifiedById: String(form.get("verifiedById") || ""),
    isApproved: form.get("isApproved") === "on",
    approvedById: String(form.get("approvedById") || ""),
    notes: String(form.get("notes") || "")
  });
  if (!result.success) return NextResponse.redirect(new URL("/subscriptions?error=invalid", request.url), 303);
  const data = result.data;
  const total = data.monthlySubscription + data.buildingFund + data.cemeteryFund + data.gospelFund +
    data.poorWelfareFund + data.menFellowshipFund + data.womenFellowshipFund +
    data.youthFellowshipFund + data.womenMinistryFund + data.healthFacilityFund;
  const paidAt = new Date();
  const requestDate = parseDate(data.requestDate);
  if ((data.requestDate && !requestDate)) {
    return NextResponse.redirect(new URL("/subscriptions?error=invalid", request.url), 303);
  }
  const memberIds = [...new Set(data.memberIds)];

  try {
    if (!await prisma.church.findUnique({ where: { id: "singleton" }, select: { id: true } })) {
      return NextResponse.redirect(new URL("/church?error=required", request.url), 303);
    }
    if ((await prisma.member.count({ where: { id: { in: memberIds }, isActive: true, subscriptionEligible: true } })) !== memberIds.length) {
      return NextResponse.redirect(new URL("/subscriptions?error=relation", request.url), 303);
    }
    const selectedMembers = await prisma.member.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, firstName: true, lastName: true }
    });
    const membersById = new Map(selectedMembers.map((member) => [member.id, member]));
    const userIds = [...new Set([data.verifiedById, data.approvedById].filter(Boolean))];
    if (userIds.length && (await prisma.user.count({ where: { id: { in: userIds }, isActive: true } })) !== userIds.length) {
      return NextResponse.redirect(new URL("/subscriptions?error=relation", request.url), 303);
    }
    await prisma.$transaction(async (tx) => {
      for (const [index, memberId] of memberIds.entries()) {
        const member = membersById.get(memberId);
        if (!member) throw new Error("Selected subscription member could not be loaded.");
        const subscriptionName = createSubscriptionName(`${member.firstName} ${member.lastName}`, data.financialYear, data.period);
        const receiptNo = generateReceiptNumber(paidAt, index + 1);
        const subscription = await tx.subscription.create({
          data: {
            subscriptionCode: data.subscriptionCode || null,
            name: subscriptionName,
            churchId: "singleton",
            memberId,
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
            amountDue: total,
            amountPaid: total,
            paidAt,
            requestDate: requestDate || new Date(),
            isVerified: data.isVerified,
            verifiedById: data.isVerified ? data.verifiedById || null : null,
            isApproved: data.isApproved,
            approvedById: data.isApproved ? data.approvedById || null : null,
            receiptNo,
            notes: data.notes || null,
            status: getPaymentStatus(total, total)
          }
        });
        if (total > 0) {
          await tx.accountEntry.create({
            data: {
              sourceSubscriptionId: subscription.id,
              kind: "INCOME",
              category: "Subscription",
              description: subscriptionName,
              amount: total,
              reference: receiptNo,
              entryDate: paidAt || new Date()
            }
          });
        }
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.redirect(new URL("/subscriptions?error=duplicate", request.url), 303);
    }
    console.error("Subscription creation failed:", error);
    return NextResponse.redirect(new URL("/subscriptions?error=server", request.url), 303);
  }
  return NextResponse.redirect(new URL("/subscriptions", request.url), 303);
}
