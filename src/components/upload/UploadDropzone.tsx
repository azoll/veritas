"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";

export function UploadDropzone() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setBusy(true);
      setError(null);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("title", file.name.replace(/\.[^.]+$/, ""));
        const r = await fetch("/api/documents", { method: "POST", body: fd });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error ?? `Upload failed (${r.status})`);
        }
        const { id } = (await r.json()) as { id: string };
        router.push(`/documents/${id}`);
      } catch (e) {
        setError((e as Error).message);
        setBusy(false);
      }
    },
    [router],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        ".docx",
      ],
      "text/plain": [".txt"],
    },
  });

  return (
    <div>
      <div
        {...getRootProps()}
        style={{
          cursor: "pointer",
          padding: "64px 32px",
          border: `1px dashed ${
            isDragActive ? "var(--fg)" : "var(--hair-strong)"
          }`,
          background: isDragActive ? "var(--obsidian-2)" : "var(--bg-raised)",
          textAlign: "center",
          opacity: busy ? 0.6 : 1,
          pointerEvents: busy ? "none" : "auto",
          transition:
            "border-color var(--dur-base) var(--ease-procedural), background var(--dur-base) var(--ease-procedural)",
        }}
      >
        <input {...getInputProps()} />
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 32,
            fontWeight: 400,
            letterSpacing: "-0.01em",
            color: "var(--fg)",
          }}
        >
          {busy
            ? "Auditing filing…"
            : "Drop a brief, motion, or memo to audit"}
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 14,
            color: "var(--fg-2)",
          }}
        >
          PDF or DOCX · stays inside your firm · verified before it leaves
        </div>
        <div
          style={{
            display: "inline-block",
            marginTop: 32,
            padding: "10px 20px",
            border: "1px solid var(--hair-strong)",
            fontSize: 13,
            color: "var(--fg)",
            letterSpacing: "0.02em",
          }}
        >
          Browse files
        </div>
      </div>
      {error && (
        <div
          style={{
            marginTop: 16,
            padding: "12px 16px",
            border: "1px solid var(--critical)",
            background: "var(--critical-bg)",
            color: "var(--critical)",
            fontSize: 13,
            fontFamily: "var(--font-mono)",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
