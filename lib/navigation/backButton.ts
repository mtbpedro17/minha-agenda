import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

/**
 * Central handling of the Android hardware "back" button.
 *
 * Overlays (sheets, dialogs) register a close handler while they are open.
 * Handlers form a stack: pressing back closes only the top-most overlay
 * (e.g. a confirmation dialog opened on top of a sheet closes first).
 * With no overlay open, back behaves like Android's default: go back one
 * screen, or exit the app on the first screen.
 *
 * Why this is needed: as soon as the app listens to Capacitor's
 * `backButton` event, Capacitor disables its default behavior, so the
 * "go back / exit" part has to be reimplemented here.
 *
 * In the browser (`npm run dev`) the Escape key plays the role of the back
 * button for overlays, so this logic can be tested without a device.
 */

type BackHandler = () => void;

const stack: BackHandler[] = [];

/** Closes the top-most overlay. Returns false if there was none. */
function closeTopOverlay(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top();
  return true;
}

let installed = false;

/** Installs the global listeners. Call once at app start (see AppInit). */
export function installBackButtonHandling(): () => void {
  if (installed) return () => {};
  installed = true;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && closeTopOverlay()) e.preventDefault();
  };
  window.addEventListener("keydown", onKeyDown);

  let removeNative: (() => void) | null = null;
  if (Capacitor.isNativePlatform()) {
    App.addListener("backButton", ({ canGoBack }) => {
      if (closeTopOverlay()) return;
      if (canGoBack) window.history.back();
      else App.exitApp();
    }).then((handle) => {
      removeNative = () => handle.remove();
    });
  }

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    removeNative?.();
    installed = false;
  };
}

/**
 * Registers `onBack` as the close action of an overlay while `active` is true.
 * Usage inside a sheet/dialog component: `useBackHandler(true, onClose)`.
 */
export function useBackHandler(active: boolean, onBack: BackHandler): void {
  // Keep the latest callback without re-registering on every render.
  const ref = useRef(onBack);
  useEffect(() => {
    ref.current = onBack;
  });

  useEffect(() => {
    if (!active) return;
    const handler: BackHandler = () => ref.current();
    stack.push(handler);
    return () => {
      const i = stack.lastIndexOf(handler);
      if (i !== -1) stack.splice(i, 1);
    };
  }, [active]);
}

// ------------------------------------------------------------------------
// In-app history: how many screens of THIS app were visited in this session.
// Used to decide whether "go back" stays inside the app (e.g. after saving a
// task) or whether we must navigate to a default screen instead.

let screensVisited = 0;

/** Call on every route change (AppInit does it). */
export function recordScreenVisit(): void {
  screensVisited++;
}

/** True if there is a previous screen of the app to go back to. */
export function canGoBackInApp(): boolean {
  return screensVisited > 1;
}
