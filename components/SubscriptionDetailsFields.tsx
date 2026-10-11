"use client";

import { useState } from "react";
import { createSubscriptionName } from "@/lib/subscription-name";

type Option = { value: string; label: string };

type Props = {
  members: Option[];
  financialYears: string[];
  currentFinancialYear: string;
  months: string[];
};

export default function SubscriptionDetailsFields({ members, financialYears, currentFinancialYear, months }: Props) {
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [financialYear, setFinancialYear] = useState(currentFinancialYear);
  const [period, setPeriod] = useState("");
  const namesById = new Map(members.map((member) => [member.value, member.label]));
  const name = selectedMemberIds
    .map((id) => namesById.get(id))
    .filter((memberName): memberName is string => Boolean(memberName))
    .map((memberName) => createSubscriptionName(memberName, financialYear, period))
    .join(" | ");

  return <>
    <div className="field">
      <label htmlFor="subscription-name">Name</label>
      <input id="subscription-name" name="name" value={name} readOnly required />
    </div>
    <div className="field">
      <label htmlFor="subscription-members">Members *</label>
      <select
        id="subscription-members"
        name="memberIds"
        multiple
        size={5}
        required
        value={selectedMemberIds}
        onChange={(event) => setSelectedMemberIds(Array.from(event.currentTarget.selectedOptions, (option) => option.value))}
      >
        {members.map((member) => <option key={member.value} value={member.value}>{member.label}</option>)}
      </select>
    </div>
    <div className="field">
      <label htmlFor="subscription-financial-year">Financial Year *</label>
      <select id="subscription-financial-year" name="financialYear" required value={financialYear} onChange={(event) => setFinancialYear(event.target.value)}>
        {financialYears.map((year) => <option key={year}>{year}</option>)}
      </select>
    </div>
    <div className="field">
      <label htmlFor="subscription-period">Month *</label>
      <select id="subscription-period" name="period" required value={period} onChange={(event) => setPeriod(event.target.value)}>
        <option value="">- None -</option>
        {months.map((month) => <option key={month}>{month}</option>)}
      </select>
    </div>
  </>;
}
