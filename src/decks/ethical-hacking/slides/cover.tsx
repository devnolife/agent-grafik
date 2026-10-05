import { Bug, ListTree, Radar, ScanSearch, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Icon, Illustration, Shape, Text, Visual } from "@/slides/primitives";
import reconGlobe from "../assets/recon-globe.svg";
import { DeckSlide } from "../theme";
import { palette, type } from "../tokens";

const CENTER = 420; // centre of the 840×840 drawing
const RINGS = [
  { label: "01", radius: 392 },
  { label: "02", radius: 322 },
  { label: "03", radius: 252 },
  { label: "04", radius: 182 },
] as const;

const PHASES: { label: string; name: string; icon: LucideIcon }[] = [
  { label: "01", name: "Footprinting & reconnaissance", icon: ScanSearch },
  { label: "02", name: "Scanning the perimeter", icon: Radar },
  { label: "03", name: "Enumeration", icon: ListTree },
  { label: "04", name: "Vulnerability scanning", icon: Bug },
];

const NODES: Record<string, number[]> = {
  "01": [-150, -40, 15, 70, 125, 170, 215],
  "02": [-55, 30, 145, 230],
  "03": [-15, 100, 205],
};

function polar(radius: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(radians), y: CENTER + radius * Math.sin(radians) };
}

/** Concentric "anatomy" of an engagement: wide passive recon outside, precise analysis at the core. */
function AnatomyRings() {
  const outer = RINGS[0].radius;
  const sweepFrom = polar(outer, -38);
  const sweepTo = polar(outer, -8);

  return (
    <svg width="840" height="840" viewBox="0 0 840 840" fill="none" aria-hidden="true">
      <path
        d={`M ${CENTER} ${CENTER} L ${sweepFrom.x} ${sweepFrom.y} A ${outer} ${outer} 0 0 1 ${sweepTo.x} ${sweepTo.y} Z`}
        fill={palette.amber}
        fillOpacity="0.06"
      />
      <path d={`M ${CENTER} ${CENTER} L ${sweepTo.x} ${sweepTo.y}`} stroke={palette.amber} strokeOpacity="0.5" strokeWidth="2" />

      <path d="M 14 420 H 826 M 420 14 V 826" stroke={palette.line} strokeWidth="1.5" strokeDasharray="2 8" />

      <circle cx={CENTER} cy={CENTER} r={RINGS[0].radius} stroke={palette.cyan} strokeOpacity="0.75" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" />
      <circle cx={CENTER} cy={CENTER} r={RINGS[1].radius} stroke={palette.cyan} strokeOpacity="0.85" strokeWidth="2" strokeDasharray="14 10" />
      <circle cx={CENTER} cy={CENTER} r={RINGS[2].radius} stroke={palette.cyan} strokeWidth="2.5" />
      <circle cx={CENTER} cy={CENTER} r={RINGS[3].radius} stroke={palette.amber} strokeWidth="3" fill={palette.bg} />

      {RINGS.map(({ label, radius }) => (
        <path key={label} d={`M ${CENTER - 8} ${CENTER - radius} H ${CENTER + 8}`} stroke={palette.text} strokeWidth="2" />
      ))}

      {Object.entries(NODES).flatMap(([ring, angles]) => {
        const radius = RINGS.find((item) => item.label === ring)?.radius ?? 0;
        return angles.map((angle) => {
          const point = polar(radius, angle);
          return (
            <circle key={`${ring}-${angle}`} cx={point.x} cy={point.y} r="7" fill={palette.bg} stroke={palette.cyan} strokeWidth="2.5" />
          );
        });
      })}
    </svg>
  );
}

export function CoverSlide() {
  const drawingLeft = 1030;
  const drawingTop = 120;
  const globeSize = 300;

  return (
    <DeckSlide>
      <Visual className="absolute" style={{ left: drawingLeft, top: drawingTop, width: 840, height: 840 }} step={3}>
        <AnatomyRings />
      </Visual>

      <Illustration
        src={reconGlobe}
        className="absolute"
        style={{
          left: drawingLeft + CENTER - globeSize / 2,
          top: drawingTop + CENTER - globeSize / 2 + 6,
          width: globeSize,
          height: globeSize,
        }}
        step={4}
      />

      {RINGS.map(({ label, radius }) => (
        <Text
          key={label}
          className={cn(type.label, "absolute text-(--eh-text)")}
          style={{ left: drawingLeft + CENTER + 18, top: drawingTop + CENTER - radius - 34 }}
          step={5}
        >
          {label}
        </Text>
      ))}

      <div className="absolute inset-[96px] flex flex-col items-start">
        <Text className={type.eyebrow} step={0}>
          Ethical hacking · Methodology
        </Text>
        <Text
          as="h1"
          className="mt-[64px] max-w-[880px] text-[112px] leading-[1.0] font-semibold tracking-[-0.02em] text-balance"
          step={1}
        >
          The Anatomy of an Ethical Hack
        </Text>
        <Text className="mt-[36px] max-w-[760px] text-[40px] leading-[1.25] text-(--eh-muted)" step={2}>
          From Legal Frameworks to Precision Vulnerability Analysis
        </Text>

        <ol className="mt-auto flex flex-col gap-[14px]">
          {PHASES.map(({ label, name, icon }, index) => (
            <li key={label} className="flex items-center gap-[18px]">
              <Icon icon={icon} size={36} className="text-(--eh-cyan)" step={6 + index} />
              <Text as="span" className={cn(type.label, "text-(--eh-cyan)")} step={6 + index}>
                {label}
              </Text>
              <Text as="span" className="text-[30px] leading-[1.2] text-(--eh-text)" step={6 + index}>
                {name}
              </Text>
            </li>
          ))}
        </ol>
      </div>

      <Shape className="absolute right-[96px] bottom-[96px] border-2 border-(--eh-amber) px-[18px] py-[10px]" step={10}>
        <Text className={cn(type.label, "text-(--eh-amber)")}>Authorized testing only</Text>
      </Shape>
    </DeckSlide>
  );
}
