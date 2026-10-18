# Instruções para o Claude neste projeto

Editor de Reels no estilo "tela dividida". Leia o README.md. Fluxo: `novo-reel.sh` -> eu escrevo `scenes/layout/highlight` a partir da fala -> `render-reel.sh` -> olho `app/out/<nome>-conferir.png` e frames soltos -> corrijo -> envio `app/out/<nome>.mp4` e a capa com SendUserFile.

Escolha dos painéis: partir do que a pessoa fala, um painel novo a cada 1,5 a 4 s, tela cheia (`panel`) no momento mais visual e só rosto (`speaker`) no momento mais emocional. Nunca inventar dado real; dizer ao usuário o que é ilustração.

## Armadilhas já resolvidas

- **Sessão em nuvem é efêmera.** O que não está no repositório some. Rodar `./setup.sh` em sessão nova.
- **Whisper** baixa o modelo de huggingface.co (precisa estar liberado em Network access). `faster-whisper` 1.2.x quebra com `av` 19: usar `av<16`.
- **Fontes** ficam em `app/public/fonts` (Archivo, carregadas por `src/modelo/fonts.ts`). Não usar `@remotion/google-fonts`: o Chromium do sandbox não confia no certificado do proxy (ERR_CERT_AUTHORITY_INVALID) e o render falha.
- **Chromium**: `render-reel.sh` usa `/opt/pw-browsers/chromium_headless_shell-*/…/headless_shell` se existir.
- Instagram não abre pelo sandbox; peça o arquivo do vídeo de referência.
- Falas e saídas ficam fora do git (`app/public/<nome>/`, `app/out/`).
