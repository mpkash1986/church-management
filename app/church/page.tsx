import { redirect } from "next/navigation";
import FormFeedback from "@/components/FormFeedback";
import LocationFields from "@/components/LocationFields";
import RecordActions from "@/components/RecordActions";
import Shell from "@/components/Shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const churchStatuses = ["ACTIVE", "INACTIVE"];
const dateValue = (date: Date | null) => date?.toISOString().slice(0, 10) || "";

export default async function Church({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  if (!(await getSession())) redirect("/login");
  const [{ error, success }, church, members] = await Promise.all([
    searchParams,
    prisma.church.findUnique({ where: { id: "singleton" }, include: { seniorPastor: true } }),
    prisma.member.findMany({ orderBy: [{ lastName: "asc" }, { firstName: "asc" }] })
  ]);
  const memberOptions = members.map((member) => ({ value: member.id, label: `${member.firstName} ${member.lastName}` }));

  return <Shell title="Church">
    <FormFeedback error={error} />
    {success && <p className="notice" role="status">Church profile saved.</p>}
    {!church ? <section className="panel"><h2>Church profile</h2><p className="muted">The church profile is not initialized. Run the database seed command before setup.</p></section> :
      <section className="panel church-profile">
        {church.logoPath && <img className="church-logo" src={church.logoPath} alt={`${church.name} logo`} />}
        <div><h2>{church.name}</h2><p className="muted">{[
          church.addressLine1, church.area, church.landmark, church.city, church.district, church.state, church.postalCode
        ].filter(Boolean).join(", ") || "Add the church address and contact details."}</p>
          <p>{[church.phone, church.email].filter(Boolean).join(" · ") || "No contact information added."}</p>
          {church.websiteUrl && <a href={church.websiteUrl} target="_blank" rel="noreferrer">{church.websiteLinkText || church.websiteUrl}</a>}
          {church.description && <p>{church.description}</p>}
          <p><span className="pill">{church.status}</span>{church.seniorPastor && <> · Senior Pastor: {church.seniorPastor.firstName} {church.seniorPastor.lastName}</>}</p>
          <p className="muted">Church ID: {church.churchCode || "Not set"}</p>
        </div>
        <RecordActions entity="church" id="singleton" canDelete={false} fields={[
          { name: "churchCode", label: "Church ID", value: church.churchCode || "" },
          { name: "name", label: "Name", value: church.name, required: true },
          { name: "logoPath", label: "Logo", value: church.logoPath || "", type: "image" },
          { name: "addressLine1", label: "Street", value: church.addressLine1 || "" },
          { name: "area", label: "Area", value: church.area || "" },
          { name: "landmark", label: "Landmark", value: church.landmark || "" },
          { name: "city", label: "City", value: church.city || "" },
          { name: "district", label: "District", value: church.district || "" },
          { name: "state", label: "State", value: church.state || "" },
          { name: "postalCode", label: "Postal Code", value: church.postalCode || "" },
          { name: "phone", label: "Phone", value: church.phone || "" },
          { name: "email", label: "Email", value: church.email || "", type: "email" },
          { name: "websiteUrl", label: "Website URL", value: church.websiteUrl || "" },
          { name: "websiteLinkText", label: "Website link text", value: church.websiteLinkText || "" },
          { name: "description", label: "Description", value: church.description || "", type: "textarea" },
          { name: "status", label: "Church Status", value: church.status, type: "select", options: churchStatuses },
          { name: "seniorPastorId", label: "Senior Pastor", value: church.seniorPastorId || "", type: "select", options: memberOptions }
        ]} />
      </section>}
  </Shell>;
}
