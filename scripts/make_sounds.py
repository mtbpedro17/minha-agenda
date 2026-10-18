"""Synthesizes the app's original notification sounds (no third-party audio)."""
import numpy as np, wave, sys, os
SR = 22050
out = sys.argv[1]

def env(n, attack=0.005, decay=3.0):
    t = np.arange(n) / SR
    a = np.minimum(1, t / attack)
    return a * np.exp(-decay * t)

def tone(freq, dur, partials=((1, 1.0),), decay=3.0, attack=0.005):
    n = int(SR * dur); t = np.arange(n) / SR
    s = sum(amp * np.sin(2 * np.pi * freq * mult * t) for mult, amp in partials)
    return s * env(n, attack, decay)

def place(total, *items):
    buf = np.zeros(int(SR * total))
    for start, sig in items:
        i = int(SR * start); buf[i:i + len(sig)] += sig[: len(buf) - i]
    return buf

def finish(sig, name):
    fade = int(SR * 0.02)
    sig[-fade:] *= np.linspace(1, 0, fade)
    # Similar loudness for every sound: target RMS 0.15, peak never above 0.8.
    sig = sig * min(0.8 / np.max(np.abs(sig)), 0.15 / np.sqrt(np.mean(sig ** 2)))
    data = (sig * 32767).astype("<i2").tobytes()
    with wave.open(os.path.join(out, name), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data)

warm = ((1, 1.0), (2, 0.25), (3, 0.08))
# Suave: two gentle rising notes (E5 -> A5)
finish(place(1.4, (0, tone(659.25, 1.0, warm, 4.0, 0.02)), (0.22, tone(880.0, 1.15, warm, 3.5, 0.02))), "lembrete_suave.wav")
# Sino: bell with inharmonic partials
bell = ((1, 1.0), (2.0, 0.55), (2.76, 0.35), (5.4, 0.18), (8.93, 0.08))
finish(place(2.0, (0, tone(784.0, 2.0, bell, 2.2, 0.002))), "lembrete_sino.wav")
# Digital: three short beeps (band-limited square-ish)
sq = ((1, 1.0), (3, 0.33), (5, 0.2))
beep = lambda: tone(1318.5, 0.11, sq, 6.0, 0.003)
finish(place(0.75, (0, beep()), (0.18, beep()), (0.36, beep())), "lembrete_digital.wav")
# Alerta: insistent two-tone, twice
hi = lambda f: tone(f, 0.22, ((1, 1.0), (2, 0.4), (3, 0.2)), 4.0, 0.004)
finish(place(1.3, (0, hi(698.5)), (0.2, hi(1046.5)), (0.6, hi(698.5)), (0.8, hi(1046.5))), "lembrete_alerta.wav")
print("ok")
