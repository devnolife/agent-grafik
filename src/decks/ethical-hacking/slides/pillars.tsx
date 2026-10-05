import { Crosshair, EyeOff, FileCheck, FileLock, Server, Signature, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Icon, Illustration, Shape, Step, Text } from "@/slides/primitives";
import shieldServer from "../assets/shield-server.svg";
import { DeckSlide, SheetFooter } from "../theme";
import { type } from "../tokens";

const PILLARS: { name: string; description: string; icon: LucideIcon }[] = [
  { name: "Confidentiality", description: "Protecting data from unauthorized eyes.", icon: EyeOff },
  { name: "Integrity", description: "Ensuring data remains accurate and unaltered.", icon: FileCheck },
  { name: "Availability", description: "Ensuring systems remain accessible to legitimate users.", icon: Server },
];

const GEARS: { label: string; name: string; description: string; icon: LucideIcon }[] = [
  { label: "Gear 1", name: "Scope of engagement", description: "Defining exactly what assets are in and out of bounds.", icon: Crosshair },
  { label: "Gear 2", name: "NDA / contract", description: "Protecting client secrecy.", icon: FileLock },
  { label: "Gear 3", name: "Written authorization", description: "The ultimate legal shield against cybercrime laws.", icon: Signature },
];

export function PillarsSlide() {
  return (
    <DeckSlide>
      <div className="absolute inset-x-[96px] top-[96px] flex flex-col items-start">
        <Text className={type.eyebrow} step={0}>
          Pillars &amp; legal shield
        </Text>
        <Text as="h2" className={cn(type.title, "mt-[20px] max-w-[1180px]")} step={1}>
          Every test targets the CIA triad, so the legal shield comes first
        </Text>
      </div>

      <Illustration src={shieldServer} className="absolute top-[72px] right-[96px] h-[272px] w-[416px]" step={2} />

      <div className="absolute inset-x-[96px] top-[376px] grid grid-cols-[1000px_680px] justify-between">
        {/* The target */}
        <section className="flex flex-col">
          <Text as="h3" className={type.eyebrow} step={3}>
            The target
          </Text>

          <Step step={4} className="mt-[24px] flex flex-col">
            <Shape className="flex h-[56px] items-center justify-center border-2 border-(--eh-line) bg-(--eh-surface)">
              <Text className={cn(type.label, "text-(--eh-cyan)")}>System</Text>
            </Shape>
            <div className="mt-[12px] grid grid-cols-3 gap-[24px]">
              {PILLARS.map(({ name, description, icon }) => (
                <Shape
                  key={name}
                  className="flex min-h-[276px] flex-col gap-[12px] border-2 border-(--eh-line) bg-(--eh-surface) px-[24px] py-[24px]"
                >
                  <Icon icon={icon} size={44} className="mb-[6px] text-(--eh-cyan)" />
                  <Text as="h4" className={type.name}>
                    {name}
                  </Text>
                  <Text className={cn(type.body, "text-pretty")}>{description}</Text>
                </Shape>
              ))}
            </div>
            <Shape className="mt-[12px] h-[16px] bg-(--eh-line)" />
          </Step>

          <Text className="mt-[28px] text-[32px] leading-[1.2] font-semibold text-(--eh-amber)" step={5}>
            If one pillar cracks, the system collapses.
          </Text>
        </section>

        {/* The protection */}
        <section className="flex flex-col">
          <Text as="h3" className={type.eyebrow} step={6}>
            The protection
          </Text>

          <ol className="mt-[24px] flex flex-col gap-[16px]">
            {GEARS.map(({ label, name, description, icon }, index) => {
              const isShield = index === GEARS.length - 1;
              const accent = isShield ? "text-(--eh-amber)" : "text-(--eh-cyan)";
              return (
                <Shape
                  as="li"
                  key={label}
                  step={7 + index}
                  className={cn(
                    "grid grid-cols-[96px_1fr] gap-x-[20px] border-2 bg-(--eh-surface) px-[28px] py-[24px]",
                    isShield ? "border-(--eh-amber)" : "border-(--eh-line)",
                  )}
                >
                  <div className="flex flex-col items-start gap-[10px] pt-[2px]">
                    <Icon icon={icon} size={44} className={accent} />
                    <Text className={cn(type.label, accent)}>{label}</Text>
                  </div>
                  <div className="flex flex-col gap-[8px]">
                    <Text as="h4" className={cn(type.name, isShield && "text-(--eh-amber)")}>
                      {name}
                    </Text>
                    <Text className={type.body}>{description}</Text>
                  </div>
                </Shape>
              );
            })}
          </ol>
        </section>
      </div>

      <SheetFooter number={2} />
    </DeckSlide>
  );
}
