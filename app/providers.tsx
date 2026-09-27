"use client";

import {
  createDOMRenderer,
  FluentProvider,
  RendererProvider,
  renderToStyleElements,
  SSRProvider,
  webLightTheme,
} from "@fluentui/react-components";
import { useServerInsertedHTML } from "next/navigation";
import { useState } from "react";

/**
 * Fluent UI v9 (the design language behind Power Apps' modern controls) styles
 * with Griffel, which needs its stylesheet flushed into the server-rendered
 * HTML to avoid a flash of unstyled content.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [renderer] = useState(() => createDOMRenderer());
  useServerInsertedHTML(() => renderToStyleElements(renderer));

  return (
    <RendererProvider renderer={renderer}>
      <SSRProvider>
        <FluentProvider theme={webLightTheme}>{children}</FluentProvider>
      </SSRProvider>
    </RendererProvider>
  );
}
