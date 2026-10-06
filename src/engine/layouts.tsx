import { Quote as QuoteMark } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Shape, Step, Text, Visual } from "@/slides/primitives";
import { Card, Footer, Frame, Glyph, Heading, IconTile, ImagePanel, padNumber, Rings, role, ThemedSlide } from "./blocks";
import { useSlideContext } from "./context";
import type { LayoutId, SlideSpec } from "./spec";

type LayoutProps = { slide: SlideSpec };

const LABELS = {
  id: { next: "Langkah berikutnya", part: "Bagian" },
  en: { next: "Next steps", part: "Part" },
};
const labelsFor = (lang: string) => (lang.startsWith("en") ? LABELS.en : LABELS.id);

const grid = (count: number, gap: number) => ({
  gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
  columnGap: gap,
});

/** Right-hand picture used by `split` and the image variant of `cards`. */
const SIDE_PANEL = { left: 1120, top: 96, width: 704, height: 816 } as const;

function Cover({ slide }: LayoutProps) {
  const { deck } = useSlideContext();
  const size = slide.title.length > 64 ? 80 : slide.title.length > 44 ? 92 : 104;
  return (
    <ThemedSlide>
      <ImagePanel image={slide.image} className="absolute" style={{ left: 1024, top: 96, width: 800, height: 888 }} step={3} />
      <div className="absolute top-[96px] bottom-[96px] left-[96px] flex w-[860px] flex-col items-start">
        <div className="h-[30px]">
          {slide.eyebrow && (
            <Text className={role.eyebrow} step={0}>
              {slide.eyebrow}
            </Text>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-center">
          <Text as="h1" className="leading-[1.12] font-bold tracking-[-0.03em] text-balance" style={{ fontSize: size }} step={1}>
            {slide.title}
          </Text>
          {slide.subtitle && (
            <Text className={cn(role.lead, "mt-[36px] max-w-[780px]")} step={2}>
              {slide.subtitle}
            </Text>
          )}
        </div>
        <div className="h-[34px]">
          {deck.author && (
            <Step step={4} className="flex items-center gap-[20px]">
              <Shape className="h-[6px] w-[64px] rounded-full bg-(--accent)" />
              <Text className="text-[26px] leading-[1.25] text-(--muted)">{deck.author}</Text>
            </Step>
          )}
        </div>
      </div>
    </ThemedSlide>
  );
}

function Section({ slide }: LayoutProps) {
  const { deck, section } = useSlideContext();
  return (
    <ThemedSlide>
      <Rings style={{ left: 1090, top: 140, width: 780, height: 780 }} step={3} />
      <Text className={cn(role.eyebrow, "absolute top-[96px] left-[96px]")} step={0}>
        {slide.eyebrow ?? labelsFor(deck.lang).part}
      </Text>
      <Text
        className="absolute top-[170px] left-[96px] text-[280px] leading-[1.12] font-bold tracking-[-0.04em] text-(--accent)"
        step={1}
      >
        {padNumber(section)}
      </Text>
      <div className="absolute top-[540px] left-[96px] flex w-[1000px] flex-col items-start">
        <Text as="h2" className="text-[92px] leading-[1.12] font-bold tracking-[-0.03em] text-balance" step={2}>
          {slide.title}
        </Text>
        {slide.subtitle && (
          <Text className={cn(role.lead, "mt-[28px] max-w-[860px]")} step={3}>
            {slide.subtitle}
          </Text>
        )}
      </div>
      <Footer />
    </ThemedSlide>
  );
}

function CardsRow({ slide }: LayoutProps) {
  const items = slide.items ?? [];
  const big = items.length <= 3;
  return (
    <ThemedSlide>
      <Frame eyebrow={slide.eyebrow} title={slide.title}>
        <div className="grid w-full" style={grid(items.length, big ? 36 : 28)}>
          {items.map((item, index) => (
            <Card key={index} step={3 + index} className={cn("flex min-w-0 flex-col", big ? "min-h-[500px] p-[48px]" : "min-h-[500px] p-[36px]")}>
              <IconTile name={item.icon} src={item.iconSrc} size={big ? 112 : 96} />
              <div className="mt-auto flex flex-col pt-[32px]">
                <Text as="h3" className={cn(role.h3, big && "text-[42px]", "break-words")}>
                  {item.title}
                </Text>
                {item.text && <Text className={cn(role.body, big && "text-[32px]", "mt-[14px] break-words text-pretty")}>{item.text}</Text>}
              </div>
            </Card>
          ))}
        </div>
      </Frame>
      <Footer />
    </ThemedSlide>
  );
}

function CardsWithImage({ slide }: LayoutProps) {
  const items = slide.items ?? [];
  return (
    <ThemedSlide>
      <ImagePanel image={slide.image} className="absolute" style={SIDE_PANEL} step={2} />
      <div className="absolute top-[96px] left-[96px] flex h-[816px] w-[976px] flex-col items-start justify-center">
        <Heading eyebrow={slide.eyebrow} title={slide.title} size={60} />
        <div className="mt-[44px] flex w-full flex-col gap-[20px]">
          {items.map((item, index) => (
            <Card key={index} step={3 + index} className="flex items-center gap-[28px] px-[32px] py-[22px]">
              <IconTile name={item.icon} src={item.iconSrc} size={88} />
              <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
                <Text as="h3" className={cn(role.h3, "break-words")}>
                  {item.title}
                </Text>
                {item.text && <Text className={cn(role.body, "break-words")}>{item.text}</Text>}
              </div>
            </Card>
          ))}
        </div>
      </div>
      <Footer />
    </ThemedSlide>
  );
}

const Cards = ({ slide }: LayoutProps) => (slide.image ? <CardsWithImage slide={slide} /> : <CardsRow slide={slide} />);

function Steps({ slide }: LayoutProps) {
  const items = slide.items ?? [];
  const count = items.length;
  const gap = count >= 5 ? 28 : count === 4 ? 32 : 40;
  const h3 = count >= 5 ? "text-[30px]" : count === 4 ? "text-[34px]" : "text-[40px]";
  const body = count >= 5 ? "text-[26px]" : count === 4 ? "text-[28px]" : "text-[32px]";
  return (
    <ThemedSlide>
      <Frame eyebrow={slide.eyebrow} title={slide.title}>
        <div className="grid w-full" style={grid(count, gap)}>
          {items.map((item, index) => (
            <div key={index} className="flex min-w-0 flex-col">
              <Step step={3 + index} className="flex items-center">
                <Shape className="flex size-[72px] shrink-0 items-center justify-center rounded-full bg-(--accent)">
                  <Text className="text-[32px] leading-[1.12] font-bold text-(--on-accent)">{index + 1}</Text>
                </Shape>
                {index < count - 1 && (
                  <Shape className="ml-[16px] h-[4px] flex-1 rounded-full bg-(--tint-line)" style={{ marginRight: 16 - gap }} />
                )}
              </Step>
              <Card step={3 + index} className="mt-[28px] flex min-h-[380px] flex-1 flex-col p-[32px]">
                <Glyph name={item.icon} src={item.iconSrc} size={count >= 5 ? 56 : 64} className="text-(--accent)" />
                <div className="mt-auto flex flex-col pt-[28px]">
                  <Text as="h3" className={cn(role.h3, h3, "break-words")}>
                    {item.title}
                  </Text>
                  {item.text && <Text className={cn(role.body, body, "mt-[12px] break-words")}>{item.text}</Text>}
                </div>
              </Card>
            </div>
          ))}
        </div>
      </Frame>
      <Footer />
    </ThemedSlide>
  );
}

function Compare({ slide }: LayoutProps) {
  const sides = slide.columns ?? [];
  return (
    <ThemedSlide>
      <Frame eyebrow={slide.eyebrow} title={slide.title}>
        <div className="relative">
          <div className="grid w-full grid-cols-2 gap-x-[72px]">
            {sides.map((side, index) => {
              const second = index === 1;
              return (
                <Card key={index} step={3 + index} className="flex min-h-[470px] min-w-0 flex-col p-[44px]">
                  <div className="flex items-center gap-[24px]">
                    <IconTile
                      name={side.icon ?? (second ? "circle-check-big" : "circle-dashed")}
                      src={side.iconSrc}
                      size={84}
                      tone={second ? "accent2" : "accent"}
                    />
                    <Text
                      as="h3"
                      className={cn("text-[40px] leading-[1.15] font-bold tracking-[-0.01em]", second ? "text-(--accent2)" : "text-(--accent)")}
                    >
                      {side.heading}
                    </Text>
                  </div>
                  <ul className="mt-[40px] flex flex-col gap-[22px]">
                    {side.points.map((point, pointIndex) => (
                      <li key={pointIndex} className="flex items-start gap-[18px]">
                        <Shape className={cn("mt-[14px] size-[14px] shrink-0 rounded-full", second ? "bg-(--accent2)" : "bg-(--accent)")} />
                        <Text className="text-[32px] leading-[1.3] break-words">{point}</Text>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
          <Shape
            className="absolute top-[46px] left-[820px] flex size-[88px] items-center justify-center rounded-full border-2 border-(--line) bg-(--bg)"
            step={5}
          >
            <Text className="text-[28px] leading-[1.12] font-bold text-(--muted)">VS</Text>
          </Shape>
        </div>
      </Frame>
      <Footer />
    </ThemedSlide>
  );
}

function Stats({ slide }: LayoutProps) {
  const items = slide.items ?? [];
  const count = items.length;
  const base = count >= 4 ? 88 : 112;
  return (
    <ThemedSlide>
      <Frame eyebrow={slide.eyebrow} title={slide.title}>
        <div className="grid w-full" style={grid(count, count >= 4 ? 28 : 36)}>
          {items.map((item, index) => {
            const length = (item.value ?? "").length;
            const size = length <= 4 ? base : length <= 6 ? Math.round(base * 0.78) : Math.round(base * 0.6);
            return (
              <Card key={index} step={3 + index} className="flex min-h-[480px] min-w-0 flex-col p-[40px]">
                <IconTile name={item.icon ?? "trending-up"} src={item.iconSrc} size={80} />
                <div className="mt-auto flex flex-col pt-[32px]">
                  <Text className="leading-[1.12] font-bold tracking-[-0.03em] text-(--accent)" style={{ fontSize: size }}>
                    {item.value}
                  </Text>
                  <Text as="h3" className={cn(role.h3, "mt-[20px] break-words")}>
                    {item.title}
                  </Text>
                  {item.text && <Text className={cn(role.body, "mt-[12px] break-words")}>{item.text}</Text>}
                </div>
              </Card>
            );
          })}
        </div>
      </Frame>
      <Footer />
    </ThemedSlide>
  );
}

function Quote({ slide }: LayoutProps) {
  return (
    <ThemedSlide>
      <Rings style={{ left: 1440, top: -300, width: 800, height: 800 }} step={4} />
      <div className="absolute top-[96px] bottom-[162px] left-[96px] flex w-[1300px] flex-col items-start justify-center">
        <Visual className="inline-flex text-(--accent)" style={{ width: 120, height: 120 }} step={0} bleed={2}>
          <QuoteMark size={120} strokeWidth={1.4} fill="currentColor" aria-hidden="true" />
        </Visual>
        <Text as="blockquote" className="mt-[36px] text-[64px] leading-[1.2] font-bold tracking-[-0.015em] text-balance" step={1}>
          {slide.quote?.text ?? slide.title}
        </Text>
        {slide.quote?.by && (
          <Step step={2} className="mt-[52px] flex items-center gap-[24px]">
            <Shape className="h-[6px] w-[64px] rounded-full bg-(--accent)" />
            <Text className="text-[30px] leading-[1.25] text-(--muted)">{slide.quote.by}</Text>
          </Step>
        )}
      </div>
      <Footer />
    </ThemedSlide>
  );
}

function Split({ slide }: LayoutProps) {
  const items = slide.items ?? [];
  return (
    <ThemedSlide>
      <ImagePanel image={slide.image} className="absolute" style={SIDE_PANEL} step={2} />
      <div className="absolute top-[96px] left-[96px] flex h-[816px] w-[960px] flex-col items-start justify-center">
        <Heading eyebrow={slide.eyebrow} title={slide.title} size={64} />
        {slide.body && (
          <Text className={cn(role.lead, "mt-[32px] text-[32px]")} step={2}>
            {slide.body}
          </Text>
        )}
        {items.length > 0 && (
          <ul className="mt-[40px] flex flex-col gap-[22px]">
            {items.map((item, index) => (
              <li key={index} className="flex items-center gap-[22px]">
                <Glyph name={item.icon} src={item.iconSrc} size={44} className="text-(--accent)" step={3 + index} />
                <Text className="text-[30px] leading-[1.3] break-words" step={3 + index}>
                  {item.title || item.text}
                </Text>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Footer />
    </ThemedSlide>
  );
}

function Closing({ slide }: LayoutProps) {
  const { deck } = useSlideContext();
  const items = slide.items ?? [];
  const eyebrow = slide.eyebrow ?? labelsFor(deck.lang).next;
  const hasImage = Boolean(slide.image);

  const actions = items.length > 0 && (
    <ul className={cn("mt-[48px] flex gap-[16px]", hasImage ? "flex-col items-start" : "flex-row flex-wrap justify-center")}>
      {items.map((item, index) => (
        <Shape
          as="li"
          key={index}
          step={3 + index}
          className="flex items-center gap-[20px] rounded-[24px] border-2 border-(--line) bg-(--card) px-[28px] py-[20px]"
        >
          <Glyph name={item.icon ?? "arrow-right"} src={item.iconSrc} size={40} className="text-(--accent)" />
          <Text className="text-[30px] leading-[1.2] font-bold">{item.title}</Text>
        </Shape>
      ))}
    </ul>
  );

  if (!hasImage) {
    return (
      <ThemedSlide>
        <Rings style={{ left: 1400, top: -340, width: 860, height: 860 }} step={5} dot={false} />
        <Rings style={{ left: -420, top: 620, width: 860, height: 860 }} step={5} dot={false} />
        <div className="absolute inset-x-[96px] top-[96px] bottom-[96px] flex flex-col items-center justify-center text-center">
          <Text className={role.eyebrow} step={0}>
            {eyebrow}
          </Text>
          <Text as="h2" className="mt-[28px] max-w-[1400px] text-[92px] leading-[1.12] font-bold tracking-[-0.03em] text-balance" step={1}>
            {slide.title}
          </Text>
          {slide.subtitle && (
            <Text className={cn(role.lead, "mt-[28px] max-w-[1100px]")} step={2}>
              {slide.subtitle}
            </Text>
          )}
          {actions}
        </div>
      </ThemedSlide>
    );
  }

  return (
    <ThemedSlide>
      <ImagePanel image={slide.image} className="absolute" style={{ left: 96, top: 96, width: 800, height: 888 }} step={3} />
      <div className="absolute top-[96px] bottom-[96px] left-[984px] flex w-[840px] flex-col items-start justify-center">
        <Text className={role.eyebrow} step={0}>
          {eyebrow}
        </Text>
        <Text as="h2" className="mt-[28px] text-[84px] leading-[1.12] font-bold tracking-[-0.03em] text-balance" step={1}>
          {slide.title}
        </Text>
        {slide.subtitle && (
          <Text className={cn(role.lead, "mt-[28px] max-w-[780px]")} step={2}>
            {slide.subtitle}
          </Text>
        )}
        {actions}
      </div>
    </ThemedSlide>
  );
}

const LAYOUT_VIEWS: Record<LayoutId, (props: LayoutProps) => ReactNode> = {
  cover: Cover,
  section: Section,
  cards: Cards,
  steps: Steps,
  compare: Compare,
  stats: Stats,
  quote: Quote,
  split: Split,
  closing: Closing,
};

export function SlideView({ slide }: LayoutProps) {
  const View = LAYOUT_VIEWS[slide.layout];
  return <View slide={slide} />;
}
