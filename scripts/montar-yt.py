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
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from yt_util import keep_intervals, map_time

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


def vf_fit(w, h):
    if w >= h:
        return "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1"
    # vertical: miolo nítido + fundo desfocado
    return ("split[a][b];[a]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,gblur=sigma=45,eq=brightness=-0.08[bg];"
            "[b]scale=-2:1080[fg];[bg][fg]overlay=(W-w)/2:0,setsar=1")


units = plan["units"]
rendered = []
UCRF, UPRESET = str(plan.get("unit_crf", 15)), plan.get("unit_preset", "fast")
ENC = ["-c:v", "libx264", "-preset", UPRESET, "-crf", UCRF, "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k"]


def source_for(name):
    """Original 4K se existir (qualidade máxima); senão o proxy 1080p."""
    o = os.path.join(ROOT, "orig", name + ".MOV")
    return o if (plan.get("orig") and os.path.exists(o)) else os.path.join(ROOT, "p1080", name + ".mp4")


for u in units:
    out = os.path.join(WORK, f"{u['id']}.mp4")
    if os.path.exists(out):
        rendered.append(out); continue
    if u.get("intro"):
        src = os.path.join(APP, u["intro"])
        run(["ffmpeg", "-v", "error", "-y", "-i", src, "-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=stereo", "-shortest",
             "-vf", "scale=1920:1080,fps=30", "-c:v", "libx264", "-preset", "fast", "-crf", "14", "-pix_fmt", "yuv420p",
             "-c:a", "aac", "-b:a", "256k", out])
        rendered.append(out); continue
    proxy = os.path.join(ROOT, "p1080", u["src"] + ".mp4")
    src = source_for(u["src"])
    w, h = [int(x) for x in probe(proxy, "stream=width,height").split("\n")[0].split(",")]
    loud = u.get("loud", -16 if u.get("talk") else -26)
    ss = u.get("ss", 0)
    to = ss + u["dur"] if "dur" in u else u["to"]
    if u.get("talk"):
        iv = keep_intervals(src, ss, to)
        base_ss, dec = ss, src
        if src.endswith(".MOV"):
            # 4K de uma vez só pesa na memória com dezenas de cortes: converte antes para um intermediário 1080p quase sem perda
            dec = os.path.join(WORK, f"{u['id']}.mezz.mp4")
            if not os.path.exists(dec):
                run(["ffmpeg", "-v", "error", "-y", "-ss", str(ss), "-to", str(to), "-i", src, "-vf", "fps=30,scale=1920:1080:flags=lanczos",
                     "-c:v", "libx264", "-preset", "veryfast", "-crf", "12", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "320k", dec + ".tmp.mp4"])
                os.rename(dec + ".tmp.mp4", dec)
            base_ss = 0.0
        fc, labs = [], ""
        for i, (a, b) in enumerate(iv):
            zoom = 1.0 if i % 2 == 0 else 1.07
            z = "" if zoom == 1.0 else f",crop=iw/{zoom}:ih/{zoom},scale=1920:1080:flags=lanczos"
            fc.append(f"[0:v]trim={base_ss + a:.3f}:{base_ss + b:.3f},setpts=PTS-STARTPTS,fps=30,{vf_fit(w, h)}{z},setsar=1[v{i}]")
            fc.append(f"[0:a]atrim={base_ss + a:.3f}:{base_ss + b:.3f},asetpts=PTS-STARTPTS,aresample={SR}[a{i}]")
            labs += f"[v{i}][a{i}]"
        fc.append(f"{labs}concat=n={len(iv)}:v=1:a=1[v0][a0]")
        inputs, last = ["-i", dec], "v0"
        for k, b in enumerate(u.get("broll", [])):  # imagens de jogo por cima da fala (o áudio da fala segue)
            bs = source_for(b["src"])
            inputs += ["-ss", str(b["ss"]), "-t", str(b["dur"]), "-i", bs]
            fc.append(f"[{k + 1}:v]fps=30,scale=1920:1080:force_original_aspect_ratio=decrease:flags=lanczos,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,"
                      f"setpts=PTS-STARTPTS+{b['at']}/TB[b{k}]")
            fc.append(f"[{last}][b{k}]overlay=enable='between(t,{b['at']},{b['at'] + b['dur']})':eof_action=pass[o{k}]")
            last = f"o{k}"
        fc.append(f"[{last}]null[v]")
        fc.append(f"[a0]loudnorm=I={loud}:TP=-1.5:LRA=11,aresample={SR},aformat=channel_layouts=stereo[a]")
        fcs = os.path.join(WORK, f"{u['id']}.filter.txt")
        open(fcs, "w").write(";\n".join(fc))
        run(["ffmpeg", "-v", "error", "-y"] + inputs + ["-filter_complex_script", fcs, "-map", "[v]", "-map", "[a]"] + ENC + [out])
    else:
        d = to - ss
        if u.get("push") and w >= h:  # aproximação lenta (zoom 0 -> 7 %) direto da fonte, sem perder nitidez
            sgn = 1 if u["push"] == "in" else -1
            f0, f1 = (1.0, 1.07) if sgn > 0 else (1.07, 1.0)
            ex = f"({f0}+({f1}-{f0})*t/{d:.2f})"
            vf = f"fps=30,scale=w='1920*{ex}':h='1080*{ex}':eval=frame:flags=lanczos,crop=1920:1080,setsar=1"
        else:
            vf = f"fps=30,{vf_fit(w, h)}"
            vf = vf.replace("scale=1920:1080:force", "scale=1920:1080:flags=lanczos:force")
        fc = f"[0:v]{vf}[v];[0:a]loudnorm=I={loud}:TP=-1.5:LRA=11,aresample={SR},aformat=channel_layouts=stereo[a]"
        run(["ffmpeg", "-v", "error", "-y", "-ss", str(ss), "-t", str(d), "-i", src, "-filter_complex", fc, "-map", "[v]", "-map", "[a]"] + ENC + [out])
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
tags = [(dict(u["tag"], x=0, y=0), s + u["tag"].get("delay", 0.4)) for u, s in zip(units, starts) if u.get("tag")]
for u, s in zip(units, starts):
    for o in u.get("overlay", []):
        tags.append((o, s + o["at"]))
cmd = ["ffmpeg", "-v", "error", "-y", "-i", base, "-i", mixwav]
for t, s in tags:
    d = os.path.join(APP, "out", "yt", t["dir"])
    pat = "element-%04d.png" if os.path.exists(os.path.join(d, "element-0001.png")) else "element-%03d.png"
    cmd += ["-itsoffset", f"{s:.2f}", "-framerate", "30", "-i", os.path.join(d, pat)]
chain, last = [], "0:v"
for i, (t, s) in enumerate(tags):
    chain.append(f"[{last}][{i + 2}:v]overlay={t.get('x', 0)}:{t.get('y', 0)}:eof_action=pass:format=auto[o{i}]"); last = f"o{i}"
out = os.path.join(APP, "out", plan.get("out", "utr-youtube.mp4"))
os.makedirs(os.path.dirname(out), exist_ok=True)
cmd += (["-filter_complex", ";".join(chain), "-map", f"[{last}]"] if chain else ["-map", "0:v"])
cmd += ["-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", str(plan.get("final_crf", 17)), "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", out]
run(cmd)
print("PRONTO", out, f"{total:.1f}s")
json.dump({"starts": [round(float(x), 2) for x in starts], "ids": [u["id"] for u in units]}, open(os.path.join(WORK, "timeline.json"), "w"))
