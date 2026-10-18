"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Fingerprint } from "lucide-react";
import {
  authenticate,
  getLockSupport,
  isLockEnabled,
  setLockEnabled,
  type LockSupport,
} from "@/lib/security/appLock";

/**
 * "Segurança" block of Configurações: turn the biometric app lock on/off.
 * Both turning on and off require authenticating, so someone holding an
 * unlocked phone can't silently disable it.
 */
export default function SecuritySection() {
  const [support, setSupport] = useState<LockSupport | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    Promise.all([getLockSupport(), isLockEnabled()])
      .then(([s, on]) => {
        setSupport(s);
        setEnabled(on);
      })
      .catch(() =>
        setSupport({ canLock: false, hasBiometry: false, methodLabel: "", reason: "Não foi possível verificar a biometria deste aparelho." })
      );
  }, []);

  async function toggle() {
    if (!support?.canLock || busy) return;
    const next = !enabled;
    setBusy(true);
    setMessage(null);
    const result = await authenticate(
      next ? "Confirme para ativar o bloqueio" : "Confirme para desativar o bloqueio"
    );
    if (result.ok) {
      await setLockEnabled(next);
      setEnabled(next);
      setMessage({
        ok: true,
        text: next
          ? "Bloqueio ativado. O app vai pedir sua identificação ao abrir."
          : "Bloqueio desativado.",
      });
    } else if (!result.cancelled) {
      setMessage({ ok: false, text: result.message });
    }
    setBusy(false);
  }

  const label =
    support && support.methodLabel && support.methodLabel !== "bloqueio de tela"
      ? `Bloquear com ${support.methodLabel}`
      : "Bloquear o app";

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-muted">Segurança</h2>
      <div className="mt-2.5 rounded-2xl bg-surface px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Fingerprint size={18} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <p className="font-medium text-foreground">{label}</p>
              <p className="mt-0.5 text-xs text-muted">
                Pede digital ou rosto ao abrir o app e depois de 30 s fora
                dele. Se falhar, dá para usar o PIN/padrão do celular.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={label}
            disabled={!support?.canLock || busy}
            onClick={toggle}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
              enabled ? "bg-accent" : "bg-surface-elevated"
            }`}
          >
            <span
              className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {support && !support.canLock && (
          <p className="mt-3 text-xs text-priority-medium">{support.reason}</p>
        )}
        {support?.canLock && !support.hasBiometry && (
          <p className="mt-3 text-xs text-muted">
            Nenhuma digital ou rosto cadastrado: o app vai pedir o PIN/padrão
            do celular.
          </p>
        )}
        {!Capacitor.isNativePlatform() && (
          <p className="mt-3 text-xs text-muted">
            No navegador a biometria é simulada por uma janela de confirmação.
          </p>
        )}
        {message && (
          <p
            role="status"
            className={`mt-3 text-sm ${message.ok ? "text-priority-low" : "text-priority-high"}`}
          >
            {message.text}
          </p>
        )}
      </div>
    </section>
  );
}
