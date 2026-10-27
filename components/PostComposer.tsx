"use client";

import { useRef, useState } from "react";
import { Avatar } from "./Avatar";

type CreatePost = (formData: FormData) => void | Promise<void>;

export function PostComposer({
  user,
  createPost,
}: {
  user: { name: string; headline?: string | null; avatar_key?: string | null };
  createPost: CreatePost;
}) {
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    const body = String(formData.get("body") ?? "").trim();
    if (!body && !file) return;
    setBusy(true);
    try {
      if (file) {
        const upload = new FormData();
        upload.append("file", file);
        upload.append("kind", "post");
        const res = await fetch("/api/upload", { method: "POST", body: upload });
        if (res.ok) {
          const { key } = (await res.json()) as { key: string };
          formData.set("image_key", key);
        }
      }
      await createPost(formData);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      formRef.current?.reset();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="socimo-post-section">
      <form ref={formRef} action={handleSubmit} className="socimo-post-card" data-testid="composer-form">
        <div className="socimo-post-header">
          <Avatar name={user.name} srcKey={user.avatar_key} size={40} />
          <textarea
            className="socimo-composer-textarea"
            name="body"
            rows={3}
            maxLength={5000}
            placeholder="Share an update with your network…"
            data-testid="composer-input"
          />
        </div>

        {file && (
          <div className="socimo-post-file-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={URL.createObjectURL(file)} alt="Selected upload preview" className="socimo-post-image" />
            <button
              type="button"
              className="socimo-post-remove-btn"
              onClick={() => {
                setFile(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              Remove
            </button>
          </div>
        )}

        <div className="socimo-post-actions">
          <label className="socimo-post-file-label">
            + Photo
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              data-testid="composer-file"
            />
          </label>
          <button
            className="socimo-post-btn"
            type="submit"
            disabled={busy}
            data-testid="composer-submit"
          >
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
      </form>
    </section>
  );
}
