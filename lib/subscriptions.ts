import { PaymentStatus } from "@prisma/client";

export function getPaymentStatus(amountDue: number, amountPaid: number): PaymentStatus {
  if (amountDue <= 0) return "WAIVED";
  if (amountPaid <= 0) return "PENDING";
  if (amountPaid < amountDue) return "PARTIAL";
  return "PAID";
}

export function money(amountInPaiseOrRupees: number) {
  // Amounts are stored as whole INR rupees in this starter.
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amountInPaiseOrRupees);
}
