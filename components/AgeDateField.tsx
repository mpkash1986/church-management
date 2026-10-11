"use client";

import { useState } from "react";
import { calculateAge } from "@/lib/age";

type Props = {
  id: string;
  name: string;
  value?: string;
  asOf: string;
};

export default function AgeDateField({ id, name, value = "", asOf }: Props) {
  const [dateOfBirth, setDateOfBirth] = useState(value);
  const age = calculateAge(dateOfBirth, asOf);

  return <div className="field">
    <label htmlFor={id}>Date of birth</label>
    <input id={id} name={name} type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} />
    {age !== null && <output className="muted" aria-live="polite">Age: {age}</output>}
  </div>;
}
