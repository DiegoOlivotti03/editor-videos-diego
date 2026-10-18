#!/usr/bin/env bash
# Uso: ./render-reel.sh nome-do-reel   -> out/<nome>.mp4, capa e folha de conferência.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"; NOME="$1"; cd "$ROOT/app"; mkdir -p out
BROWSER=""
for b in /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell; do [ -x "$b" ] && BROWSER="--browser-executable=$b"; done
PROPS="public/$NOME/modelo.json"
npx remotion render src/index.ts Modelo "out/$NOME.mp4" --props="$PROPS" $BROWSER 2>&1 | grep -E "^\+|rror" || true
ffmpeg -v error -y -ss 1.5 -i "out/$NOME.mp4" -frames:v 1 "out/$NOME-capa.png"
ffprobe -v error -show_entries stream=width,height:format=duration -of default=nw=1 "out/$NOME.mp4"
ffmpeg -hide_banner -nostats -i "out/$NOME.mp4" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" || true
# folha de conferência: 8 quadros ao longo do vídeo
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "out/$NOME.mp4")
python3 - "$NOME" "$DUR" <<'PY'
import subprocess, sys
from PIL import Image
nome, dur = sys.argv[1], float(sys.argv[2])
ims = []
for i in range(8):
    subprocess.run(["ffmpeg","-v","error","-y","-ss",f"{dur*(i+0.5)/8:.2f}","-i",f"out/{nome}.mp4","-frames:v","1","/tmp/_fr.png"],check=True)
    ims.append(Image.open("/tmp/_fr.png").convert("RGB").resize((405,720)))
s = Image.new("RGB",(405*4,720*2))
for i,im in enumerate(ims): s.paste(im,((i%4)*405,(i//4)*720))
s.save(f"out/{nome}-conferir.png")
PY
echo "Pronto: app/out/$NOME.mp4  (confira app/out/$NOME-conferir.png)"
