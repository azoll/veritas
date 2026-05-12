"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  /** True iff any visible document is still in a non-terminal state. */
  pending: boolean;
};

/**
 * No-UI polling shim for the dashboard list. While there's at least
 * one filing still extracting/verifying, refresh the server-rendered
 * page every 2s so verdict pills + counts update in place. Stops the
 * moment everything reaches a terminal state.
 *
 * We don't fetch any custom endpoint — router.refresh() re-runs the
 * server component, which already queries the latest doc rows.
 */
export function DashboardLivePoll({ pending }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(id);
  }, [pending, router]);

  return null;
}
