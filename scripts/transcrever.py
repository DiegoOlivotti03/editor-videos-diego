#!/usr/bin/env python3
"""Transcreve o vídeo JÁ CORTADO com tempo por palavra e grava captions.json.

Uso:
  python3 transcrever.py video_cortado.mp4 captions.json [--model small] [--glossario glossario.json]

Instalação (uma vez, precisa de internet para baixar o modelo):
  pip install faster-whisper
  (alternativa: pip install openai-whisper)

Saída: lista de {"text", "startMs", "endMs"} em português, uma entrada por palavra.
O glossário corrige nomes próprios que o Whisper costuma errar (IPPU, Olivote...).
"""
import json
import re
import sys


def load_glossary(path):
    if not path:
        return {}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def fix(word, glossary):
    core = re.sub(r"[^\w]", "", word, flags=re.UNICODE).lower()
    if core in glossary:
        # preserva a pontuação em volta da palavra
        m = re.match(r"^(\W*)(.*?)(\W*)$", word, flags=re.UNICODE)
        return f"{m.group(1)}{glossary[core]}{m.group(3)}"
    return word


def transcribe_faster(path, model_name, prompt):
    from faster_whisper import WhisperModel

    model = WhisperModel(model_name, compute_type="int8")
    segments, _ = model.transcribe(
        path,
        language="pt",
        word_timestamps=True,
        initial_prompt=prompt,
        vad_filter=False,
    )
    for seg in segments:
        for w in seg.words or []:
            yield w.word.strip(), w.start, w.end


def transcribe_openai(path, model_name, prompt):
    import whisper

    model = whisper.load_model(model_name)
    result = model.transcribe(path, language="pt", word_timestamps=True, initial_prompt=prompt)
    for seg in result["segments"]:
        for w in seg.get("words", []):
            yield w["word"].strip(), w["start"], w["end"]


def main():
    args = sys.argv[1:]
    if len(args) < 2:
        print(__doc__)
        sys.exit(1)
    video, out = args[0], args[1]
    model = args[args.index("--model") + 1] if "--model" in args else "small"
    glossary = load_glossary(args[args.index("--glossario") + 1] if "--glossario" in args else None)
    # O prompt inicial ajuda o Whisper a acertar a grafia de nomes próprios.
    prompt = "Diego, IPPU, franquias, empreendedorismo, faturamento, Olivote Tênis, Instagram, Reels."

    try:
        words = list(transcribe_faster(video, model, prompt))
    except ImportError:
        try:
            words = list(transcribe_openai(video, model, prompt))
        except ImportError:
            print("Nenhum Whisper instalado. Rode: pip install faster-whisper", file=sys.stderr)
            sys.exit(2)

    captions = [
        {"text": fix(t, glossary), "startMs": round(s * 1000), "endMs": round(e * 1000)}
        for t, s, e in words
        if t
    ]
    with open(out, "w", encoding="utf-8") as f:
        json.dump(captions, f, ensure_ascii=False, indent=2)
    print(f"OK: {len(captions)} palavras -> {out}")


if __name__ == "__main__":
    main()
