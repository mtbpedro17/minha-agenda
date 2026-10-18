"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Fingerprint, Lock, ScanFace } from "lucide-react";
import {
  LOCK_AFTER_BACKGROUND_MS,
  LOCK_CHANGED_EVENT,
  authenticate,
  getLockSupport,
  isLockEnabled,
  setLockEnabled,
} from "@/lib/security/appLock";
import { useBackHandler } from "@/lib/navigation/backButton";

type State = "checking" | "locked" | "unlocked";

/**
 * Wraps the whole app (see app/layout.tsx). When the lock is enabled:
 * - on app start the content stays covered until the user authenticates;
 * - when the app goes to the background the content is covered right away
 *   (so the recent-apps preview doesn't show tasks — best effort), and if it
 *   stays away LOCK_AFTER_BACKGROUND_MS or more, it locks again.
 * While locked/covered the content is `inert` (no focus, no clicks).
 */
export default function AppLock({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>("checking");
  const [covered, setCovered] = useState(false);
  const [method, setMethod] = useState("biometria");
  const [message, setMessage] = useState("");

  const enabled = useRef(false);
  const authenticating = useRef(false);
  const ignoreEventsUntil = useRef(0);
  const backgroundSince = useRef<number | null>(null);

  const unlock = useCallback(async () => {
    if (authenticating.current) return;
    authenticating.current = true;
    setMessage("");
    const result = await authenticate("Desbloquear o Minha Agenda");
    authenticating.current = false;
    // The system prompt itself pauses/resumes the app: ignore those events.
    ignoreEventsUntil.current = Date.now() + 1500;
    if (result.ok) {
      setState("unlocked");
      setCovered(false);
    } else {
      setMessage(result.cancelled ? "" : result.message);
    }
  }, []);

  const lockNow = useCallback(() => {
    setState("locked");
    setCovered(false);
    void unlock();
  }, [unlock]);

  // Initial check.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const on = await isLockEnabled();
        if (!on) {
          if (!cancelled) setState("unlocked");
          return;
        }
        const support = await getLockSupport();
        if (!support.canLock) {
          // Biometry and screen lock were removed from the phone: never lock
          // the user out of their own data. Turn the lock off.
          await setLockEnabled(false);
          if (!cancelled) setState("unlocked");
          return;
        }
        enabled.current = true;
        if (!cancelled) {
          setMethod(support.methodLabel);
          lockNow();
        }
      } catch {
        if (!cancelled) setState("unlocked"); // never block the app on errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lockNow]);

  // Settings screen turned the lock on/off.
  useEffect(() => {
    const onChange = (e: Event) => {
      const on = (e as CustomEvent<boolean>).detail;
      enabled.current = on;
      if (on) getLockSupport().then((s) => setMethod(s.methodLabel)).catch(() => {});
    };
    window.addEventListener(LOCK_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(LOCK_CHANGED_EVENT, onChange);
  }, []);

  // Background / foreground.
  useEffect(() => {
    const onActiveChange = (isActive: boolean) => {
      if (!enabled.current || authenticating.current) return;
      if (Date.now() < ignoreEventsUntil.current) return;
      if (!isActive) {
        backgroundSince.current = Date.now();
        setCovered(true);
        return;
      }
      const since = backgroundSince.current;
      backgroundSince.current = null;
      if (since !== null && Date.now() - since >= LOCK_AFTER_BACKGROUND_MS) {
        lockNow();
      } else {
        setCovered(false);
      }
    };

    if (Capacitor.isNativePlatform()) {
      const handle = App.addListener("appStateChange", ({ isActive }) =>
        onActiveChange(isActive)
      );
      return () => {
        handle.then((h) => h.remove());
      };
    }
    const onVisibility = () => onActiveChange(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [lockNow]);

  const showLockScreen = state === "locked";
  const hidden = state !== "unlocked" || covered;

  // Back button on the lock screen sends the app to the background.
  useBackHandler(showLockScreen, () => {
    if (Capacitor.isNativePlatform()) void App.minimizeApp();
  });

  const Icon = method === "rosto" ? ScanFace : method === "bloqueio de tela" ? Lock : Fingerprint;

  return (
    <>
      <div inert={hidden} className="flex w-full flex-1 flex-col">
        {children}
      </div>

      {hidden && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-8 text-center"
          role={showLockScreen ? "dialog" : undefined}
          aria-modal={showLockScreen ? true : undefined}
          aria-label={showLockScreen ? "App bloqueado" : undefined}
        >
          {showLockScreen && (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft">
                <Lock size={28} className="text-accent" />
              </div>
              <h1 className="mt-5 text-xl font-semibold text-foreground">
                Minha Agenda
              </h1>
              <p className="mt-1 text-sm text-muted">O app está bloqueado.</p>
              <button
                type="button"
                onClick={() => void unlock()}
                className="mt-8 flex items-center gap-2 rounded-2xl bg-accent px-6 py-3.5 font-medium text-white transition-transform active:scale-[0.98]"
              >
                <Icon size={20} />
                {method === "bloqueio de tela"
                  ? "Desbloquear"
                  : `Desbloquear com ${method}`}
              </button>
              {message && (
                <p role="alert" className="mt-4 text-sm text-priority-high">
                  {message}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
