import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
const links = [["/dashboard","Dashboard"],["/create","Create"],["/church","Church"],["/families","Families"],["/fellowships","Fellowships"],["/members","Members"],["/ministries","Ministries"],["/subscriptions","Subscriptions"],["/reports/subscriptions","Fund Report"],["/reminders","Reminders"],["/accounts","Accounts"]];
export default async function Shell({ children, title }: { children: React.ReactNode; title: string }) {
  const [user, church] = await Promise.all([
    getSession(),
    prisma.church.findUnique({ where: { id: "singleton" }, select: { name: true } })
  ]);
  const visibleLinks = user?.role === "ADMIN" ? [...links, ["/users","Users"]] : links;
  const churchName = church?.name || process.env.CHURCH_NAME || "Church";
  return <div className="shell"><aside className="sidebar"><div className="brand">⛪ Church Desk</div><nav className="nav">{visibleLinks.map(([href,label])=><Link href={href} key={href}>{label}</Link>)}</nav><div style={{marginTop:32,fontSize:13,color:"#bdc9df"}}>{user?.name}<br/>{user?.role}</div><form action="/api/auth/logout" method="post" style={{marginTop:14}}><button className="btn secondary" type="submit">Sign out</button></form></aside><main className="main"><div className="topbar"><div><div className="muted">Church Management System</div><h1 style={{margin:"5px 0",fontSize:26}}>{title}</h1></div><span className="pill">{churchName}</span></div>{children}</main></div>;
}