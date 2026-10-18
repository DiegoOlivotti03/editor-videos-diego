#!/usr/bin/env bash
# Prepara o ambiente uma vez: dependências do Remotion, Whisper e o modelo de transcrição.
set -euo pipefail
cd "$(dirname "$0")/app"
command -v node >/dev/null || { echo "Instale o Node 18+"; exit 1; }
command -v ffmpeg >/dev/null || { echo "Instale o ffmpeg"; exit 1; }
npm install
# av<16: o faster-whisper 1.2.x quebra com o av 19
pip install faster-whisper "av<16"
# padronização da imagem (camisa preta + fundo): segmentação do MediaPipe e bibliotecas de GL
(apt-get install -y -q libegl1 libgles2 libgl1 >/dev/null 2>&1 || apt-get update -q >/dev/null 2>&1 && apt-get install -y -q libegl1 libgles2 libgl1 >/dev/null 2>&1) || echo "aviso: não consegui instalar libegl1 (precisa para padronizar.py)"
pip install mediapipe opencv-python-headless pillow
# baixa o modelo (precisa de acesso a huggingface.co)
python3 -c "from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8'); print('whisper ok')"
echo "Pronto."
