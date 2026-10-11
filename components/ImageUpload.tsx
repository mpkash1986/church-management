"use client";

import { useState, type ChangeEvent } from "react";

export default function ImageUpload({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string | null }) {
  const [path, setPath] = useState(defaultValue || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Image upload failed.");
        return;
      }
      setPath(result.path);
    } catch {
      setError("Unable to reach the server to upload this image.");
    } finally {
      setBusy(false);
      input.value = "";
    }
  }

  return <div className="field">
    <label htmlFor={`${name}-upload`}>{label}</label>
    <input id={`${name}-upload`} type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={busy} />
    <input type="hidden" name={name} value={path} />
    {busy && <span className="muted" role="status">Uploading image…</span>}
    {error && <span className="field-error" role="alert">{error}</span>}
    {path && <div className="image-preview"><img src={path} alt={`${label} preview`} /><button type="button" className="btn secondary" onClick={() => setPath("")}>Remove image</button></div>}
  </div>;
}
