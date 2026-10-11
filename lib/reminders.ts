import { prisma } from "@/lib/prisma";

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function getUpcomingReminders() {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  const daysUntilSunday = (7 - today.getDay()) % 7 || 7;
  start.setDate(start.getDate() + daysUntilSunday);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const members = await prisma.member.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true, dateOfBirth: true, weddingAnniversary: true, phone: true, email: true }
  });
  const reminders: { id: string; memberId: string; name: string; type: "Birthday" | "Anniversary"; date: string; daysUntil: number; contact?: string | null }[] = [];
  for (const m of members) {
    for (const [type, source] of [["Birthday", m.dateOfBirth], ["Anniversary", m.weddingAnniversary]] as const) {
      if (!source) continue;
      for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
        const occurrence = new Date(year, source.getMonth(), source.getDate());
        occurrence.setHours(0, 0, 0, 0);
        if (occurrence >= start && occurrence <= end) {
          const daysUntil = Math.round((occurrence.getTime() - today.getTime()) / 86400000);
          reminders.push({
            id: `${m.id}-${type}`, memberId: m.id, name: `${m.firstName} ${m.lastName}`,
            type, date: localDateString(occurrence), daysUntil, contact: m.phone || m.email
          });
          break;
        }
      }
    }
  }
  return reminders.sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name));
}
