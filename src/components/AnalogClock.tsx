/**
 * AnalogClock — smooth SVG analog clock using requestAnimationFrame.
 *
 * Design language matches the Touchline theme:
 *  • Face:          deep navy  (--deep)
 *  • Outer ring:    emerald    (--pitch)
 *  • Hour/min hands:bright white with emerald glow
 *  • Second hand:   live red   (--live)
 *  • Tick marks:    gold       (--gold) for hours, white/40 for minutes
 *  • Center jewel:  pitch emerald
 *
 * The second hand sweeps continuously (sub-second precision via rAF),
 * not tick-by-tick.
 *
 * Accessibility: role="img" with an aria-label that updates every second.
 */

import { useEffect, useRef, useState } from "react";

interface ClockHands {
  h: number;  // hours angle in degrees (0-360)
  m: number;  // minutes angle
  s: number;  // seconds angle (continuous, includes ms fraction)
}

function getHandAngles(): ClockHands {
  const now = new Date();
  const ms  = now.getMilliseconds();
  const sec = now.getSeconds() + ms / 1000;
  const min = now.getMinutes() + sec / 60;
  const hr  = (now.getHours() % 12) + min / 60;
  return {
    h: hr  * 30,   // 360 / 12
    m: min * 6,    // 360 / 60
    s: sec * 6,    // 360 / 60
  };
}

export function AnalogClock({ size = 160 }: { size?: number }) {
  const [hands, setHands] = useState<ClockHands>(getHandAngles);
  const [label, setLabel] = useState("");
  const rafRef = useRef<number>(0);

  useEffect(() => {
    function tick() {
      const now = new Date();
      setHands(getHandAngles());
      setLabel(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── SVG coordinate system: centre = 0,0 ───────────────────────────────
  const R   = 90;   // outer dial radius
  const cx  = 0;
  const cy  = 0;

  /** Rotate a point (0, -len) by `deg` degrees */
  const hand = (deg: number, len: number, width: number, color: string, linecap: "round" | "butt" = "round", tail = 0) => (
    <g transform={`rotate(${deg})`}>
      <line
        x1={cx}
        y1={tail}
        x2={cx}
        y2={-len}
        stroke={color}
        strokeWidth={width}
        strokeLinecap={linecap}
      />
    </g>
  );

  // Hour tick marks
  const hourTicks = Array.from({ length: 12 }, (_, i) => {
    const angle = i * 30;
    const inner = R - 14;
    const outer = R - 2;
    return (
      <g key={i} transform={`rotate(${angle})`}>
        <line
          x1={0} y1={-inner}
          x2={0} y2={-outer}
          stroke="var(--color-gold, #d4a72c)"
          strokeWidth={3}
          strokeLinecap="round"
        />
      </g>
    );
  });

  // Minute tick marks (skip positions already covered by hour ticks)
  const minuteTicks = Array.from({ length: 60 }, (_, i) => {
    if (i % 5 === 0) return null; // hour ticks already there
    const angle = i * 6;
    const inner = R - 8;
    const outer = R - 2;
    return (
      <g key={i} transform={`rotate(${angle})`}>
        <line
          x1={0} y1={-inner}
          x2={0} y2={-outer}
          stroke="rgba(255,255,255,0.35)"
          strokeWidth={1}
          strokeLinecap="round"
        />
      </g>
    );
  });

  return (
    <svg
      role="img"
      aria-label={`Analog clock showing ${label}`}
      width={size}
      height={size}
      viewBox="-100 -100 200 200"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <defs>
        {/* Outer glow ring filter */}
        <filter id="clock-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="second-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Radial gradient for face */}
        <radialGradient id="face-grad" cx="35%" cy="30%" r="70%">
          <stop offset="0%"   stopColor="oklch(0.28 0.09 265)" />
          <stop offset="100%" stopColor="oklch(0.15 0.06 265)" />
        </radialGradient>
        {/* Pitch ring gradient */}
        <linearGradient id="ring-grad" x1="0" y1="-1" x2="0" y2="1">
          <stop offset="0%"   stopColor="oklch(0.72 0.18 155)" />
          <stop offset="100%" stopColor="oklch(0.50 0.14 155)" />
        </linearGradient>
      </defs>

      {/* Outer decorative ring — gold thin */}
      <circle
        cx={0} cy={0} r={R + 6}
        fill="none"
        stroke="var(--color-gold, #d4a72c)"
        strokeWidth={1}
        opacity={0.35}
      />

      {/* Pitch emerald thick ring */}
      <circle
        cx={0} cy={0} r={R + 2}
        fill="none"
        stroke="url(#ring-grad)"
        strokeWidth={4}
        filter="url(#clock-glow)"
      />

      {/* Clock face */}
      <circle cx={0} cy={0} r={R} fill="url(#face-grad)" />

      {/* Inner subtle ring */}
      <circle
        cx={0} cy={0} r={R - 1}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={1}
      />

      {/* Tick marks */}
      {minuteTicks}
      {hourTicks}

      {/* Hour hand */}
      {hand(hands.h, 54, 5, "rgba(255,255,255,0.95)", "round")}

      {/* Minute hand */}
      {hand(hands.m, 72, 3.5, "rgba(255,255,255,0.90)", "round")}

      {/* Second hand — live red with glow */}
      <g filter="url(#second-glow)">
        <g transform={`rotate(${hands.s})`}>
          {/* Counterbalance tail */}
          <line
            x1={0} y1={18}
            x2={0} y2={0}
            stroke="var(--color-live, #e05a2b)"
            strokeWidth={2}
            strokeLinecap="round"
          />
          {/* Main shaft */}
          <line
            x1={0} y1={0}
            x2={0} y2={-78}
            stroke="var(--color-live, #e05a2b)"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          {/* Tip dot */}
          <circle cx={0} cy={-74} r={2.5} fill="var(--color-live, #e05a2b)" />
        </g>
      </g>

      {/* Centre jewel */}
      <circle cx={0} cy={0} r={5} fill="var(--color-pitch, #3d9e6d)" />
      <circle cx={0} cy={0} r={2} fill="rgba(255,255,255,0.9)" />
    </svg>
  );
}
