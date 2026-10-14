import { useEffect, useState } from "react";

const SPARKS = [
  { sx: "-26px", sy: "-30px" }, { sx: "26px", sy: "-30px" },
  { sx: "-34px", sy: "0px" }, { sx: "34px", sy: "0px" },
  { sx: "-22px", sy: "26px" }, { sx: "22px", sy: "26px" },
  { sx: "0px", sy: "-36px" }, { sx: "0px", sy: "32px" },
];

/** Tiny CSS spark burst. Render inside a `relative` container; fires once per `burstKey` change. */
export function SparkBurst({ burstKey, color }: { burstKey: string | null; color?: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!burstKey) return;
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 650);
    return () => window.clearTimeout(t);
  }, [burstKey]);
  if (!visible || !burstKey) return null;
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden>
      {SPARKS.map((s, i) => (
        <span
          key={i}
          className="spark-dot"
          style={{ "--sx": s.sx, "--sy": s.sy, "--spark": color } as React.CSSProperties}
        />
      ))}
    </span>
  );
}
