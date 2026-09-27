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
import { useRef, useState } from "react";

/**
 * Fluent UI v9 (the design language behind Power Apps' modern controls) styles
 * with Griffel, which needs its stylesheet flushed into the server-rendered
 * HTML to avoid a flash of unstyled content.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [renderer] = useState(() => createDOMRenderer());
  const flushed = useRef(false);

  // Next.js calls this for every inserted chunk; flushing more than once emits
  // duplicate rules that the client then complains about while rehydrating.
  useServerInsertedHTML(() => {
    if (flushed.current) return;
    flushed.current = true;
    return <>{renderToStyleElements(renderer)}</>;
  });

  return (
    <RendererProvider renderer={renderer}>
      <SSRProvider>
        <FluentProvider theme={webLightTheme}>{children}</FluentProvider>
      </SSRProvider>
    </RendererProvider>
  );
}
