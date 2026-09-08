"use client";

import { useEffect } from "react";
import JeepSqlite from "./JeepSqlite";
import { ensureNotificationPermission } from "@/lib/notifications/notifications";

export default function AppInit() {
  useEffect(() => {
    ensureNotificationPermission().catch(() => {
      // Permission prompt isn't available in every environment (e.g. plain
      // browser preview); safe to ignore here, native builds will prompt.
    });
  }, []);

  return <JeepSqlite />;
}
