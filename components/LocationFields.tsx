"use client";

import { useState } from "react";
import { DEFAULT_STATE, TAMIL_NADU_DISTRICTS } from "@/lib/locations";

type Props = {
  idPrefix: string;
  districtValue?: string | null;
};

export default function LocationFields({ idPrefix, districtValue }: Props) {
  const [district, setDistrict] = useState(districtValue || "");
  const districts = district && !TAMIL_NADU_DISTRICTS.includes(district)
    ? [...TAMIL_NADU_DISTRICTS, district]
    : TAMIL_NADU_DISTRICTS;

  return <>
    <div className="field">
      <label htmlFor={`${idPrefix}-district`}>District</label>
      <select id={`${idPrefix}-district`} name="district" value={district} onChange={(event) => setDistrict(event.target.value)}>
        <option value="">- Select district -</option>
        {districts.map((value) => <option key={value}>{value}</option>)}
      </select>
    </div>
    <div className="field">
      <label htmlFor={`${idPrefix}-state`}>State</label>
      <input id={`${idPrefix}-state`} name="state" value={DEFAULT_STATE} readOnly />
    </div>
  </>;
}
