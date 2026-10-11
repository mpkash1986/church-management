import { redirect } from "next/navigation";
import FormFeedback from "@/components/FormFeedback";
import RecordActions from "@/components/RecordActions";
import Shell from "@/components/Shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const statuses = ["ACTIVE", "INACTIVE", "COMPLETED"];

export default async function Ministries({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!(await getSession())) redirect("/login");
  const [{ error }, church, ministries, members] = await Promise.all([
    searchParams,
    prisma.church.findUnique({ where: { id: "singleton" }, select: { name: true } }),
    prisma.ministry.findMany({ include: { leader: true, members: true }, orderBy: { name: "asc" } }),
    prisma.member.findMany({ orderBy: [{ lastName: "asc" }, { firstName: "asc" }] })
  ]);
  const memberOptions = members.map((member) => ({
    value: member.id,
    label: `${member.firstName} ${member.lastName}${member.isActive ? "" : " (inactive)"}`
  }));

  return <Shell title="Ministries">
    <FormFeedback error={error} />
    <section className="panel">
      <h2>Create ministry</h2>
      <form action="/api/ministries" method="post" className="form-grid">
        <div className="field"><label>Ministry ID</label><input name="ministryCode" /></div>
        <div className="field"><label>Name *</label><input name="name" required /></div>
        <div className="field"><label>Church</label><input value={church?.name || "Church profile not configured"} readOnly /></div>
        <div className="field"><label>Ministry Leader</label><select name="leaderId"><option value="">- None -</option>{memberOptions.map((member) => <option key={member.value} value={member.value}>{member.label}</option>)}</select></div>
        <div className="field"><label>Members</label><select name="memberIds" multiple size={5}>{memberOptions.map((member) => <option key={member.value} value={member.value}>{member.label}</option>)}</select></div>
        <div className="field"><label>Description</label><textarea name="description" /></div>
        <div className="field"><label>Status</label><select name="status">{statuses.map((status) => <option key={status}>{status}</option>)}</select></div>
        <div className="field"><label>Notes</label><textarea name="notes" /></div>
        <div style={{ alignSelf: "end" }}><button type="submit">Create ministry</button></div>
      </form>
    </section>
    <section className="panel">
      <h2>Ministries ({ministries.length})</h2>
      <div className="table-wrap"><table>
        <thead><tr><th>Name</th><th>Ministry ID</th><th>Leader</th><th>Members</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{ministries.map((ministry) => <tr key={ministry.id}>
          <td>{ministry.name}</td><td>{ministry.ministryCode || "—"}</td>
          <td>{ministry.leader ? `${ministry.leader.firstName} ${ministry.leader.lastName}` : "—"}</td>
          <td>{ministry.members.map((member) => `${member.firstName} ${member.lastName}`).join(", ") || "—"}</td>
          <td>{ministry.status}</td>
          <td><RecordActions entity="ministries" id={ministry.id} fields={[
            { name: "ministryCode", label: "Ministry ID", value: ministry.ministryCode || "" },
            { name: "name", label: "Name", value: ministry.name, required: true },
            { name: "leaderId", label: "Ministry Leader", value: ministry.leaderId || "", type: "select", options: memberOptions },
            { name: "memberIds", label: "Members", value: ministry.members.map((member) => member.id), type: "multiselect", options: memberOptions },
            { name: "description", label: "Description", value: ministry.description || "", type: "textarea" },
            { name: "status", label: "Status", value: ministry.status, type: "select", options: statuses },
            { name: "notes", label: "Notes", value: ministry.notes || "", type: "textarea" }
          ]} /></td>
        </tr>)}</tbody>
      </table></div>
    </section>
  </Shell>;
}
