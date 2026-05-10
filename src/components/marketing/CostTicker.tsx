"use client";

import { useEffect, useRef, useState } from "react";

import { TICKER_RANGE as RANGE } from "./tickerRange";

const LOW = RANGE.LOW;
const HIGH = RANGE.HIGH;
const DURATION = 60000;

export function CostTicker() {
  const [value, setValue] = useState(LOW);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let raf: number | undefined;
    let start: number | undefined;

    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / DURATION);
      const eased =
        p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      setValue(LOW + (HIGH - LOW) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            raf = requestAnimationFrame(tick);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(node);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  const fmt = "$" + Math.round(value).toLocaleString("en-US");

  return (
    <span
      ref={ref}
      style={{
        fontFamily: "var(--font-serif)",
        fontSize: 120,
        fontWeight: 400,
        lineHeight: 0.95,
        letterSpacing: "-0.03em",
        fontVariantNumeric: "tabular-nums",
        color: "var(--fg)",
        display: "block",
      }}
    >
      {fmt}
    </span>
  );
}

