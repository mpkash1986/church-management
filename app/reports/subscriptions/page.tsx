import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import { getSession } from "@/lib/auth";
import { getCurrentFinancialYear } from "@/lib/financial-year";
import { prisma } from "@/lib/prisma";
import { subscriptionFunds } from "@/lib/subscription-funds";
import { money } from "@/lib/subscriptions";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
type SearchParams = Promise<{ financialYear?: string; period?: string; familyId?: string; memberId?: string }>;

export default async function SubscriptionReport({ searchParams }: { searchParams: SearchParams }) {
  if (!(await getSession())) redirect("/login");
  const params = await searchParams;
  const currentYear = getCurrentFinancialYear();
  const [families, members, years] = await Promise.all([
    prisma.family.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.member.findMany({
      select: { id: true, firstName: true, lastName: true, memberNumber: true, familyId: true, family: { select: { name: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
    }),
    prisma.subscription.findMany({ distinct: ["financialYear"], select: { financialYear: true }, orderBy: { financialYear: "desc" } })
  ]);
  const financialYears = [...new Set([currentYear, ...years.map((item) => item.financialYear)])].sort().reverse();
  const financialYear = financialYears.includes(params.financialYear || "") ? params.financialYear! : currentYear;
  const period = months.includes(params.period || "") ? params.period! : "";
  const familyId = families.some((family) => family.id === params.familyId) ? params.familyId! : "";
  const memberId = members.some((member) => member.id === params.memberId) ? params.memberId! : "";

  const subscriptions = await prisma.subscription.findMany({
    where: {
      financialYear,
      ...(period ? { period } : {}),
      ...(memberId ? { memberId } : {}),
      ...(familyId ? { member: { familyId } } : {})
    },
    include: { member: { select: { id: true, firstName: true, lastName: true, memberNumber: true, family: { select: { name: true } } } } },
    orderBy: [{ member: { lastName: "asc" } }, { member: { firstName: "asc" } }, { period: "asc" }]
  });

  const rows = new Map<string, {
    member: typeof subscriptions[number]["member"];
    funds: Record<string, number>;
    due: number;
    paid: number;
  }>();
  for (const subscription of subscriptions) {
    const row = rows.get(subscription.memberId) || {
      member: subscription.member,
      funds: Object.fromEntries(subscriptionFunds.map(([field]) => [field, 0])),
      due: 0,
      paid: 0
    };
    for (const [field] of subscriptionFunds) row.funds[field] += subscription[field];
    row.due += subscription.amountDue;
    row.paid += subscription.amountPaid;
    rows.set(subscription.memberId, row);
  }
  const totals = [...rows.values()].reduce((result, row) => {
    for (const [field] of subscriptionFunds) result.funds[field] += row.funds[field];
    result.due += row.due;
    result.paid += row.paid;
    return result;
  }, { funds: Object.fromEntries(subscriptionFunds.map(([field]) => [field, 0])) as Record<string, number>, due: 0, paid: 0 });

  return <Shell title="Fund Report">
    <section className="panel">
      <h2>Filters</h2>
      <form method="get" className="form-grid">
        <div className="field"><label htmlFor="financialYear">Financial year</label><select id="financialYear" name="financialYear" defaultValue={financialYear}>{financialYears.map((year) => <option key={year}>{year}</option>)}</select></div>
        <div className="field"><label htmlFor="period">Month</label><select id="period" name="period" defaultValue={period}><option value="">All months</option>{months.map((month) => <option key={month}>{month}</option>)}</select></div>
        <div className="field"><label htmlFor="familyId">Family</label><select id="familyId" name="familyId" defaultValue={familyId}><option value="">All families</option>{families.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}</select></div>
        <div className="field"><label htmlFor="memberId">Member</label><select id="memberId" name="memberId" defaultValue={memberId}><option value="">All members</option>{members.map((member) => <option key={member.id} value={member.id}>{member.memberNumber ? `${member.memberNumber} - ` : ""}{member.firstName} {member.lastName}{member.family ? ` (${member.family.name})` : ""}</option>)}</select></div>
        <div style={{ alignSelf: "end" }}><button type="submit">Apply filters</button></div>
      </form>
    </section>
    <section className="panel">
      <h2>Member fund totals · {financialYear}{period ? ` · ${period}` : ""}</h2>
      {!rows.size ? <p className="muted">No subscriptions match the selected filters.</p> : <div className="table-wrap"><table>
        <thead><tr><th>Member</th><th>Family</th>{subscriptionFunds.map(([, label]) => <th key={label}>{label}</th>)}<th>Assessed</th><th>Paid</th><th>Balance</th></tr></thead>
        <tbody>{[...rows.values()].map((row) => <tr key={row.member.id}>
          <td>{row.member.memberNumber ? `${row.member.memberNumber} - ` : ""}{row.member.firstName} {row.member.lastName}</td>
          <td>{row.member.family?.name || "—"}</td>
          {subscriptionFunds.map(([field]) => <td key={field}>{money(row.funds[field])}</td>)}
          <td>{money(row.due)}</td><td>{money(row.paid)}</td><td>{money(Math.max(0, row.due - row.paid))}</td>
        </tr>)}</tbody>
        <tfoot><tr><th colSpan={2}>Overall total</th>{subscriptionFunds.map(([field]) => <th key={field}>{money(totals.funds[field])}</th>)}<th>{money(totals.due)}</th><th>{money(totals.paid)}</th><th>{money(Math.max(0, totals.due - totals.paid))}</th></tr></tfoot>
      </table></div>}
    </section>
  </Shell>;
}
