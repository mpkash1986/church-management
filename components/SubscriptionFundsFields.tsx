"use client";

import { useState } from "react";
import { subscriptionFunds } from "@/lib/subscription-funds";

export default function SubscriptionFundsFields() {
  const [values, setValues] = useState<number[]>(subscriptionFunds.map(() => 0));
  const total = values.reduce((sum, amount) => sum + amount, 0);

  return <>
    <div className="fund-grid">{subscriptionFunds.map(([name, label], index) => <div className="field" key={name}>
      <label htmlFor={`subscription-${name}`}>{label}</label>
      <input id={`subscription-${name}`} name={name} type="number" min="0" step="1" defaultValue="0" onChange={(event) => {
        const amount = Number(event.currentTarget.value);
        setValues((previous) => previous.map((value, itemIndex) => itemIndex === index && Number.isSafeInteger(amount) ? amount : value));
      }} />
    </div>)}</div>
    <div className="field subscription-total"><label>Subscription Total (₹)</label><output>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(total)}</output></div>
    <div className="field">
      <label htmlFor="subscription-amount-paid">Amount paid (₹)</label>
      <input id="subscription-amount-paid" name="amountPaid" type="number" value={total} readOnly />
    </div>
  </>;
}
