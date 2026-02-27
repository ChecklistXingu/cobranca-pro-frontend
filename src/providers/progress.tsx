"use client";

import { ProgressBarProvider } from "@bprogress/next";
import type { ReactNode } from "react";

type Props = { children: ReactNode };

export function ProgressProviderWrapper({ children }: Props) {
  return (
    <ProgressBarProvider
      height="3px"
      color="#192CFF"
      showSpinner={false}
      shallowRouting
    >
      {children}
    </ProgressBarProvider>
  );
}
