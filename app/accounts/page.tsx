import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import RecordActions from "@/components/RecordActions";
import FormFeedback from "@/components/FormFeedback";
import DateInput from "@/components/DateInput";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/subscriptions";
import { formatDateDisplay } from "@/lib/date-format";

const dateIsoValue = (date: Date) => date.toISOString().slice(0, 10);
const dateValue = (date: Date) => formatDateDisplay(dateIsoValue(date));

export default async function Accounts({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!(await getSession())) redirect("/login");
  const [{ error }, entries] = await Promise.all([
    searchParams,
    prisma.accountEntry.findMany({ orderBy: { entryDate: "desc" } })
  ]);
  const income = entries.filter((entry) => entry.kind === "INCOME").reduce((sum, entry) => sum + entry.amount, 0);
  const expense = entries.filter((entry) => entry.kind === "EXPENSE").reduce((sum, entry) => sum + entry.amount, 0);

  return <Shell title="Accounts">
    <FormFeedback error={error} />
    <div className="cards">
      <div className="card"><div className="muted">Recorded income</div><div className="metric">{money(income)}</div></div>
      <div className="card"><div className="muted">Recorded expenses</div><div className="metric">{money(expense)}</div></div>
      <div className="card"><div className="muted">Net balance</div><div className="metric">{money(income - expense)}</div></div>
    </div>
    <section className="panel">
      <h2>Add account entry</h2>
      <form action="/api/accounts" method="post" className="form-grid">
        <div className="field"><label htmlFor="account-entryDate">Date</label><DateInput id="account-entryDate" name="entryDate" /></div>
        <div className="field"><label>Type *</label><select name="kind" required><option value="INCOME">Income</option><option value="EXPENSE">Expense</option></select></div>
        <div className="field"><label>Category *</label><input name="category" required placeholder="Offering, utilities, event…" /></div>
        <div className="field"><label>Description *</label><input name="description" required /></div>
        <div className="field"><label>Amount (₹) *</label><input name="amount" type="number" min="1" required /></div>
        <div className="field"><label>Reference / receipt</label><input value="Generated automatically when saved" readOnly /></div>
        <div style={{ alignSelf: "end" }}><button>Save entry</button></div>
      </form>
      <p className="muted">This is a simple cashbook, not a full double-entry accounting system. Subscription payment entries are managed from Subscriptions.</p>
    </section>
    <section className="panel">
      <h2>Cashbook</h2>
      <div className="table-wrap"><table>
        <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Amount</th><th>Reference</th><th>Actions</th></tr></thead>
        <tbody>{entries.map((entry) => <tr key={entry.id}>
          <td>{dateValue(entry.entryDate)}</td>
          <td>{entry.kind}</td>
          <td>{entry.category}</td>
          <td>{entry.description}</td>
          <td>{money(entry.amount)}</td>
          <td>{entry.reference || "—"}</td>
          <td><RecordActions entity="accounts" id={entry.id} canEdit={!entry.sourceSubscriptionId} canDelete={!entry.sourceSubscriptionId} fields={[
            { name: "entryDate", label: "Date", value: dateIsoValue(entry.entryDate), type: "date" },
            { name: "kind", label: "Type", value: entry.kind, type: "select", options: ["INCOME", "EXPENSE"], required: true },
            { name: "category", label: "Category", value: entry.category, required: true },
            { name: "description", label: "Description", value: entry.description, required: true },
            { name: "amount", label: "Amount (₹)", value: String(entry.amount), type: "number", required: true },
            { name: "reference", label: "Reference / receipt", value: entry.reference || "", type: "readonly" }
          ]} /></td>
        </tr>)}</tbody>
      </table></div>
    </section>
  </Shell>;
}
