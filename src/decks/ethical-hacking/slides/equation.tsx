import { Bug, Gauge, Swords, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Icon, Illustration, Shape, Step, Text, Visual } from "@/slides/primitives";
import riskWarning from "../assets/risk-warning.svg";
import { DeckSlide, SheetFooter } from "../theme";
import { type } from "../tokens";

const TERMS: { tag: string; name: string; description: string; icon: LucideIcon }[] = [
  { tag: "Actor", name: "Threat", description: "The likelihood of an actor attacking.", icon: Swords },
  { tag: "CWE / CVE", name: "Vulnerability", description: "The actual flaw.", icon: Bug },
  { tag: "CIA", name: "Impact", description: "The damage to Confidentiality, Integrity, or Availability.", icon: Zap },
  { tag: "CVSS", name: "Risk", description: "The prioritized score (0.0 to 10.0), calculated using CVSS.", icon: Gauge },
];

const OPERATORS = ["×", "×", "="] as const;

const IDENTIFIERS = [
  { code: "CWE", meaning: "Weakness category", example: "e.g., CWE-89 SQLi" },
  { code: "CVE", meaning: "Specific known flaw", example: "e.g., CVE-2014-0160 Heartbleed" },
] as const;

/** 3×3 qualitative risk matrix. Rows: likelihood high → low; columns: impact low → high. */
const LEVEL_FILL = ["#17405E", "#2B5F86", "#D19A3A", "#F08A3E", "#FF6B5E"] as const;
const MATRIX_LABELS: Record<string, { text: string; dark: boolean }> = {
  "2-0": { text: "Low", dark: false },
  "1-1": { text: "Medium", dark: true },
  "0-2": { text: "High", dark: true },
};
const CELL = { w: 132, h: 52, gap: 6 } as const;

/** A finding moving from "Medium" to "High" once environmental context is applied. */
function ContextShift() {
  const from = { x: CELL.w * 2 + CELL.gap - 8, y: CELL.h + CELL.gap + 8 };
  const to = { x: (CELL.w + CELL.gap) * 2 + 18, y: CELL.h - 12 };
  return (
    <svg width="100%" height="100%" fill="none" aria-hidden="true">
      <defs>
        <marker id="context-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#0A1A2B" />
        </marker>
      </defs>
      <path d={`M ${from.x} ${from.y} L ${to.x} ${to.y}`} stroke="#0A1A2B" strokeWidth="4" markerEnd="url(#context-arrow)" />
      <circle cx={from.x} cy={from.y} r="7" fill="#0A1A2B" />
    </svg>
  );
}

export function EquationSlide() {
  return (
    <DeckSlide>
      <div className="absolute inset-x-[96px] top-[96px] flex flex-col items-start">
        <Text className={type.eyebrow} step={0}>
          The vulnerability equation
        </Text>
        <Text as="h2" className={cn(type.title, "mt-[20px] max-w-[1180px]")} step={1}>
          Base CVSS is not enough: context dictates true business risk
        </Text>
      </div>

      <Illustration src={riskWarning} className="absolute top-[64px] right-[96px] h-[272px] w-[264px]" step={2} />

      {/* Equation */}
      <div className="absolute inset-x-[96px] top-[360px] flex items-stretch">
        {TERMS.map(({ tag, name, description, icon }, index) => {
          const isRisk = index === TERMS.length - 1;
          const accent = isRisk ? "text-(--eh-amber)" : "text-(--eh-cyan)";
          return (
            <div key={name} className="flex items-stretch">
              <Shape
                step={2 + index}
                className={cn(
                  "flex w-[372px] flex-col border-2 px-[28px] pt-[24px] pb-[28px]",
                  isRisk ? "border-(--eh-amber) bg-(--eh-surface)" : "border-(--eh-line) bg-(--eh-surface)",
                )}
              >
                <div className="flex items-start justify-between">
                  <Text className={cn(type.label, "pt-[4px]", accent)}>{tag}</Text>
                  <Icon icon={icon} size={44} className={accent} />
                </div>
                <Text as="h3" className={cn(type.term, "mt-[6px]", isRisk && "text-(--eh-amber)")}>
                  {name}
                </Text>
                <Text className={cn(type.body, "mt-[14px]")}>{description}</Text>
              </Shape>
              {index < OPERATORS.length && (
                <Text
                  aria-hidden="true"
                  className="flex w-[80px] items-center justify-center text-[64px] leading-none font-light text-(--eh-cyan)"
                  step={2 + index}
                >
                  {OPERATORS[index]}
                </Text>
              )}
            </div>
          );
        })}
      </div>

      {/* CWE vs CVE */}
      <section className="absolute top-[684px] left-[96px] flex w-[920px] flex-col">
        <Text as="h3" className={type.eyebrow} step={6}>
          Naming the flaw
        </Text>
        <div className="mt-[20px] flex flex-col gap-[16px]">
          {IDENTIFIERS.map(({ code, meaning, example }) => (
            <Step key={code} step={7} className="flex items-center gap-[24px]">
              <Shape className="flex h-[52px] w-[104px] shrink-0 items-center justify-center border-2 border-(--eh-cyan)">
                <Text className={cn(type.label, "text-(--eh-cyan)")}>{code}</Text>
              </Shape>
              <Text className="text-[32px] leading-[1.2] text-(--eh-text)">{meaning}</Text>
              <Text className="font-(family-name:--eh-mono) text-[26px] leading-[1.2] text-(--eh-muted)">{example}</Text>
            </Step>
          ))}
        </div>
      </section>

      {/* Risk matrix */}
      <section className="absolute top-[684px] right-[96px] flex w-[408px] flex-col" aria-label="Risk matrix">
        <div className="flex items-baseline justify-between">
          <Text className={cn(type.label, "text-(--eh-muted)")} step={8}>
            Likelihood ↑
          </Text>
          <Text className={cn(type.label, "text-(--eh-amber)")} step={9}>
            + Context
          </Text>
        </div>
        <Step
          step={8}
          className="relative mt-[10px] grid gap-[6px]"
          style={{
            gridTemplateColumns: `repeat(3, ${CELL.w}px)`,
            gridTemplateRows: `repeat(3, ${CELL.h}px)`,
          }}
        >
          {[0, 1, 2].flatMap((row) =>
            [0, 1, 2].map((col) => {
              const level = 2 - row + col;
              const label = MATRIX_LABELS[`${row}-${col}`];
              return (
                <Shape
                  key={`${row}-${col}`}
                  className="flex items-center justify-center"
                  style={{ backgroundColor: LEVEL_FILL[level] }}
                >
                  {label && (
                    <Text className={cn(type.label, label.dark ? "text-[#0A1A2B]" : "text-(--eh-text)")}>
                      {label.text}
                    </Text>
                  )}
                </Shape>
              );
            }),
          )}
          <Visual className="absolute inset-0" step={9}>
            <ContextShift />
          </Visual>
        </Step>
        <Text className={cn(type.label, "mt-[10px] self-end text-(--eh-muted)")} step={8}>
          Impact →
        </Text>
      </section>

      <SheetFooter number={3} />
    </DeckSlide>
  );
}
