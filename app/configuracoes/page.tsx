"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, HardDrive, ShieldCheck, WifiOff } from "lucide-react";
import { getSetting, setSetting } from "@/lib/database/settings";
import BackupSection from "@/components/BackupSection";
import SecuritySection from "@/components/SecuritySection";
import NotificationSoundSection from "@/components/NotificationSoundSection";
// Single source of truth for the version (Android reads it too, see android/app/build.gradle).
import { version as appVersion } from "@/package.json";

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSetting("user_name").then((value) => setName(value ?? ""));
  }, []);

  async function handleSave() {
    await setSetting("user_name", name.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <main className="flex-1 overflow-y-auto px-5 pb-10 pt-6">
      <header className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => router.back()}
          className="rounded-full p-1.5 text-foreground"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-semibold text-foreground">
          Configurações
        </h1>
      </header>

      <div className="mt-6">
        <label className="mb-1.5 block text-sm font-medium text-muted">
          Como podemos te chamar?
        </label>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            className="min-w-0 flex-1 rounded-2xl bg-surface px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="button"
            onClick={handleSave}
            className="shrink-0 rounded-2xl bg-accent px-5 py-3 font-medium text-white transition-transform active:scale-95"
          >
            {saved ? "Salvo!" : "Salvar"}
          </button>
        </div>
      </div>

      <SecuritySection />

      <NotificationSoundSection />

      <BackupSection />

      <div className="mt-8 space-y-3">
        <div className="flex items-start gap-3 rounded-2xl bg-surface px-4 py-4">
          <WifiOff size={18} className="mt-0.5 shrink-0 text-accent" />
          <div>
            <p className="font-medium text-foreground">100% Offline</p>
            <p className="mt-0.5 text-sm text-muted">
              Seus dados ficam apenas no seu dispositivo.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl bg-surface px-4 py-4">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-accent" />
          <div>
            <p className="font-medium text-foreground">Seus dados, sua privacidade</p>
            <p className="mt-0.5 text-sm text-muted">
              Todas as informações são salvas apenas no seu dispositivo. Sem
              internet. Sem servidores.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl bg-surface px-4 py-4">
          <HardDrive size={18} className="mt-0.5 shrink-0 text-accent" />
          <div>
            <p className="font-medium text-foreground">Sem backup na nuvem</p>
            <p className="mt-0.5 text-sm text-muted">
              Nada é copiado para a sua conta Google. Se você desinstalar o
              app ou limpar os dados dele, suas tarefas e notas serão apagadas.
              Use <strong className="font-medium text-foreground">Exportar</strong>{" "}
              acima para guardar uma cópia.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-muted">
        Minha Agenda • v{appVersion}
      </p>
    </main>
  );
}
