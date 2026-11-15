"""Funções compartilhadas pelo montador de vídeo longo (cortes de silêncio e mapa de tempo)."""
import re, subprocess


def keep_intervals(src, ss, to, noise="-34dB", dur=0.55):
    """Trechos com fala (em segundos a partir de `ss`): corta silêncios longos, deixando uma folga curta."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-ss", str(ss), "-to", str(to), "-i", src, "-vn",
                        "-af", f"silencedetect=noise={noise}:d={dur}", "-f", "null", "-"], capture_output=True, text=True)
    sil, cur = [], None
    for line in r.stderr.splitlines():
        m = re.search(r"silence_start: ([\d.]+)", line)
        if m: cur = float(m.group(1))
        m = re.search(r"silence_end: ([\d.]+)", line)
        if m and cur is not None: sil.append((cur, float(m.group(1)))); cur = None
    if cur is not None: sil.append((cur, to - ss))
    keep, t = [], 0.0
    for a, b in sil:
        if a - t > 0.35: keep.append((max(0, t - 0.05), a + 0.12))
        t = b
    if (to - ss) - t > 0.35: keep.append((max(0, t - 0.05), to - ss))
    out = []
    for a, b in keep:
        if out and a - out[-1][1] < 0.05: out[-1] = (out[-1][0], b)
        else: out.append((a, b))
    return out


def map_time(iv, rel):
    """Tempo relativo do trecho original (`rel`, s a partir de ss) -> tempo na saída depois dos cortes."""
    acc = 0.0
    for a, b in iv:
        if rel <= a: return acc
        if rel < b: return acc + (rel - a)
        acc += b - a
    return acc
