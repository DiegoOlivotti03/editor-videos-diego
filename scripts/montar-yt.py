#!/usr/bin/env python3
"""Monta um vídeo longo de YouTube (1920x1080) a partir de um plano em JSON.

Uso: python3 scripts/montar-yt.py trabalho/<nome>/plano.json

O plano lista as "unidades" em ordem (cada uma é um trecho de um clipe de p1080/):
  { "id": "a1", "src": "IMG_9416", "ss": 4.0, "dur": 2.8 }                 trecho simples
  { "id": "t1", "src": "IMG_9403", "ss": 41.3, "to": 243.0, "talk": true } fala com pausas cortadas e zoom alternado
  { "id": "intro", "intro": "out/yt/intro.mp4" }                          cartão pronto (Remotion)
Campos comuns: "music" (ganho da música, 0 a 1), "loud" (LUFS-alvo da unidade), "tag" ({label, sub}),
"sfx_in" ("whoosh"|"click"|"bell"|"riser"), "sfx" ([{at, name, vol}] em segundos dentro da unidade).
Saída: out/<nome>.mp4 (feito com ffmpeg; as etiquetas vêm de sequências PNG do Remotion).
"""
import json, os, re, subprocess, sys
import numpy as np

SR = 48000
plan_path = sys.argv[1]
plan = json.load(open(plan_path))
ROOT = os.path.dirname(os.path.abspath(plan_path))
APP = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app"))
WORK = os.path.join(ROOT, "work")
os.makedirs(WORK, exist_ok=True)
SFX_DIR = os.path.join(APP, "public", "sfx")
SFX = {"whoosh": "whoosh2.mp3", "click": "click.mp3", "bell": "bell.mp3", "riser": "riser.mp3"}
SFX_VOL = {"whoosh": 0.22, "click": 0.35, "bell": 0.14, "riser": 0.5}


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        print(" ".join(cmd)[:400]); print(r.stderr[-1500:]); raise SystemExit(1)
    return r


def probe(path, entry):
    return run(["ffprobe", "-v", "error", "-show_entries", entry, "-of", "csv=p=0", path]).stdout.strip()


def keep_intervals(src, ss, to):
    """Trechos com fala: corta silêncios longos, deixando uma folga curta em volta."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-ss", str(ss), "-to", str(to), "-i", src, "-vn",
                        "-af", "silencedetect=noise=-34dB:d=0.55", "-f", "null", "-"], capture_output=True, text=True)
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
    # junta trechos que ficaram colados
    out = []
    for a, b in keep:
        if out and a - out[-1][1] < 0.05: out[-1] = (out[-1][0], b)
        else: out.append((a, b))
    return out


def vf_fit(w, h):
    if w >= h:
        return "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1"
    # vertical: miolo nítido + fundo desfocado
    return ("split[a][b];[a]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,gblur=sigma=45,eq=brightness=-0.08[bg];"
            "[b]scale=-2:1080[fg];[bg][fg]overlay=(W-w)/2:0,setsar=1")


units = plan["units"]
rendered = []
for u in units:
    out = os.path.join(WORK, f"{u['id']}.mp4")
    if os.path.exists(out):
        rendered.append(out); continue
    if u.get("intro"):
        src = os.path.join(APP, u["intro"])
        run(["ffmpeg", "-v", "error", "-y", "-i", src, "-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=stereo", "-shortest",
             "-vf", "scale=1920:1080,fps=30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
             "-c:a", "aac", "-b:a", "192k", out])
        rendered.append(out); continue
    src = os.path.join(ROOT, "p1080", u["src"] + ".mp4")
    w, h = [int(x) for x in probe(src, "stream=width,height").split("\n")[0].split(",")]
    loud = u.get("loud", -16 if u.get("talk") else -26)
    ss = u.get("ss", 0)
    to = ss + u["dur"] if "dur" in u else u["to"]
    if u.get("talk"):
        iv = keep_intervals(src, ss, to)
        fc, labs = [], ""
        for i, (a, b) in enumerate(iv):
            zoom = 1.0 if i % 2 == 0 else 1.07
            z = "" if zoom == 1.0 else f",crop=iw/{zoom}:ih/{zoom},scale=1920:1080"
            fc.append(f"[0:v]trim={ss + a:.3f}:{ss + b:.3f},setpts=PTS-STARTPTS,fps=30,{vf_fit(w, h)}{z}[v{i}]")
            fc.append(f"[0:a]atrim={ss + a:.3f}:{ss + b:.3f},asetpts=PTS-STARTPTS,aresample={SR}[a{i}]")
            labs += f"[v{i}][a{i}]"
        fc.append(f"{labs}concat=n={len(iv)}:v=1:a=1[v][a0]")
        fc.append(f"[a0]loudnorm=I={loud}:TP=-1.5:LRA=11,aresample={SR},aformat=channel_layouts=stereo[a]")
        fcs = os.path.join(WORK, f"{u['id']}.filter.txt")
        open(fcs, "w").write(";\n".join(fc))
        run(["ffmpeg", "-v", "error", "-y", "-i", src, "-filter_complex_script", fcs, "-map", "[v]", "-map", "[a]",
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", out])
    else:
        fc = (f"[0:v]fps=30,{vf_fit(w, h)}[v];[0:a]loudnorm=I={loud}:TP=-1.5:LRA=11,aresample={SR},aformat=channel_layouts=stereo[a]")
        run(["ffmpeg", "-v", "error", "-y", "-ss", str(ss), "-t", str(to - ss), "-i", src, "-filter_complex", fc, "-map", "[v]", "-map", "[a]",
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", out])
    rendered.append(out)
    print("ok", u["id"], flush=True)

# linha do tempo
durs = [float(probe(p, "format=duration")) for p in rendered]
starts = np.concatenate([[0], np.cumsum(durs)[:-1]])
total = float(sum(durs))
print(f"total {total:.1f}s em {len(units)} unidades")

lst = os.path.join(WORK, "lista.txt")
open(lst, "w").write("".join(f"file '{p}'\n" for p in rendered))
base = os.path.join(WORK, "base.mp4")
run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", base])

# áudio: voz/ambiente + música (envelope por unidade) + efeitos
voice = os.path.join(WORK, "voz.f32")
run(["ffmpeg", "-v", "error", "-y", "-i", base, "-vn", "-ac", "2", "-ar", str(SR), "-f", "f32le", voice])
a = np.fromfile(voice, dtype=np.float32).reshape(-1, 2)
n = len(a)

def load(path, loop_to=None):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
    if loop_to:
        reps = int(np.ceil(loop_to / len(x)))
        # emenda com 2 s de fade cruzado para o laço não estalar
        xf = SR * 2
        y = x
        for _ in range(reps - 1):
            fade = np.linspace(0, 1, xf)[:, None]
            y = np.concatenate([y[:-xf], y[-xf:] * (1 - fade) + x[:xf] * fade, x[xf:]])
        x = y
    return x

music = load(os.path.join(ROOT, plan["music"]), loop_to=n)[:n] * 1.0
env = np.zeros(n, dtype=np.float32)
for u, s, d in zip(units, starts, durs):
    env[int(s * SR):int((s + d) * SR)] = u.get("music", 0.0)
# suaviza as mudanças de ganho (rampa de ~0,8 s)
k = int(0.8 * SR)
env = np.convolve(env, np.ones(k) / k, mode="same")
mix = a + music * env[:, None]

sfx_cache = {}
def sfx(name):
    if name not in sfx_cache: sfx_cache[name] = load(os.path.join(SFX_DIR, SFX[name]))
    return sfx_cache[name]

def place(t, name, vol=None):
    x = sfx(name) * (SFX_VOL[name] if vol is None else vol)
    i = max(0, int(t * SR)); j = min(n, i + len(x))
    if j > i: mix[i:j] += x[: j - i]

for u, s in zip(units, starts):
    if u.get("sfx_in"): place(s - 0.05 if u["sfx_in"] != "riser" else s, u["sfx_in"])
    for e in u.get("sfx", []): place(s + e["at"], e["name"], e.get("vol"))

peak = float(np.max(np.abs(mix)))
if peak > 0.95: mix *= 0.95 / peak
mixf = os.path.join(WORK, "mix.f32"); mix.astype(np.float32).tofile(mixf)
mixwav = os.path.join(WORK, "mix.wav")
run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", mixf,
     "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", str(SR), mixwav])

# etiquetas (sequências PNG com alfa) por cima do vídeo
tags = [(u["tag"], s) for u, s in zip(units, starts) if u.get("tag")]
cmd = ["ffmpeg", "-v", "error", "-y", "-i", base, "-i", mixwav]
for t, s in tags:
    cmd += ["-itsoffset", f"{s + t.get('delay', 0.4):.2f}", "-framerate", "30", "-i", os.path.join(APP, "out", "yt", t["dir"], "element-%03d.png")]
chain, last = [], "0:v"
for i in range(len(tags)):
    chain.append(f"[{last}][{i + 2}:v]overlay=0:0:eof_action=pass:format=auto[o{i}]"); last = f"o{i}"
out = os.path.join(APP, "out", plan.get("out", "utr-youtube.mp4"))
os.makedirs(os.path.dirname(out), exist_ok=True)
cmd += (["-filter_complex", ";".join(chain), "-map", f"[{last}]"] if chain else ["-map", "0:v"])
cmd += ["-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", out]
run(cmd)
print("PRONTO", out, f"{total:.1f}s")
json.dump({"starts": [round(float(x), 2) for x in starts], "ids": [u["id"] for u in units]}, open(os.path.join(WORK, "timeline.json"), "w"))
