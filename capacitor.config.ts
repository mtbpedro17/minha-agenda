import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mutombo.minhaagenda",
  appName: "Minha Agenda",
  webDir: "out",
  backgroundColor: "#0b0b10",
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_reminder",
      iconColor: "#8b5cf6",
    },
    CapacitorSQLite: {
      androidIsEncryption: false,
    },
  },
};

export default config;
