import Link from "next/link";
import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getUpcomingReminders } from "@/lib/reminders";
import { money } from "@/lib/subscriptions";
import { subscriptionFunds } from "@/lib/subscription-funds";
import { getCurrentFinancialYear } from "@/lib/financial-year";
import { formatDateDisplay } from "@/lib/date-format";
export default async function Dashboard(){
  if(!(await getSession())) redirect("/login");
  const financialYear = getCurrentFinancialYear();
  const [members,families,fellowships,subscriptions,reminders] = await Promise.all([
    prisma.member.count({where:{isActive:true}}),prisma.family.count(),prisma.fellowship.count(),
    prisma.subscription.findMany({where:{financialYear},select:{
      amountDue:true,amountPaid:true,monthlySubscription:true,buildingFund:true,cemeteryFund:true,gospelFund:true,
      poorWelfareFund:true,menFellowshipFund:true,womenFellowshipFund:true,youthFellowshipFund:true,
      womenMinistryFund:true,healthFacilityFund:true
    }}),getUpcomingReminders()
  ]);
  const due=subscriptions.reduce((s,x)=>s+x.amountDue,0), paid=subscriptions.reduce((s,x)=>s+x.amountPaid,0);
  return <Shell title="Dashboard"><div className="cards">
    {[["Active members",members],["Families",families],["Fellowships",fellowships],["Outstanding subscriptions",money(Math.max(0,due-paid))]].map(([k,v])=><div className="card" key={String(k)}><div className="muted">{k}</div><div className="metric">{v}</div></div>)}
  </div><section className="panel"><h2>Coming up next week (Sunday to Saturday)</h2>{reminders.length?<div className="table-wrap"><table><thead><tr><th>Date</th><th>Name</th><th>Occasion</th><th>When</th></tr></thead><tbody>{reminders.map(r=><tr key={r.id}><td>{formatDateDisplay(r.date)}</td><td>{r.name}</td><td>{r.type}</td><td>{r.daysUntil===0?"Today":`In ${r.daysUntil} day(s)`}</td></tr>)}</tbody></table></div>:<p className="muted">No birthdays or anniversaries next week. The calendar is taking a breather.</p>}</section><section className="panel"><h2>Quick actions</h2><div className="actions"><Link className="btn" href="/members">Manage members</Link><Link className="btn secondary" href="/subscriptions">Record subscription</Link><Link className="btn secondary" href="/accounts">View accounts</Link></div></section></Shell>
}