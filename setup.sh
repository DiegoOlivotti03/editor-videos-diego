#!/usr/bin/env bash
# Prepara o ambiente uma vez: dependências do Remotion, Whisper e o modelo de transcrição.
set -euo pipefail
cd "$(dirname "$0")/app"
command -v node >/dev/null || { echo "Instale o Node 18+"; exit 1; }
command -v ffmpeg >/dev/null || { echo "Instale o ffmpeg"; exit 1; }
npm install
# av<16: o faster-whisper 1.2.x quebra com o av 19
pip install faster-whisper "av<16"
# baixa o modelo (precisa de acesso a huggingface.co)
python3 -c "from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8'); print('whisper ok')"
echo "Pronto."
