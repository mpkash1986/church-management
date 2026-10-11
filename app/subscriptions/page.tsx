import { redirect } from "next/navigation";
import FormFeedback from "@/components/FormFeedback";
import DateInput from "@/components/DateInput";
import RecordActions from "@/components/RecordActions";
import Shell from "@/components/Shell";
import SubscriptionDetailsFields from "@/components/SubscriptionDetailsFields";
import SubscriptionFundsFields from "@/components/SubscriptionFundsFields";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subscriptionFunds } from "@/lib/subscription-funds";
import { money } from "@/lib/subscriptions";
import { formatDateDisplay } from "@/lib/date-format";
import { localDateString } from "@/lib/age";
import { getCurrentFinancialYear, getFinancialYears, isCurrentOrPastFinancialYear } from "@/lib/financial-year";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dateIsoValue = (date: Date | null) => date?.toISOString().slice(0, 10) || "";
const dateValue = (date: Date | null) => date ? formatDateDisplay(dateIsoValue(date)) : "";

export default async function Subscriptions({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!(await getSession())) redirect("/login");
  const currentFinancialYear = getCurrentFinancialYear();
  const financialYears = getFinancialYears();
  const [{ error }, church, members, rows, users] = await Promise.all([
    searchParams,
    prisma.church.findUnique({ where: { id: "singleton" }, select: { name: true } }),
    prisma.member.findMany({ where: { isActive: true, subscriptionEligible: true }, orderBy: { lastName: "asc" } }),
    prisma.subscription.findMany({
      include: { member: true, verifiedBy: true, approvedBy: true },
      orderBy: [{ financialYear: "desc" }, { period: "desc" }]
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
  ]);
  const memberOptions = members.map((member) => ({ value: member.id, label: `${member.firstName} ${member.lastName}` }));
  const userOptions = users.map((user) => ({ value: user.id, label: user.name }));
  const editableFinancialYears = [...new Set([
    ...financialYears,
    ...rows.map((row) => row.financialYear).filter((year) => isCurrentOrPastFinancialYear(year))
  ])].sort((left, right) => Number(right.slice(0, 4)) - Number(left.slice(0, 4)));
  const due = rows.reduce((sum, row) => sum + row.amountDue, 0);
  const paid = rows.reduce((sum, row) => sum + row.amountPaid, 0);

  return <Shell title="Subscriptions">
    <FormFeedback error={error} />
    <div className="cards">
      <div className="card"><div className="muted">Total assessed</div><div className="metric">{money(due)}</div></div>
      <div className="card"><div className="muted">Total collected</div><div className="metric">{money(paid)}</div></div>
      <div className="card"><div className="muted">Balance outstanding</div><div className="metric">{money(Math.max(0, due - paid))}</div></div>
    </div>
    <section className="panel">
      <h2>Create subscription</h2>
      <p className="muted">The same fund breakdown is assessed separately for every selected member.</p>
      <form action="/api/subscriptions" method="post" className="form-grid">
        <SubscriptionDetailsFields members={memberOptions} financialYears={financialYears} currentFinancialYear={currentFinancialYear} months={months} />
        <div className="field"><label>Subscription ID</label><input name="subscriptionCode" /></div>
        <div className="field"><label>Church</label><input value={church?.name || "Church profile not configured"} readOnly /></div>
        <div className="field form-grid-full"><label>Subscription funds (₹)</label><SubscriptionFundsFields /></div>
        <div className="field"><label>Receipt number</label><input value="Generated automatically when saved" readOnly /></div>
        <div className="field"><label htmlFor="subscription-paidAt">Payment date</label><DateInput id="subscription-paidAt" value={localDateString(new Date())} readOnly /></div>
        <div className="field"><label htmlFor="subscription-requestDate">Request Date</label><DateInput id="subscription-requestDate" name="requestDate" value={localDateString(new Date())} /></div>
        <div className="field check-field"><label><input name="isVerified" type="checkbox" /> Verified</label></div>
        <div className="field"><label>Verified By</label><select name="verifiedById"><option value="">- None -</option>{userOptions.map((user) => <option key={user.value} value={user.value}>{user.label}</option>)}</select></div>
        <div className="field check-field"><label><input name="isApproved" type="checkbox" /> Approved Status</label></div>
        <div className="field"><label>Approved By</label><select name="approvedById"><option value="">- None -</option>{userOptions.map((user) => <option key={user.value} value={user.value}>{user.label}</option>)}</select></div>
        <div className="field form-grid-full"><label>Notes</label><textarea name="notes" /></div>
        <div style={{ alignSelf: "end" }}><button type="submit">Create subscription</button></div>
      </form>
      <p className="muted">Amounts are in whole Indian rupees. Payments are automatically reflected in the cashbook.</p>
    </section>
    <section className="panel">
      <h2>Subscription ledger ({rows.length})</h2>
      <div className="table-wrap"><table>
        <thead><tr><th>Name / ID</th><th>Member</th><th>Financial year</th><th>Month</th><th>Total</th><th>Paid</th><th>Receipt number</th><th>Payment date</th><th>Request date</th><th>Status</th><th>Verified</th><th>Approved</th><th>Actions</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id}>
          <td>{row.name}<br /><span className="muted">{row.subscriptionCode || "—"}</span></td>
          <td>{row.member.firstName} {row.member.lastName}</td>
          <td>{row.financialYear}</td>
          <td>{row.period}</td>
          <td>{money(row.amountDue)}</td>
          <td>{money(row.amountPaid)}</td>
          <td>{row.receiptNo || "—"}</td>
          <td>{dateValue(row.paidAt) || "—"}</td>
          <td>{dateValue(row.requestDate)}</td>
          <td><span className="pill">{row.status}</span></td>
          <td>{row.isVerified ? `Yes${row.verifiedBy ? ` · ${row.verifiedBy.name}` : ""}` : "No"}</td>
          <td>{row.isApproved ? `Yes${row.approvedBy ? ` · ${row.approvedBy.name}` : ""}` : "No"}</td>
          <td><RecordActions entity="subscriptions" id={row.id} fields={[
            { name: "name", label: "Name", value: row.name, type: "readonly", required: true },
            { name: "subscriptionCode", label: "Subscription ID", value: row.subscriptionCode || "" },
            { name: "memberId", label: "Member", value: row.memberId, type: "select", options: memberOptions, required: true },
            { name: "financialYear", label: "Financial Year", value: row.financialYear, type: "select", options: editableFinancialYears, required: true },
            { name: "period", label: "Month", value: row.period, type: "select", options: months, required: true },
            ...subscriptionFunds.map(([name, label]) => ({ name, label, value: String(row[name]), type: "number" as const, required: true })),
            { name: "subscriptionTotal", label: "Subscription Total (₹)", value: String(row.amountDue), type: "computed", computeFrom: subscriptionFunds.map(([name]) => name) },
            { name: "amountPaid", label: "Amount paid (₹)", value: String(row.amountPaid), type: "readonly" },
            { name: "paidAt", label: "Payment date", value: dateIsoValue(row.paidAt), type: "readonly" },
            { name: "requestDate", label: "Request Date", value: dateIsoValue(row.requestDate), type: "date" },
            { name: "isVerified", label: "Verified", value: row.isVerified },
            { name: "verifiedById", label: "Verified By", value: row.verifiedById || "", type: "select", options: userOptions },
            { name: "isApproved", label: "Approved Status", value: row.isApproved },
            { name: "approvedById", label: "Approved By", value: row.approvedById || "", type: "select", options: userOptions },
            { name: "receiptNo", label: "Receipt number", value: row.receiptNo || "Generated automatically", type: "readonly" },
            { name: "notes", label: "Notes", value: row.notes || "", type: "textarea" }
          ]} /></td>
        </tr>)}</tbody>
      </table></div>
    </section>
  </Shell>;
}
