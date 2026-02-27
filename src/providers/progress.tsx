"use client";

import { AppProgressProvider } from "@bprogress/next";
import type { ReactNode } from "react";

type Props = { children: ReactNode };

export function ProgressProviderWrapper({ children }: Props) {
  return (
    <AppProgressProvider
      height="3px"
      color="#192CFF"
      options={{ showSpinner: false }}
      shallowRouting
    >
      {children}
    </AppProgressProvider>
  );
}
