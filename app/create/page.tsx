import Link from "next/link";
import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import { getSession } from "@/lib/auth";

const forms = [
  { href: "/church", label: "Church", description: "Manage the church profile and contact details." },
  { href: "/families", label: "Family", description: "Create a family and assign its head and members." },
  { href: "/fellowships", label: "Fellowship", description: "Create a fellowship, choose its leaders, and assign members." },
  { href: "/members", label: "Member", description: "Register a member and connect family, ministry, and fellowship." },
  { href: "/ministries", label: "Ministry", description: "Create a ministry and assign its leader and members." },
  { href: "/subscriptions", label: "Subscription", description: "Assess funds for one or more members and track verification and approval." }
];

export default async function Create() {
  if (!(await getSession())) redirect("/login");
  return <Shell title="Create">
    <section className="create-grid">{forms.map((form) => <Link className="create-card" href={form.href} key={form.href}>
      <span className="create-card-title">{form.label}</span>
      <span className="muted">{form.description}</span>
      <span className="create-card-action">Open form →</span>
    </Link>)}</section>
  </Shell>;
}
