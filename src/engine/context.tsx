import { createContext, useContext } from "react";
import type { DeckSpec } from "./spec";
import type { Theme } from "./themes";

export interface SlideContext {
  deck: DeckSpec;
  theme: Theme;
  index: number;
  total: number;
  /** 1-based counter of `section` slides up to and including this one. */
  section: number;
}

const Context = createContext<SlideContext | null>(null);

export const SlideProvider = Context.Provider;

export function useSlideContext(): SlideContext {
  const value = useContext(Context);
  if (!value) throw new Error("useSlideContext must be used inside <SlideProvider>");
  return value;
}
