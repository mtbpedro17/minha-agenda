import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { getSetting, setSetting } from "@/lib/database/settings";

/**
 * Notification sound and vibration chosen by the user.
 *
 * On Android 8+ the sound and vibration belong to a NOTIFICATION CHANNEL,
 * not to each notification, and a channel can't be changed by the app after
 * it is created. So every combination gets its own channel id
 * (`lembretes_<sound>_<v|n>`). Changing the preference creates the new
 * channel, deletes the old reminder channels and re-schedules the pending
 * reminders on the new one (see applyReminderSound in notifications.ts).
 *
 * Sound files live in android/app/src/main/res/raw (used by Android) and in
 * public/sounds (used for the preview button). Regenerate them with
 * `python3 scripts/make_sounds.py <pasta>`.
 */

export type SoundId = "system" | "suave" | "sino" | "digital" | "alerta" | "silencioso";

export interface SoundOption {
  id: SoundId;
  label: string;
  /** File in res/raw and public/sounds; undefined = no bundled file. */
  file?: string;
}

export const SOUND_OPTIONS: SoundOption[] = [
  { id: "system", label: "Padrão do Android" },
  { id: "suave", label: "Suave", file: "lembrete_suave.wav" },
  { id: "sino", label: "Sino", file: "lembrete_sino.wav" },
  { id: "digital", label: "Digital", file: "lembrete_digital.wav" },
  { id: "alerta", label: "Alerta", file: "lembrete_alerta.wav" },
  { id: "silencioso", label: "Silencioso (só aparece)" },
];

export interface SoundPrefs {
  sound: SoundId;
  vibrate: boolean;
}

export const SOUND_KEY = "notification_sound";
export const VIBRATE_KEY = "notification_vibrate";
export const DEFAULT_SOUND_PREFS: SoundPrefs = { sound: "system", vibrate: true };

/** Prefix of every channel this module creates (others are left alone). */
const CHANNEL_PREFIX = "lembretes_";

function isSoundId(v: string | null): v is SoundId {
  return SOUND_OPTIONS.some((o) => o.id === v);
}

export async function getSoundPrefs(): Promise<SoundPrefs> {
  const [sound, vibrate] = await Promise.all([
    getSetting(SOUND_KEY),
    getSetting(VIBRATE_KEY),
  ]);
  return {
    sound: isSoundId(sound) ? sound : DEFAULT_SOUND_PREFS.sound,
    vibrate: vibrate === null ? DEFAULT_SOUND_PREFS.vibrate : vibrate === "1",
  };
}

export async function saveSoundPrefs(prefs: SoundPrefs): Promise<void> {
  await setSetting(SOUND_KEY, prefs.sound);
  await setSetting(VIBRATE_KEY, prefs.vibrate ? "1" : "0");
}

/** Channel id for a combination; pure, used by tests. */
export function channelIdFor(prefs: SoundPrefs): string {
  // Silent channels never vibrate (low importance), so one id is enough.
  if (prefs.sound === "silencioso") return `${CHANNEL_PREFIX}silencioso`;
  return `${CHANNEL_PREFIX}${prefs.sound}_${prefs.vibrate ? "v" : "n"}`;
}

/**
 * Creates (if needed) the channel for these prefs and deletes the app's other
 * reminder channels, so the Android settings only list the one in use.
 * Returns the channel id. No-op on the web (no channels there).
 */
export async function ensureReminderChannel(prefs: SoundPrefs): Promise<string> {
  const id = channelIdFor(prefs);
  if (!Capacitor.isNativePlatform()) return id;

  const option = SOUND_OPTIONS.find((o) => o.id === prefs.sound);
  const silent = prefs.sound === "silencioso";

  await LocalNotifications.createChannel({
    id,
    name: "Lembretes de tarefas",
    description: "Avisos das suas tarefas no horário marcado",
    // 4 = high (sound + pop-up on screen); 2 = low (no sound, no vibration).
    importance: silent ? 2 : 4,
    visibility: 1, // public: show on the lock screen
    vibration: !silent && prefs.vibrate,
    // No `sound` = Android's default notification sound (the user can change
    // it later in the system settings of this channel).
    sound: option?.file,
  });

  const { channels } = await LocalNotifications.listChannels();
  for (const channel of channels) {
    if (channel.id.startsWith(CHANNEL_PREFIX) && channel.id !== id) {
      await LocalNotifications.deleteChannel({ id: channel.id });
    }
  }
  return id;
}

let currentChannel: Promise<string> | null = null;

/**
 * Channel that reminders must be posted to. Loaded once from the saved
 * preference (creating the channel if needed) and cached.
 */
export function getReminderChannelId(): Promise<string> {
  if (!currentChannel) {
    currentChannel = getSoundPrefs()
      .then(ensureReminderChannel)
      .catch((e) => {
        currentChannel = null; // retry next time
        throw e;
      });
  }
  return currentChannel;
}

/** Saves the new prefs and switches the cached channel. */
export async function setReminderChannel(prefs: SoundPrefs): Promise<string> {
  await saveSoundPrefs(prefs);
  const id = await ensureReminderChannel(prefs);
  currentChannel = Promise.resolve(id);
  return id;
}
