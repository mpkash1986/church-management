import { redirect } from "next/navigation";
import FormFeedback from "@/components/FormFeedback";
import ImageUpload from "@/components/ImageUpload";
import RecordActions from "@/components/RecordActions";
import Shell from "@/components/Shell";
import LocationFields from "@/components/LocationFields";
import AgeDateField from "@/components/AgeDateField";
import DateInput from "@/components/DateInput";
import { getSession } from "@/lib/auth";
import { formatMemberNumber, getHighestMemberNumber } from "@/lib/member-number";
import { calculateAge, localDateString } from "@/lib/age";
import { prisma } from "@/lib/prisma";

const salutations = ["Mr.", "Mrs.", "Ms.", "Master", "Miss", "Child", "Dr."];
const genders = ["MALE", "FEMALE", "OTHER"];
const maritalStatuses = ["SINGLE", "MARRIED", "WIDOWED", "DIVORCED"];
const membershipStatuses = ["ACTIVE", "INACTIVE", "TRANSFERRED", "DECEASED"];
const baptismStatuses = ["BAPTIZED", "NOT_BAPTIZED", "NOT_APPLICABLE"];
const groupOptions = ["ACTIVE", "INACTIVE", "COMPLETED"];
const dateValue = (date: Date | null) => date?.toISOString().slice(0, 10) || "";

export default async function Members({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!(await getSession())) redirect("/login");
  const [{ error }, church, members, families, fellowships, ministries, memberNumberCounter] = await Promise.all([
    searchParams,
    prisma.church.findUnique({ where: { id: "singleton" }, select: { name: true } }),
    prisma.member.findMany({
      include: { family: true, ministry: true, primaryFellowship: true, fellowships: { include: { fellowship: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
    }),
    prisma.family.findMany({ orderBy: { name: "asc" } }),
    prisma.fellowship.findMany({ orderBy: { name: "asc" } }),
    prisma.ministry.findMany({ orderBy: { name: "asc" } }),
    prisma.memberNumberCounter.findUnique({ where: { id: "singleton" }, select: { value: true } })
  ]);
  const familyOptions = families.map((family) => ({ value: family.id, label: family.name }));
  const fellowshipOptions = fellowships.map((fellowship) => ({ value: fellowship.id, label: fellowship.name }));
  const ministryOptions = ministries.map((ministry) => ({ value: ministry.id, label: ministry.name }));
  const ageAsOf = localDateString(new Date());

  return <Shell title="Members">
    <FormFeedback error={error} />
    <section className="panel">
      <h2>Create member</h2>
      <form action="/api/members" method="post" className="form-grid">
        <div className="field"><label>Church</label><input value={church?.name || "Church profile not configured"} readOnly /></div>
        <div className="field"><label htmlFor="member-number">Member ID</label><input id="member-number" value={formatMemberNumber(Math.max(memberNumberCounter?.value || 0, getHighestMemberNumber(members.map((member) => member.memberNumber))) + 1)} readOnly /></div>
        <div className="field"><label>Salutation</label><select name="salutation"><option value="">- None -</option>{salutations.map((value) => <option key={value}>{value}</option>)}</select></div>
        <div className="field"><label>Name *</label><input name="name" required /></div>
        <AgeDateField id="new-member-dateOfBirth" name="dateOfBirth" asOf={ageAsOf} />
        <div className="field"><label>Gender</label><select name="gender"><option value="">- None -</option>{genders.map((value) => <option key={value}>{value}</option>)}</select></div>
        <div className="field"><label>Marital Status</label><select name="maritalStatus"><option value="">- None -</option>{maritalStatuses.map((value) => <option key={value}>{value}</option>)}</select></div>
        <ImageUpload name="profilePhotoPath" label="Profile Photo" />
        <div className="field"><label>Street</label><input name="addressLine1" /></div>
        <div className="field"><label>Area</label><input name="area" /></div>
        <div className="field"><label>Landmark</label><input name="landmark" /></div>
        <div className="field"><label>City</label><input name="city" /></div>
        <LocationFields idPrefix="member" />
        <div className="field"><label>Postal Code</label><input name="postalCode" /></div>
        <div className="field"><label>Phone</label><input name="phone" type="tel" /></div>
        <div className="field"><label>Email</label><input name="email" type="email" /></div>
        <div className="field"><label>Emergency Contact</label><input name="emergencyContact" type="tel" /></div>
        <div className="field"><label htmlFor="member-joinedAt">Join Date</label><DateInput id="member-joinedAt" name="joinedAt" /></div>
        <div className="field"><label>Membership Status</label><select name="membershipStatus">{membershipStatuses.map((value) => <option key={value}>{value}</option>)}</select></div>
        <div className="field"><label>Subscription</label><select name="subscriptionEligible" defaultValue="false"><option value="true">Eligible</option><option value="false">Not eligible</option></select></div>
        <div className="field"><label htmlFor="member-expirationDate">Expiration Date</label><DateInput id="member-expirationDate" name="membershipExpiresAt" /></div>
        <div className="field"><label>Baptism Status</label><select name="baptismStatus"><option value="">- None -</option>{baptismStatuses.map((value) => <option key={value}>{value}</option>)}</select></div>
        <div className="field"><label>Family</label><select name="familyId"><option value="">- None -</option>{families.map((family) => <option value={family.id} key={family.id}>{family.name}</option>)}</select></div>
        <div className="field"><label>Ministry</label><select name="ministryId"><option value="">- None -</option>{ministries.map((ministry) => <option value={ministry.id} key={ministry.id}>{ministry.name}</option>)}</select></div>
        <div className="field"><label>Fellowship</label><select name="primaryFellowshipId"><option value="">- None -</option>{fellowships.map((fellowship) => <option value={fellowship.id} key={fellowship.id}>{fellowship.name}</option>)}</select></div>
        <div className="field"><label>Additional Fellowships</label><select name="fellowshipIds" multiple size={4}>{fellowships.map((fellowship) => <option value={fellowship.id} key={fellowship.id}>{fellowship.name}</option>)}</select></div>
        <div className="field form-grid-full"><label>Notes</label><textarea name="notes" /></div>
        <div style={{ alignSelf: "end" }}><button type="submit">Create member</button></div>
      </form>
    </section>

    <section className="panel">
      <h2>Member directory ({members.length})</h2>
      <div className="table-wrap"><table>
        <thead><tr><th>Member</th><th>Member ID</th><th>Age</th><th>Family</th><th>Ministry</th><th>Fellowship</th><th>Phone</th><th>Status</th><th>Subscription</th><th>Actions</th></tr></thead>
        <tbody>{members.map((member) => <tr key={member.id}>
          <td>{member.profilePhotoPath && <img className="table-avatar" src={member.profilePhotoPath} alt="" />}{member.salutation ? `${member.salutation} ` : ""}{member.firstName} {member.lastName}<br /><span className="muted">{member.email || ""}</span></td>
          <td>{member.memberNumber || "—"}</td>
          <td>{calculateAge(member.dateOfBirth, ageAsOf) ?? "—"}</td>
          <td>{member.family?.name || "—"}</td>
          <td>{member.ministry?.name || "—"}</td>
          <td>{member.fellowships.map((item) => item.fellowship.name).join(", ") || "—"}</td>
          <td>{member.phone || "—"}</td>
          <td>{member.membershipStatus}</td>
          <td>{member.subscriptionEligible ? "Eligible" : "Not eligible"}</td>
          <td><RecordActions entity="members" id={member.id} ageAsOf={ageAsOf} fields={[
            { name: "firstName", label: "First name", value: member.firstName, required: true },
            { name: "lastName", label: "Last name", value: member.lastName, required: true },
            { name: "memberNumber", label: "Member ID", value: member.memberNumber || "", type: "readonly" },
            { name: "salutation", label: "Salutation", value: member.salutation || "", type: "select", options: salutations },
            { name: "dateOfBirth", label: "Date of birth", value: dateValue(member.dateOfBirth), type: "birthdate" },
            { name: "gender", label: "Gender", value: member.gender || "", type: "select", options: genders },
            { name: "maritalStatus", label: "Marital Status", value: member.maritalStatus || "", type: "select", options: maritalStatuses },
            { name: "profilePhotoPath", label: "Profile Photo", value: member.profilePhotoPath || "", type: "image" },
            { name: "addressLine1", label: "Street", value: member.addressLine1 || "" },
            { name: "area", label: "Area", value: member.area || "" },
            { name: "landmark", label: "Landmark", value: member.landmark || "" },
            { name: "city", label: "City", value: member.city || "" },
            { name: "district", label: "District", value: member.district || "" },
            { name: "state", label: "State", value: member.state || "" },
            { name: "postalCode", label: "Postal Code", value: member.postalCode || "" },
            { name: "phone", label: "Phone", value: member.phone || "" },
            { name: "email", label: "Email", value: member.email || "", type: "email" },
            { name: "emergencyContact", label: "Emergency Contact", value: member.emergencyContact || "" },
            { name: "joinedAt", label: "Join Date", value: dateValue(member.joinedAt), type: "date" },
            { name: "membershipStatus", label: "Membership Status", value: member.membershipStatus, type: "select", options: membershipStatuses },
            { name: "subscriptionEligible", label: "Subscription", value: String(member.subscriptionEligible), type: "select", options: [{ value: "true", label: "Eligible" }, { value: "false", label: "Not eligible" }] },
            { name: "membershipExpiresAt", label: "Expiration Date", value: dateValue(member.membershipExpiresAt), type: "date" },
            { name: "baptismStatus", label: "Baptism Status", value: member.baptismStatus || "", type: "select", options: baptismStatuses },
            { name: "familyId", label: "Family", value: member.familyId || "", type: "select", options: familyOptions },
            { name: "ministryId", label: "Ministry", value: member.ministryId || "", type: "select", options: ministryOptions },
            { name: "primaryFellowshipId", label: "Fellowship", value: member.primaryFellowshipId || "", type: "select", options: fellowshipOptions },
            { name: "fellowshipIds", label: "Additional Fellowships", value: member.fellowships.map((item) => item.fellowshipId), type: "multiselect", options: fellowshipOptions },
            { name: "notes", label: "Notes", value: member.notes || "", type: "textarea" }
          ]} /></td>
        </tr>)}</tbody>
      </table></div>
    </section>
  </Shell>;
}
