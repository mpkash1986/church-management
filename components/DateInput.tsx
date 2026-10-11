"use client";

import type { ChangeEvent } from "react";

type Props = {
  id?: string;
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  required?: boolean;
};

export default function DateInput({ id, name, value = "", onChange, readOnly = false, required = false }: Props) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange?.(event.currentTarget.value);
  }

  return <input
    id={id}
    name={name}
    type="date"
    value={value}
    onChange={handleChange}
    readOnly={readOnly}
    required={required}
  />;
}
