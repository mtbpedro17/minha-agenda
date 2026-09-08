"use client";

import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Registers the <jeep-sqlite> web component so the SQLite plugin also works
 * when the app is opened in a regular browser (useful during `next dev`
 * while iterating on UI before building the Android APK). Has no effect on
 * native Android/iOS, where the real SQLite plugin is used instead.
 *
 * Mounted imperatively (rather than via JSX) since `jeep-sqlite` is a custom
 * element unknown to React's JSX typings.
 */
export default function JeepSqlite() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (Capacitor.getPlatform() !== "web") return;
    const container = containerRef.current;
    if (!container) return;

    let mounted = true;
    import("jeep-sqlite/loader").then(({ defineCustomElements }) => {
      if (!mounted) return;
      defineCustomElements(window);
      const el = document.createElement("jeep-sqlite");
      container.appendChild(el);
    });

    return () => {
      mounted = false;
      container.innerHTML = "";
    };
  }, []);

  return <div ref={containerRef} />;
}
