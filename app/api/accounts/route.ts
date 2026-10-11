import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

function parseDate(value: FormDataEntryValue | null) {
  if (!value) return new Date();
  const date = String(value);
  const parsed = new Date(`${date}T12:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  return parsed;
}

export async function POST(request: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }
  const form = await request.formData();
  const kind = String(form.get("kind") || "");
  const category = String(form.get("category") || "").trim();
  const description = String(form.get("description") || "").trim();
  const amount = Number(form.get("amount"));
  const entryDate = parseDate(form.get("entryDate"));

  if (!["INCOME", "EXPENSE"].includes(kind) || !category || !description ||
    !Number.isInteger(amount) || amount <= 0 || !entryDate) {
    return NextResponse.redirect(new URL("/accounts?error=invalid", request.url), 303);
  }

  try {
    await prisma.accountEntry.create({
      data: {
        kind,
        category,
        description,
        amount,
        entryDate,
        reference: String(form.get("reference") || "").trim() || null
      }
    });
  } catch (error) {
    console.error("Account entry creation failed:", error);
    return NextResponse.redirect(new URL("/accounts?error=server", request.url), 303);
  }
  return NextResponse.redirect(new URL("/accounts", request.url), 303);
}
