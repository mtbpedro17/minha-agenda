import { Capacitor } from "@capacitor/core";
import {
  AndroidBiometryStrength,
  BiometricAuth,
  BiometryError,
  BiometryErrorType,
  BiometryType,
} from "@aparajita/capacitor-biometric-auth";
import { getSetting, setSetting } from "@/lib/database/settings";

/**
 * App lock with biometrics (fingerprint / face), with the phone's own
 * PIN/pattern/password as fallback — so the user can never be locked out
 * of their own data just because the fingerprint failed.
 *
 * Plugin: @aparajita/capacitor-biometric-auth. In the browser the plugin
 * simulates biometry with a confirm() dialog (handy for `npm run dev`).
 */

export const APP_LOCK_KEY = "app_lock_enabled";

/** Window event fired when the lock is turned on/off (detail: boolean). */
export const LOCK_CHANGED_EVENT = "minha-agenda:lock-changed";

/** The app locks again if it stayed in the background at least this long. */
export const LOCK_AFTER_BACKGROUND_MS = 30_000;

let webSimulationReady = false;

/** In the browser, tell the plugin to simulate a fingerprint sensor. */
async function prepareWebSimulation(): Promise<void> {
  if (Capacitor.isNativePlatform() || webSimulationReady) return;
  webSimulationReady = true;
  await BiometricAuth.setBiometryType(BiometryType.fingerprintAuthentication);
  await BiometricAuth.setBiometryIsEnrolled(true);
  await BiometricAuth.setDeviceIsSecure(true);
}

export interface LockSupport {
  /** Can the lock be used at all (biometry enrolled OR a screen lock set)? */
  canLock: boolean;
  /** Biometry enrolled (fingerprint/face). If false, only PIN/pattern is used. */
  hasBiometry: boolean;
  /** Text for the UI: "digital", "rosto", "biometria" or "bloqueio de tela". */
  methodLabel: string;
  /** Why it can't be used, ready to show to the user (empty if canLock). */
  reason: string;
}

function labelFor(types: BiometryType[]): string {
  const hasFinger = types.includes(BiometryType.fingerprintAuthentication) || types.includes(BiometryType.touchId);
  const hasFace = types.includes(BiometryType.faceAuthentication) || types.includes(BiometryType.faceId);
  if (hasFinger && !hasFace) return "digital";
  if (hasFace && !hasFinger) return "rosto";
  return "biometria";
}

export async function getLockSupport(): Promise<LockSupport> {
  await prepareWebSimulation();
  const info = await BiometricAuth.checkBiometry();
  const hasBiometry = info.isAvailable;
  const canLock = hasBiometry || info.deviceIsSecure;
  return {
    canLock,
    hasBiometry,
    methodLabel: hasBiometry ? labelFor(info.biometryTypes) : "bloqueio de tela",
    reason: canLock
      ? ""
      : "Configure uma digital, reconhecimento facial ou um PIN/padrão de tela nas configurações do Android para usar o bloqueio.",
  };
}

export async function isLockEnabled(): Promise<boolean> {
  return (await getSetting(APP_LOCK_KEY)) === "1";
}

export async function setLockEnabled(enabled: boolean): Promise<void> {
  await setSetting(APP_LOCK_KEY, enabled ? "1" : "0");
  // Lets the AppLock wrapper start/stop watching the background right away.
  window.dispatchEvent(new CustomEvent(LOCK_CHANGED_EVENT, { detail: enabled }));
}

export type AuthResult =
  | { ok: true }
  | { ok: false; cancelled: boolean; message: string };

/** Asks for fingerprint/face (or the phone's PIN/pattern as fallback). */
export async function authenticate(reason: string): Promise<AuthResult> {
  await prepareWebSimulation();
  try {
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: "Cancelar",
      allowDeviceCredential: true,
      androidTitle: "Minha Agenda",
      androidSubtitle: reason,
      androidConfirmationRequired: false,
      // Required by Android when the device credential fallback is allowed.
      androidBiometryStrength: AndroidBiometryStrength.weak,
    });
    return { ok: true };
  } catch (error) {
    const code = error instanceof BiometryError ? error.code : BiometryErrorType.none;
    const cancelled =
      code === BiometryErrorType.userCancel ||
      code === BiometryErrorType.appCancel ||
      code === BiometryErrorType.systemCancel;
    return { ok: false, cancelled, message: messageFor(code) };
  }
}

function messageFor(code: BiometryErrorType): string {
  switch (code) {
    case BiometryErrorType.userCancel:
    case BiometryErrorType.appCancel:
    case BiometryErrorType.systemCancel:
      return "Desbloqueio cancelado.";
    case BiometryErrorType.biometryLockout:
      return "Muitas tentativas. Use o PIN ou padrão do celular.";
    case BiometryErrorType.biometryNotEnrolled:
    case BiometryErrorType.biometryNotAvailable:
    case BiometryErrorType.noDeviceCredential:
    case BiometryErrorType.passcodeNotSet:
      return "Nenhuma biometria ou bloqueio de tela configurado no celular.";
    default:
      return "Não foi possível confirmar sua identidade. Tente de novo.";
  }
}
