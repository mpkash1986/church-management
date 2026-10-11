import { randomBytes } from "node:crypto";

export function generateReceiptNumber(date = new Date(), sequence = 1) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const milliseconds = String(date.getMilliseconds()).padStart(3, "0");
  const suffix = String(sequence).padStart(3, "0");
  const unique = randomBytes(3).toString("hex").toUpperCase();
  return `RCP-${year}${month}${day}-${hours}${minutes}${seconds}-${milliseconds}-${suffix}-${unique}`;
}
