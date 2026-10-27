"use client";

import { useState } from "react";
import { setAvatar } from "@/lib/actions/profile";

/** Uploads an avatar to R2 and applies it to the signed-in user's profile. */
export function AvatarUpload() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(formData: FormData) {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose an image first.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const upload = new FormData();
      upload.append("file", file);
      upload.append("kind", "avatar");
      const res = await fetch("/api/upload", { method: "POST", body: upload });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Upload failed.");
        return;
      }
      const { key } = (await res.json()) as { key: string };
      const apply = new FormData();
      apply.append("key", key);
      await setAvatar(apply);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={handle} className="flex flex-col gap-2 items-start">
      <input
        type="file"
        name="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-[color:var(--brand-tint)] file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-[color:var(--brand-dark)]"
        data-testid="avatar-file"
      />
      {error && <span className="small text-red-600">{error}</span>}
      <button className="btn btn-outline btn-sm" type="submit" disabled={busy} data-testid="avatar-save">
        {busy ? "Uploading…" : "Upload photo"}
      </button>
    </form>
  );
}
