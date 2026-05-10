"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

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
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed border-black/15 bg-paper px-8 py-16 transition",
          isDragActive && "border-gold bg-gold/5",
          busy && "pointer-events-none opacity-60",
        )}
      >
        <input {...getInputProps()} />
        <div className="font-display text-2xl text-ink">
          {busy ? "Uploading & verifying…" : "Drop a brief, motion, or memo"}
        </div>
        <div className="mt-3 text-sm text-muted">
          PDF or DOCX · stays inside your firm · verified before it leaves
        </div>
        <div className="mt-8 rounded-sm border hairline px-5 py-2 text-sm">
          Browse files
        </div>
      </div>
      {error && (
        <div className="mt-4 rounded-sm border border-risk/30 bg-risk/5 px-4 py-3 text-sm text-risk">
          {error}
        </div>
      )}
    </div>
  );
}
