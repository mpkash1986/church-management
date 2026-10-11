import { redirect } from "next/navigation";
import FormFeedback from "@/components/FormFeedback";
import LocationFields from "@/components/LocationFields";
import RecordActions from "@/components/RecordActions";
import Shell from "@/components/Shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const statuses = ["ACTIVE", "INACTIVE"];

export default async function Families({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!(await getSession())) redirect("/login");
  const [{ error }, church, families, members] = await Promise.all([
    searchParams,
    prisma.church.findUnique({ where: { id: "singleton" }, select: { name: true } }),
    prisma.family.findMany({
      include: { familyHead: true, members: true, _count: { select: { members: true } } },
      orderBy: { name: "asc" }
    }),
    prisma.member.findMany({ orderBy: [{ lastName: "asc" }, { firstName: "asc" }] })
  ]);
  const memberOptions = members.map((member) => ({
    value: member.id,
    label: `${member.firstName} ${member.lastName}${member.isActive ? "" : " (inactive)"}`
  }));

  return <Shell title="Families">
    <FormFeedback error={error} />
    <section className="panel">
      <h2>Create family</h2>
      <form action="/api/families" method="post" className="form-grid">
        <div className="field"><label>Church</label><input value={church?.name || "Church profile not configured"} readOnly /></div>
        <div className="field"><label>Family ID</label><input name="familyCode" /></div>
        <div className="field"><label>Name *</label><input name="name" required /></div>
        <div className="field"><label>Address Line 1</label><input name="addressLine1" /></div>
        <div className="field"><label>Address Line 2</label><input name="addressLine2" /></div>
        <div className="field"><label>City</label><input name="city" /></div>
        <LocationFields idPrefix="family" />
        <div className="field"><label>Postal Code</label><input name="postalCode" /></div>
        <div className="field"><label>Phone</label><input name="phone" type="tel" /></div>
        <div className="field"><label>Email</label><input name="email" type="email" /></div>
        <div className="field"><label>Family Head</label><select name="familyHeadId"><option value="">- None -</option>{memberOptions.map((member) => <option key={member.value} value={member.value}>{member.label}</option>)}</select></div>
        <div className="field"><label>Members</label><select name="memberIds" multiple size={5}>{memberOptions.map((member) => <option key={member.value} value={member.value}>{member.label}</option>)}</select></div>
        <div className="field"><label>Family Status</label><select name="status">{statuses.map((status) => <option key={status}>{status}</option>)}</select></div>
        <div className="field"><label>Notes</label><textarea name="notes" /></div>
        <div style={{ alignSelf: "end" }}><button type="submit">Create family</button></div>
      </form>
    </section>
    <section className="panel">
      <h2>Family directory ({families.length})</h2>
      <div className="table-wrap"><table>
        <thead><tr><th>Family</th><th>Family ID</th><th>Family head</th><th>Phone</th><th>Members</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{families.map((family) => <tr key={family.id}>
          <td>{family.name}</td><td>{family.familyCode || "—"}</td>
          <td>{family.familyHead ? `${family.familyHead.firstName} ${family.familyHead.lastName}` : "—"}</td>
          <td>{family.phone || "—"}</td><td>{family._count.members}</td><td>{family.status}</td>
          <td><RecordActions entity="families" id={family.id} fields={[
            { name: "familyCode", label: "Family ID", value: family.familyCode || "" },
            { name: "name", label: "Name", value: family.name, required: true },
            { name: "addressLine1", label: "Address Line 1", value: family.addressLine1 || family.address || "" },
            { name: "addressLine2", label: "Address Line 2", value: family.addressLine2 || "" },
            { name: "city", label: "City", value: family.city || "" },
            { name: "district", label: "District", value: family.district || "" },
            { name: "state", label: "State", value: family.state || "" },
            { name: "postalCode", label: "Postal Code", value: family.postalCode || "" },
            { name: "phone", label: "Phone", value: family.phone || "" },
            { name: "email", label: "Email", value: family.email || "", type: "email" },
            { name: "familyHeadId", label: "Family Head", value: family.familyHeadId || "", type: "select", options: memberOptions },
            { name: "memberIds", label: "Members", value: family.members.map((member) => member.id), type: "multiselect", options: memberOptions },
            { name: "status", label: "Family Status", value: family.status, type: "select", options: statuses },
            { name: "notes", label: "Notes", value: family.notes || "", type: "textarea" }
          ]} /></td>
        </tr>)}</tbody>
      </table></div>
    </section>
  </Shell>;
}
