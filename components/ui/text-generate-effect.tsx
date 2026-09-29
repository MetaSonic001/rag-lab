"use client";
// Aceternity UI "Text Generate Effect", adapted for RAG LAB: themed colours, adjustable pace,
// [n] citation markers rendered as chips, and light inline Markdown (**bold**, `code`).
import { useEffect } from "react";
import { motion, stagger, useAnimate } from "motion/react";
import { cn } from "@/lib/utils";

export const TextGenerateEffect = ({
  words,
  className,
  filter = true,
  duration = 0.4,
  delay = 0.035,
}: {
  words: string;
  className?: string;
  filter?: boolean;
  duration?: number;
  delay?: number;
}) => {
  const [scope, animate] = useAnimate();
  const tokens = words.split(/(\s+|\[\d+\]|\*\*|`)/).filter((w) => w.length);
  useEffect(() => {
    animate(
      "span.w",
      { opacity: 1, filter: filter ? "blur(0px)" : "none" },
      { duration, delay: stagger(delay) }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words]);

  let bold = false;
  let code = false;
  const nodes: React.ReactNode[] = [];
  tokens.forEach((tok, idx) => {
    if (tok === "**") return void (bold = !bold);
    if (tok === "`") return void (code = !code);
    const cite = tok.match(/^\[(\d+)\]$/);
    nodes.push(
      <motion.span
        key={tok + idx}
        className={cn(
          "w opacity-0",
          bold && "font-semibold",
          code && "rounded bg-foreground/10 px-1 font-mono text-[0.86em]",
          cite && "mx-0.5 rounded bg-primary/15 px-1 py-px align-super font-mono text-[10px] font-semibold text-primary"
        )}
        style={{ filter: filter ? "blur(8px)" : "none" }}
      >
        {cite ? cite[1] : tok}
      </motion.span>
    );
  });

  return (
    <div className={cn("leading-relaxed text-foreground", className)}>
      <motion.div ref={scope} className="whitespace-pre-line">
        {nodes}
      </motion.div>
    </div>
  );
};
