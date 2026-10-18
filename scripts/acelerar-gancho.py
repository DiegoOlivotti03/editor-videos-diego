#!/usr/bin/env python3
"""Acelera só o trecho do gancho, com a voz na mesma altura, e reajusta legendas e zooms.
Uso: acelerar-gancho.py <nome-do-reel> <inicio_s> <fim_s> [velocidade=1.2]
Rodar depois de novo-reel.sh e ANTES de padronizar.py e de escrever as cenas (os tempos mudam).
Início e fim são ajustados para o fim da palavra mais próxima (início 0 = começo do vídeo)."""
import json, subprocess, sys, os

nome, ini, fim = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]); speed = float(sys.argv[4]) if len(sys.argv) > 4 else 1.2
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "public", nome)
mp = os.path.join(root, "modelo.json"); m = json.load(open(mp))
if "hook" in m: sys.exit("Esse reel já tem o gancho acelerado (rode novo-reel.sh de novo para refazer).")
src = os.path.join(root, os.path.basename(m["speaker"]))
ends = [w["endMs"] / 1000 for w in m["captions"]]
near = lambda t: min(ends, key=lambda e: abs(e - t)) + 0.04
A = 0.0 if ini <= 0 else near(ini); B = near(fim)
out = os.path.join(root, "falas-ac.mp4")
parts = [(0, A, 1.0), (A, B, speed), (B, None, 1.0)]; parts = [p for p in parts if p[1] is None or p[1] > p[0] + 0.01]
fc, ins = [], []
for i, (a, b, sp) in enumerate(parts):
    trim = f"trim=start={a}" + (f":end={b}" if b is not None else "")
    atrim = f"atrim=start={a}" + (f":end={b}" if b is not None else "")
    fc.append(f"[0:v]{trim},setpts=(PTS-STARTPTS)/{sp}[v{i}];[0:a]{atrim},asetpts=PTS-STARTPTS" + (f",atempo={sp}" if sp != 1.0 else "") + f"[a{i}]")
    ins.append(f"[v{i}][a{i}]")
fc.append("".join(ins) + f"concat=n={len(parts)}:v=1:a=1[v][a]")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-filter_complex", ";".join(fc), "-map", "[v]", "-map", "[a]", "-r", "30",
                "-c:v", "libx264", "-crf", "16", "-preset", "fast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", out], check=True)
f = lambda t: t if t <= A else (A + (t - A) / speed if t <= B else A + (B - A) / speed + (t - B))
m["captions"] = [{**w, "startMs": round(f(w["startMs"] / 1000) * 1000), "endMs": round(f(w["endMs"] / 1000) * 1000)} for w in m["captions"]]
m["zoomCuts"] = [round(f(t), 3) for t in m["zoomCuts"]]
m["durationSeconds"] = round(float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out], capture_output=True, text=True).stdout), 3)
m["speaker"] = f"{nome}/falas-ac.mp4"; m["hook"] = {"from": round(A, 3), "until": round(A + (B - A) / speed, 3), "speed": speed, "original": os.path.basename(src)}
json.dump(m, open(mp, "w"), ensure_ascii=False, indent=1)
print(f"Gancho original {A:.2f}-{B:.2f}s virou {m['hook']['from']}-{m['hook']['until']}s ({speed}x). Duração total: {m['durationSeconds']}s.")
