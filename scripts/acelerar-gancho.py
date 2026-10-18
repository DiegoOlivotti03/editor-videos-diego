#!/usr/bin/env python3
"""Acelera só o gancho (início) do vídeo, com a voz na mesma altura, e reajusta legendas e zooms.
Uso: acelerar-gancho.py <nome-do-reel> <segundos_do_gancho> [velocidade=1.2]
Rodar depois de novo-reel.sh e ANTES de padronizar.py e de escrever as cenas (os tempos mudam).
O fim do gancho é ajustado para o fim da palavra mais próxima."""
import json, subprocess, sys, os, shutil

nome, hook = sys.argv[1], float(sys.argv[2]); speed = float(sys.argv[3]) if len(sys.argv) > 3 else 1.2
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "public", nome)
mp = os.path.join(root, "modelo.json"); m = json.load(open(mp))
if "hook" in m: sys.exit("Esse reel já tem o gancho acelerado (apague modelo.json e rode novo-reel.sh de novo para refazer).")
src = os.path.join(root, os.path.basename(m["speaker"]))
# fim do gancho no fim da palavra mais próxima (sem cortar palavra ao meio)
ends = [w["endMs"] / 1000 for w in m["captions"]]
H = min(ends, key=lambda e: abs(e - hook)) + 0.04
out = os.path.join(root, "falas-ac.mp4")
fc = (f"[0:v]trim=0:{H},setpts=(PTS-STARTPTS)/{speed}[v0];[0:a]atrim=0:{H},asetpts=PTS-STARTPTS,atempo={speed}[a0];"
      f"[0:v]trim=start={H},setpts=PTS-STARTPTS[v1];[0:a]atrim=start={H},asetpts=PTS-STARTPTS[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-filter_complex", fc, "-map", "[v]", "-map", "[a]", "-r", "30",
                "-c:v", "libx264", "-crf", "16", "-preset", "fast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", out], check=True)
f = lambda t: t / speed if t <= H else H / speed + (t - H)
m["captions"] = [{**w, "startMs": round(f(w["startMs"] / 1000) * 1000), "endMs": round(f(w["endMs"] / 1000) * 1000)} for w in m["captions"]]
m["zoomCuts"] = [round(f(t), 3) for t in m["zoomCuts"]]
m["durationSeconds"] = round(float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out], capture_output=True, text=True).stdout), 3)
m["speaker"] = f"{nome}/falas-ac.mp4"; m["hook"] = {"until": round(H / speed, 3), "speed": speed, "original": os.path.basename(src)}
json.dump(m, open(mp, "w"), ensure_ascii=False, indent=1)
print(f"Gancho: 0 a {H:.2f}s do original viraram 0 a {H / speed:.2f}s ({speed}x). Duração total: {m['durationSeconds']}s. Cenas devem usar a nova linha do tempo.")
