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

  // Reserve width for the widest format the ticker will reach during
  // the animation (HIGH value, fully formatted, comma included). This
  // stops the layout from reflowing on every frame as digits — and the
  // comma — appear, which produced visible jitter on screens narrower
  // than the natural width of the largest value.
  const widthReserve = "$" + Math.round(HIGH).toLocaleString("en-US");

  return (
    <span
      ref={ref}
      style={{
        fontFamily: "var(--font-serif)",
        // Scales fluidly: ~52px on a 360px phone, 120px on desktop.
        fontSize: "clamp(2.75rem, 11vw, 7.5rem)",
        fontWeight: 400,
        lineHeight: 0.95,
        letterSpacing: "-0.03em",
        fontVariantNumeric: "tabular-nums",
        color: "var(--fg)",
        display: "inline-block",
        minWidth: `${widthReserve.length}ch`,
        whiteSpace: "nowrap",
      }}
    >
      {fmt}
    </span>
  );
}

