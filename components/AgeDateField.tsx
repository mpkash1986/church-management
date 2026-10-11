"use client";

import { useState } from "react";
import DateInput from "@/components/DateInput";
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
    <DateInput id={id} name={name} value={dateOfBirth} onChange={setDateOfBirth} />
    {age !== null && <output className="muted" aria-live="polite">Age: {age}</output>}
  </div>;
}
