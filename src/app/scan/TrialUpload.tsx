"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";

export function TrialUpload() {
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
        const r = await fetch("/api/trial/scan", {
          method: "POST",
          body: fd,
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error ?? `Upload failed (${r.status})`);
        }
        router.refresh();
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
          padding: "96px 32px",
          border: `1px dashed ${isDragActive ? "var(--fg)" : "var(--hair-strong)"}`,
          background: isDragActive ? "var(--obsidian-2)" : "var(--bg-raised)",
          textAlign: "center",
          opacity: busy ? 0.6 : 1,
          pointerEvents: busy ? "none" : "auto",
        }}
      >
        <input {...getInputProps()} />
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 40,
            fontWeight: 400,
            letterSpacing: "-0.01em",
            color: "var(--fg)",
          }}
        >
          {busy ? "Auditing filing…" : "Upload a filing"}
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 14,
            color: "var(--fg-2)",
          }}
        >
          PDF or DOCX · max 10 MB · one scan per trial
        </div>
        <div
          style={{
            display: "inline-block",
            marginTop: 32,
            padding: "12px 24px",
            border: "1px solid var(--hair-strong)",
            fontSize: 14,
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
            fontFamily: "var(--font-mono)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
