import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { SectionAnimation } from "@/lib/gx/sections/types";

type Props = {
  animation?: SectionAnimation;
  duration?: number;
  delay?: number;
  style?: CSSProperties;
  className?: string;
  children: ReactNode;
  as?: keyof React.JSX.IntrinsicElements;
  dataAttrs?: Record<string, string>;
};

export function AnimatedSection({
  animation = "none",
  duration = 600,
  delay = 0,
  style,
  className,
  children,
  as: Tag = "section",
  dataAttrs,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(animation === "none");

  useEffect(() => {
    if (animation === "none") { setVisible(true); return; }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) { setVisible(true); io.disconnect(); break; }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [animation]);

  const Comp = Tag as unknown as "section";
  return (
    <Comp
      ref={ref as never}
      className={`gx-anim gx-anim-${animation} ${visible ? "is-in" : ""} ${className || ""}`}
      style={{
        ...style,
        ["--gx-anim-dur" as never]: `${duration}ms`,
        ["--gx-anim-delay" as never]: `${delay}ms`,
      }}
      {...dataAttrs}
    >
      {children}
    </Comp>
  );
}
