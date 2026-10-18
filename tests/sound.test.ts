import { check, section } from "./check";
import { SOUND_OPTIONS, channelIdFor } from "@/lib/notifications/sound";

section("Som — canais de notificação");
check("cada combinação tem um canal", [
  channelIdFor({ sound: "system", vibrate: true }),
  channelIdFor({ sound: "sino", vibrate: false }),
], ["lembretes_system_v", "lembretes_sino_n"]);
check("silencioso ignora vibração (um canal só)", [
  channelIdFor({ sound: "silencioso", vibrate: true }),
  channelIdFor({ sound: "silencioso", vibrate: false }),
], ["lembretes_silencioso", "lembretes_silencioso"]);
const ids = SOUND_OPTIONS.flatMap((o) => [true, false].map((v) => channelIdFor({ sound: o.id, vibrate: v })));
check("ids válidos para o Android (minúsculas, números, _)", ids.every((id) => /^[a-z0-9_]+$/.test(id)), true);
check("arquivos de som com nome válido para res/raw", SOUND_OPTIONS.filter((o) => o.file).every((o) => /^[a-z0-9_]+\.wav$/.test(o.file!)), true);
