import { redirect } from "next/navigation";
import FormFeedback from "@/components/FormFeedback";
import RecordActions from "@/components/RecordActions";
import Shell from "@/components/Shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const statuses = ["ACTIVE", "INACTIVE", "COMPLETED"];
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function Fellowships({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!(await getSession())) redirect("/login");
  const [{ error }, church, items, members] = await Promise.all([
    searchParams,
    prisma.church.findUnique({ where: { id: "singleton" }, select: { name: true } }),
    prisma.fellowship.findMany({
      include: { members: { include: { member: true } }, leader: true, assistantLeader: true },
      orderBy: { name: "asc" }
    }),
    prisma.member.findMany({ orderBy: [{ lastName: "asc" }, { firstName: "asc" }] })
  ]);
  const memberOptions = members.map((member) => ({
    value: member.id,
    label: `${member.firstName} ${member.lastName}${member.isActive ? "" : " (inactive)"}`
  }));

  return <Shell title="Fellowships">
    <FormFeedback error={error} />
    <section className="panel">
      <h2>Create fellowship</h2>
      <form action="/api/fellowships" method="post" className="form-grid">
        <div className="field"><label>Church</label><input value={church?.name || "Church profile not configured"} readOnly /></div>
        <div className="field"><label>Fellowship ID</label><input name="fellowshipCode" /></div>
        <div className="field"><label>Name *</label><input name="name" required /></div>
        <div className="field"><label>Members</label><select name="memberIds" multiple size={5}>{memberOptions.map((member) => <option key={member.value} value={member.value}>{member.label}</option>)}</select></div>
        <div className="field"><label>Fellowship Leader</label><select name="leaderId"><option value="">- None -</option>{memberOptions.map((member) => <option key={member.value} value={member.value}>{member.label}</option>)}</select></div>
        <div className="field"><label>Assistant Leader</label><select name="assistantLeaderId"><option value="">- None -</option>{memberOptions.map((member) => <option key={member.value} value={member.value}>{member.label}</option>)}</select></div>
        <div className="field"><label>Status</label><select name="status">{statuses.map((status) => <option key={status}>{status}</option>)}</select></div>
        <div className="field"><label>Description</label><textarea name="description" /></div>
        <div className="field"><label>Notes</label><textarea name="notes" /></div>
        <div className="field"><label>Meeting day</label><select name="meetingDay"><option value="">- None -</option>{weekdays.map((day) => <option key={day}>{day}</option>)}</select></div>
        <div className="field"><label>Meeting time</label><input name="meetingTime" type="time" /></div>
        <div style={{ alignSelf: "end" }}><button type="submit">Create fellowship</button></div>
      </form>
    </section>
    <section className="panel">
      <h2>Fellowship groups ({items.length})</h2>
      <div className="table-wrap"><table>
        <thead><tr><th>Name</th><th>Fellowship ID</th><th>Leader</th><th>Assistant leader</th><th>Members</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{items.map((fellowship) => <tr key={fellowship.id}>
          <td>{fellowship.name}</td><td>{fellowship.fellowshipCode || "—"}</td>
          <td>{fellowship.leader ? `${fellowship.leader.firstName} ${fellowship.leader.lastName}` : "—"}</td>
          <td>{fellowship.assistantLeader ? `${fellowship.assistantLeader.firstName} ${fellowship.assistantLeader.lastName}` : "—"}</td>
          <td>{fellowship.members.map((item) => `${item.member.firstName} ${item.member.lastName}`).join(", ") || "—"}</td>
          <td>{fellowship.status}</td>
          <td><RecordActions entity="fellowships" id={fellowship.id} fields={[
            { name: "fellowshipCode", label: "Fellowship ID", value: fellowship.fellowshipCode || "" },
            { name: "name", label: "Name", value: fellowship.name, required: true },
            { name: "memberIds", label: "Members", value: fellowship.members.map((item) => item.memberId), type: "multiselect", options: memberOptions },
            { name: "leaderId", label: "Fellowship Leader", value: fellowship.leaderId || "", type: "select", options: memberOptions },
            { name: "assistantLeaderId", label: "Assistant Leader", value: fellowship.assistantLeaderId || "", type: "select", options: memberOptions },
            { name: "status", label: "Status", value: fellowship.status, type: "select", options: statuses },
            { name: "description", label: "Description", value: fellowship.description || "", type: "textarea" },
            { name: "notes", label: "Notes", value: fellowship.notes || "", type: "textarea" },
            { name: "meetingDay", label: "Meeting day", value: fellowship.meetingDay || "", type: "select", options: weekdays },
            { name: "meetingTime", label: "Meeting time", value: fellowship.meetingTime || "", type: "time" }
          ]} /></td>
        </tr>)}</tbody>
      </table></div>
    </section>
  </Shell>;
}
