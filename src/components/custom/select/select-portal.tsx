"use client";

import React, { createContext, useContext } from "react";

export const SELECT_INPUT_MENU_ATTR = "data-select-input-menu";
export const SELECT_INPUT_MENU_SELECTOR = `[${SELECT_INPUT_MENU_ATTR}]`;

const SelectPortalContainerContext = createContext<HTMLElement | null>(null);

export function SelectPortalContainerProvider({
  container,
  children,
}: {
  container: HTMLElement | null;
  children: React.ReactNode;
}) {
  return (
    <SelectPortalContainerContext.Provider value={container}>
      {children}
    </SelectPortalContainerContext.Provider>
  );
}

export function useSelectPortalContainer(): HTMLElement | null {
  return useContext(SelectPortalContainerContext);
}

export function isSelectInputMenuTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(SELECT_INPUT_MENU_SELECTOR));
}

export function preventDismissIfSelectMenu(
  event: { preventDefault: () => void },
  target?: EventTarget | null,
) {
  if (isSelectInputMenuTarget(target ?? null)) {
    event.preventDefault();
  }
}
