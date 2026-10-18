#!/usr/bin/env python3
"""Padroniza a imagem da pessoa: camisa preta, fundo colorido em degradê e exposição estável.
Uso: padronizar.py entrada.mp4 saida.mp4 [--frame T] [--cor1 E8452C] [--cor2 7A1608] [--camisa 0.28]
Com --frame T só grava um PNG de teste daquele instante (saida.png)."""
import argparse, os, subprocess, sys, urllib.request
import cv2, numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mpp
from mediapipe.tasks.python import vision

MODELO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "modelos", "selfie_multiclass_256x256.tflite")
URL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite"

def hex2bgr(h):
    h = h.lstrip("#"); return np.array([int(h[4:6], 16), int(h[2:4], 16), int(h[0:2], 16)], np.float32)

def fundo(w, h, c1, c2):
    """Degradê diagonal com um brilho suave atrás da cabeça."""
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    t = np.clip((ys / h) * 0.75 + (xs / w) * 0.25, 0, 1)[..., None]
    bg = c1 * (1 - t) + c2 * t
    r = np.sqrt(((xs - w * 0.5) / (w * 0.7)) ** 2 + ((ys - h * 0.42) / (h * 0.42)) ** 2)[..., None]
    return np.clip(bg * (1 + 0.22 * np.clip(1 - r, 0, 1)), 0, 255)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("entrada"); ap.add_argument("saida")
    ap.add_argument("--frame", type=float); ap.add_argument("--cor1", default="E8452C"); ap.add_argument("--cor2", default="7A1608")
    ap.add_argument("--camisa", type=float, default=0.28, help="brilho da camisa (0 = preto total)")
    a = ap.parse_args()
    if not os.path.exists(MODELO):
        os.makedirs(os.path.dirname(MODELO), exist_ok=True); urllib.request.urlretrieve(URL, MODELO)
    seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
        base_options=mpp.BaseOptions(model_asset_path=MODELO), output_confidence_masks=True, output_category_mask=False))
    pr = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate", "-of", "csv=p=0", a.entrada], capture_output=True, text=True).stdout.strip().split(",")
    W, H = int(pr[0]), int(pr[1]); num, den = pr[2].split("/"); fps = float(num) / float(den)
    bg = fundo(W, H, hex2bgr(a.cor1), hex2bgr(a.cor2))
    ema = [None]

    def processa(rgb_bgr):
        small = cv2.cvtColor(cv2.resize(rgb_bgr, (512, 512 * H // W), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2RGB)
        res = seg.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=small))
        cm = [np.asarray(m.numpy_view(), np.float32) for m in res.confidence_masks]
        pessoa = 1 - cm[0]
        camisa = cm[4]
        up = lambda m: cv2.resize(m, (W, H), interpolation=cv2.INTER_CUBIC)
        p = np.clip(up(pessoa), 0, 1)
        p = np.clip((p - 0.45) / 0.35, 0, 1)                      # borda mais firme
        p = cv2.GaussianBlur(cv2.erode(p, np.ones((5, 5), np.uint8)), (0, 0), 3)[..., None]
        s = np.clip(up(camisa), 0, 1)
        s = np.clip((s - 0.4) / 0.3, 0, 1)
        s = cv2.GaussianBlur(cv2.dilate(s, np.ones((7, 7), np.uint8)), (0, 0), 2)[..., None]
        img = rgb_bgr.astype(np.float32)
        lum = (img @ np.array([0.114, 0.587, 0.299], np.float32))[..., None]
        preta = np.repeat(np.clip(lum * a.camisa * 0.9 + 6, 0, 255), 3, axis=2)
        img = img * (1 - s) + preta * s
        # exposição estável: leva a luminosidade média da pessoa para ~125 (suavizado entre quadros)
        m = float((lum * p).sum() / max(1.0, p.sum()))
        ema[0] = m if ema[0] is None else 0.9 * ema[0] + 0.1 * m
        ganho = float(np.clip(125.0 / max(ema[0], 1.0), 0.8, 1.25))
        img = np.clip(img * ganho, 0, 255)
        return np.clip(img * p + bg * (1 - p), 0, 255).astype(np.uint8)

    if a.frame is not None:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(a.frame), "-i", a.entrada, "-frames:v", "1", "/tmp/_pad_frame.png"], check=True)
        cv2.imwrite(a.saida if a.saida.endswith(".png") else a.saida + ".png", processa(cv2.imread("/tmp/_pad_frame.png")))
        return
    rd = subprocess.Popen(["ffmpeg", "-v", "error", "-i", a.entrada, "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], stdout=subprocess.PIPE)
    wr = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-", "-i", a.entrada,
                           "-map", "0:v", "-map", "1:a?", "-c:v", "libx264", "-crf", "16", "-preset", "fast", "-pix_fmt", "yuv420p", "-c:a", "copy", "-shortest", a.saida], stdin=subprocess.PIPE)
    n = 0
    while True:
        buf = rd.stdout.read(W * H * 3)
        if len(buf) < W * H * 3: break
        wr.stdin.write(processa(np.frombuffer(buf, np.uint8).reshape(H, W, 3)).tobytes()); n += 1
        if n % 150 == 0: print(f"{n} quadros", flush=True)
    wr.stdin.close(); wr.wait(); print(f"OK: {n} quadros -> {a.saida}")

if __name__ == "__main__":
    main()
