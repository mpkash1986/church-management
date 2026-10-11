import { prisma } from "@/lib/prisma";

function dayMonth(date: Date) { return `${date.getMonth()}-${date.getDate()}`; }

export async function getUpcomingReminders(days = 7) {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + days);
  const members = await prisma.member.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true, dateOfBirth: true, weddingAnniversary: true, phone: true, email: true }
  });
  const reminders: { id: string; memberId: string; name: string; type: "Birthday" | "Anniversary"; date: string; daysUntil: number; contact?: string | null }[] = [];
  for (const m of members) {
    for (const [type, source] of [["Birthday", m.dateOfBirth], ["Anniversary", m.weddingAnniversary]] as const) {
      if (!source) continue;
      const next = new Date(now.getFullYear(), source.getMonth(), source.getDate());
      next.setHours(0, 0, 0, 0);
      const today = new Date(now); today.setHours(0, 0, 0, 0);
      if (next < today) next.setFullYear(now.getFullYear() + 1);
      const daysUntil = Math.round((next.getTime() - today.getTime()) / 86400000);
      if (daysUntil >= 0 && daysUntil <= days) reminders.push({
        id: `${m.id}-${type}`, memberId: m.id, name: `${m.firstName} ${m.lastName}`,
        type, date: next.toISOString().slice(0, 10), daysUntil, contact: m.phone || m.email
      });
    }
  }
  return reminders.sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name));
}
