#!/usr/bin/env bash
# Uso: scripts/voz-podcast.sh entrada.mp4 saida.mp4
# Trata só o áudio (vídeo copiado): corta grave de rumble, reduz ruído de fundo, dá corpo e presença,
# comprime para o volume ficar constante e nivela em -15 LUFS (o render final fica perto de -14 com o clique).
set -euo pipefail
[ $# -ge 2 ] || { echo "Uso: $0 entrada.mp4 saida.mp4"; exit 1; }
ffmpeg -v error -y -i "$1" -map 0:v -map 0:a -c:v copy -c:a aac -b:a 192k -af \
"highpass=f=80,afftdn=nr=12:nf=-40,equalizer=f=110:t=h:w=100:g=3,equalizer=f=280:t=q:w=1:g=-2,equalizer=f=3500:t=q:w=1:g=2.5,equalizer=f=9000:t=h:w=2000:g=1.5,deesser=i=0.25,acompressor=threshold=-21dB:ratio=3:attack=8:release=140:makeup=4,alimiter=limit=0.9,loudnorm=I=-15:TP=-1.5:LRA=7" "$2"
for f in "$1" "$2"; do printf "%s -> " "$(basename "$f")"; ffmpeg -hide_banner -nostats -i "$f" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|LRA|Peak):" | tr -s ' \n' ' '; echo; done
