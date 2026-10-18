"use client";

import { useEffect } from "react";
import JeepSqlite from "./JeepSqlite";
import { Capacitor } from "@capacitor/core";
import {
  ensureNotificationPermission,
  refreshAllReminders,
} from "@/lib/notifications/notifications";
import { usePathname } from "next/navigation";
import {
  installBackButtonHandling,
  recordScreenVisit,
} from "@/lib/navigation/backButton";

export default function AppInit() {
  // Count in-app screen changes (see canGoBackInApp).
  const pathname = usePathname();
  useEffect(() => {
    recordScreenVisit();
  }, [pathname]);

  useEffect(() => {
    ensureNotificationPermission()
      .catch(() => {
        // Permission prompt isn't available in every environment (e.g. plain
        // browser preview); safe to ignore here, native builds will prompt.
      })
      .then(() => {
        // Re-schedule pending reminders: keeps the "next occurrences" window
        // of recurring tasks moving and every reminder on the current
        // sound channel (also moves reminders created by older versions).
        if (Capacitor.isNativePlatform()) return refreshAllReminders();
      })
      .catch(() => {});
  }, []);

  // Android back button: closes open sheets/dialogs first, then navigates back.
  useEffect(() => installBackButtonHandling(), []);

  return <JeepSqlite />;
}
