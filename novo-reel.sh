#!/usr/bin/env bash
# Uso: ./novo-reel.sh video_bruto.mp4 nome-do-reel
# Corta silêncios, transcreve e cria app/public/<nome>/modelo.json (sem painéis ainda).
set -euo pipefail
[ $# -ge 2 ] || { echo "Uso: $0 video_bruto.mp4 nome-do-reel"; exit 1; }
ROOT="$(cd "$(dirname "$0")" && pwd)"; VIDEO="$(realpath "$1")"; NOME="$2"
DIR="$ROOT/app/public/$NOME"; mkdir -p "$DIR"
node "$ROOT/scripts/cortar-silencios.mjs" "$VIDEO" "$DIR/falas.mp4"
python3 "$ROOT/scripts/transcrever.py" "$DIR/falas.mp4" "$DIR/captions.json" --model small --glossario "$ROOT/assets/glossario.json"
python3 - "$DIR" "$NOME" <<'PY'
import json, sys
d, nome = sys.argv[1:3]
cuts = json.load(open(f"{d}/falas.cuts.json")); caps = json.load(open(f"{d}/captions.json"))
json.dump({
  "speaker": f"{nome}/falas.mp4", "durationSeconds": cuts["duration"], "fps": 30,
  "splitRatio": 0.47, "faceY": 40, "captions": caps, "highlight": [],
  "scenes": [], "layout": [{"from": 0, "mode": "split"}],
  "zoomCuts": cuts["joints"], "zoomLevel": 1.04, "sfx": False,
}, open(f"{d}/modelo.json", "w"), ensure_ascii=False, indent=1)
PY
echo; echo "Pronto: app/public/$NOME/modelo.json. Falta preencher 'scenes', 'layout' e 'highlight' (veja README.md)."
python3 -c "import json;print(' '.join(w['text'] for w in json.load(open('$DIR/captions.json'))))"
