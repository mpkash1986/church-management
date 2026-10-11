"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import AgeDateField from "@/components/AgeDateField";
import ImageUpload from "@/components/ImageUpload";
import LocationFields from "@/components/LocationFields";
import { createSubscriptionName } from "@/lib/subscription-name";

export type RecordField = {
  name: string;
  label: string;
  value: string | boolean | string[];
  type?: "text" | "email" | "date" | "number" | "time" | "password" | "textarea" | "select" | "multiselect" | "image" | "computed" | "readonly" | "birthdate";
  required?: boolean;
  options?: Array<string | { value: string; label: string }>;
  computeFrom?: string[];
};

type Props = {
  entity: string;
  id: string;
  fields: RecordField[];
  ageAsOf?: string;
  canDelete?: boolean;
  canEdit?: boolean;
};

export default function RecordActions({ entity, id, fields, ageAsOf = "", canDelete = true, canEdit = true }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [computedValues, setComputedValues] = useState<Record<string, string>>({});
  const [subscriptionName, setSubscriptionName] = useState("");
  const deleteWarnings: Record<string, string> = {
    members: "Deleting a member also deletes their subscriptions and linked subscription payment entries.",
    families: "Deleting a family leaves its members in the directory without a family assignment.",
    fellowships: "Deleting a fellowship removes its member assignments.",
    subscriptions: "Deleting a subscription also deletes its linked cashbook payment entry.",
    users: "Deleting this user removes their ability to sign in."
  };

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(fields.filter((field) => field.type !== "computed" && (field.type !== "readonly" || field.name === "name")).map((field) => {
      if (field.type === "multiselect") return [field.name, form.getAll(field.name).map(String)];
      if (typeof field.value === "boolean") return [field.name, form.get(field.name) === "on"];
      return [field.name, form.get(field.name) ?? ""];
    }));

    try {
      const response = await fetch(`/api/records/${entity}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || "Unable to save changes.");
        return;
      }
      setMessage("Changes saved.");
      dialogRef.current?.close();
      router.refresh();
    } catch {
      setMessage("Unable to reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const warning = deleteWarnings[entity] || "This action cannot be undone.";
    if (!window.confirm(`Delete this record? ${warning}`)) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/records/${entity}/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || "Unable to delete this record.");
        return;
      }
      dialogRef.current?.close();
      router.refresh();
    } catch {
      setMessage("Unable to reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit) return <span className="muted">Managed by subscription</span>;

  return <>
    <button className="btn secondary" type="button" onClick={() => {
      setMessage("");
      setComputedValues({});
      setSubscriptionName(String(fields.find((field) => field.name === "name")?.value || ""));
      dialogRef.current?.showModal();
    }}>Edit</button>
    <dialog className="record-dialog" ref={dialogRef} aria-labelledby={`${id}-dialog-title`}>
      <div className="record-dialog-header">
        <h2 id={`${id}-dialog-title`}>Edit record</h2>
        <button className="btn secondary" type="button" aria-label="Close edit dialog" onClick={() => dialogRef.current?.close()}>Close</button>
      </div>
      <form className="record-editor" onSubmit={save} onChange={(event) => {
        const form = new FormData(event.currentTarget);
        if (entity === "subscriptions") {
          const memberField = fields.find((field) => field.name === "memberId");
          const memberOption = memberField?.options?.find((option) =>
            (typeof option === "string" ? option : option.value) === String(form.get("memberId") || "")
          );
          const memberName = memberOption
            ? typeof memberOption === "string" ? memberOption : memberOption.label
            : "";
          setSubscriptionName(createSubscriptionName(memberName, String(form.get("financialYear") || ""), String(form.get("period") || "")));
        }
        const updates = Object.fromEntries(fields.filter((field) => field.type === "computed" && field.computeFrom).map((field) => {
          const total = field.computeFrom!.reduce((sum, name) => {
            const value = Number(form.get(name) || 0);
            return sum + (Number.isFinite(value) ? value : 0);
          }, 0);
          return [field.name, new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(total)];
        }));
        setComputedValues(updates);
      }}>
        {fields.map((field) => {
          if (field.name === "state") return null;
          if (field.name === "district") {
            return <LocationFields
              key={field.name}
              idPrefix={id}
              districtValue={String(field.value)}
            />;
          }
          if (field.type === "birthdate") {
            return <AgeDateField key={field.name} id={`${id}-${field.name}`} name={field.name} value={String(field.value)} asOf={ageAsOf} />;
          }
          if (entity === "subscriptions" && field.name === "name") {
            return <div className="field" key={field.name}>
              <label htmlFor={`${id}-${field.name}`}>{field.label}</label>
              <input id={`${id}-${field.name}`} name={field.name} value={subscriptionName} readOnly required />
            </div>;
          }
          return <div className="field" key={field.name}>
          <label htmlFor={`${id}-${field.name}`}>{field.label}</label>
          {field.type === "computed" ? <output className="computed-value">{computedValues[field.name] || new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(field.value))}</output> :
            field.type === "image" ? <ImageUpload name={field.name} label={field.label} defaultValue={String(field.value) || null} /> :
            field.type === "textarea" ? <textarea id={`${id}-${field.name}`} name={field.name} defaultValue={String(field.value)} required={field.required} /> :
            field.type === "select" || field.type === "multiselect" ? <select id={`${id}-${field.name}`} name={field.name} defaultValue={field.value as string | string[]} multiple={field.type === "multiselect"} required={field.required} size={field.type === "multiselect" ? 4 : undefined}>
              {field.type === "select" && <option value="">Select</option>}
              {field.options?.map((option) => {
                const value = typeof option === "string" ? option : option.value;
                const label = typeof option === "string" ? option : option.label;
                return <option value={value} key={value}>{label}</option>;
              })}
            </select> :
              typeof field.value === "boolean" ? <input id={`${id}-${field.name}`} name={field.name} type="checkbox" defaultChecked={field.value} /> :
                <input id={`${id}-${field.name}`} name={field.name} type={field.type === "readonly" ? "text" : field.type || "text"} defaultValue={field.value} readOnly={field.type === "readonly"} required={field.required} min={field.type === "number" ? 0 : undefined} />}
          </div>;
        })}
        {message && <p className="notice" role="status">{message}</p>}
        <div className="record-dialog-actions">
          {canDelete && <button className="btn-danger" type="button" onClick={remove} disabled={saving}>{saving ? "Please wait…" : "Delete record"}</button>}
          <div className="actions">
            <button className="btn secondary" type="button" onClick={() => dialogRef.current?.close()} disabled={saving}>Cancel</button>
            <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
          </div>
        </div>
      </form>
    </dialog>
  </>;
}
