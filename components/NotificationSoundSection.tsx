"use client";

import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { BellRing, Play, Square } from "lucide-react";
import {
  DEFAULT_SOUND_PREFS,
  SOUND_OPTIONS,
  getSoundPrefs,
  type SoundId,
  type SoundPrefs,
} from "@/lib/notifications/sound";
import {
  applyReminderSound,
  sendTestNotification,
} from "@/lib/notifications/notifications";

/**
 * "Notificações" block of Configurações: reminder sound + vibration, a
 * preview button for each bundled sound and a "send test" button.
 */
export default function NotificationSoundSection() {
  const [prefs, setPrefs] = useState<SoundPrefs>(DEFAULT_SOUND_PREFS);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState<SoundId | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const native = Capacitor.isNativePlatform();

  useEffect(() => {
    getSoundPrefs()
      .then(setPrefs)
      .finally(() => setLoaded(true));
    return () => audio.current?.pause();
  }, []);

  async function change(next: SoundPrefs) {
    if (busy) return;
    const previous = prefs;
    setPrefs(next);
    setBusy(true);
    setStatus(null);
    try {
      const failures = await applyReminderSound(next);
      setStatus(
        failures > 0
          ? { ok: false, text: `Som salvo, mas ${failures} lembrete(s) não puderam ser reagendados. Verifique as permissões de notificação.` }
          : { ok: true, text: "Som salvo. Vale para todos os lembretes." }
      );
    } catch {
      setPrefs(previous);
      setStatus({ ok: false, text: "Não foi possível mudar o som. Tente novamente." });
    } finally {
      setBusy(false);
    }
  }

  function preview(id: SoundId, file?: string) {
    audio.current?.pause();
    if (playing === id || !file) {
      setPlaying(null);
      return;
    }
    const a = new Audio(`/sounds/${file}`);
    a.onended = () => setPlaying(null);
    audio.current = a;
    setPlaying(id);
    a.play().catch(() => setPlaying(null));
  }

  async function test() {
    setStatus(null);
    try {
      await sendTestNotification(3);
      setStatus({ ok: true, text: "Teste enviado: a notificação chega em 3 segundos." });
    } catch {
      setStatus({ ok: false, text: "Não foi possível enviar. Verifique se as notificações do app estão permitidas." });
    }
  }

  const silent = prefs.sound === "silencioso";

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-muted">Notificações</h2>
      <div className="mt-2.5 rounded-2xl bg-surface px-4 py-4">
        <p className="font-medium text-foreground">Som dos lembretes</p>

        <div role="radiogroup" aria-label="Som dos lembretes" className="mt-3 space-y-1.5">
          {SOUND_OPTIONS.map((o) => {
            const selected = prefs.sound === o.id;
            return (
              <div key={o.id} className="flex items-center gap-2">
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={!loaded || busy}
                  onClick={() => change({ ...prefs, sound: o.id })}
                  className={`flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-60 ${
                    selected ? "bg-accent-soft text-foreground" : "bg-surface-elevated text-muted"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      selected ? "border-accent" : "border-border"
                    }`}
                  >
                    {selected && <span className="h-2 w-2 rounded-full bg-accent" />}
                  </span>
                  {o.label}
                </button>
                {o.file && (
                  <button
                    type="button"
                    aria-label={playing === o.id ? `Parar ${o.label}` : `Ouvir ${o.label}`}
                    onClick={() => preview(o.id, o.file)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-elevated text-accent active:scale-95"
                  >
                    {playing === o.id ? <Square size={14} /> : <Play size={16} />}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className={`text-sm ${silent ? "text-muted" : "text-foreground"}`}>Vibrar</span>
          <button
            type="button"
            role="switch"
            aria-checked={!silent && prefs.vibrate}
            aria-label="Vibrar"
            disabled={!loaded || busy || silent}
            onClick={() => change({ ...prefs, vibrate: !prefs.vibrate })}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
              !silent && prefs.vibrate ? "bg-accent" : "bg-surface-elevated"
            }`}
          >
            <span
              className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                !silent && prefs.vibrate ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {native ? (
          <button
            type="button"
            onClick={test}
            disabled={busy}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-surface-elevated py-3 text-sm font-medium text-foreground active:scale-[0.98] disabled:opacity-60"
          >
            <BellRing size={16} />
            Enviar notificação de teste
          </button>
        ) : (
          <p className="mt-4 text-xs text-muted">
            No navegador só a prévia (▶) funciona; o som da notificação vale no
            app Android.
          </p>
        )}

        <p className="mt-3 text-xs text-muted">
          Quer um toque do próprio celular? Escolha <strong className="font-medium text-foreground">Padrão do Android</strong>{" "}
          e depois troque em Configurações do Android → Apps → Minha Agenda →
          Notificações → Lembretes de tarefas → Som.
        </p>

        {status && (
          <p
            role="status"
            className={`mt-3 text-sm ${status.ok ? "text-priority-low" : "text-priority-high"}`}
          >
            {status.text}
          </p>
        )}
      </div>
    </section>
  );
}
