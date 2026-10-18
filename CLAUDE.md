# Instruções para o Claude neste projeto

Editor de Reels no estilo "tela dividida". Leia o README.md e docs/CONTEXTO.md (decisões de estilo, fluxo e próximos passos). Fluxo: `novo-reel.sh` -> eu escrevo `scenes/layout/highlight` a partir da fala -> `render-reel.sh` -> olho `app/out/<nome>-conferir.png` e frames soltos -> corrijo -> envio `app/out/<nome>.mp4` e a capa com SendUserFile.

Escolha dos painéis: partir do que a pessoa fala, um painel novo a cada 1,5 a 4 s, tela cheia (`panel`) no momento mais visual e só rosto (`speaker`) no momento mais emocional. Evitar painel só de texto (`bigword`): no máximo 1 a cada 4 ou 5 painéis. Preferir metáfora visual (`pie`, `timeline`, `scale`, `checklist`, `counter`, `versus`, `swap`, `chat`, `line`); se a fala não tiver imagem, usar só rosto. Humanizar com imagem real que o público conhece (escudo, bandeira, foto; `pics`), buscada na Wikipédia pela API REST `https://pt.wikipedia.org/api/rest_v1/page/summary/<Título>` com User-Agent próprio (a API de busca leva 429) e guardada em `app/public/imagens/`; pedir ao Diego fotos dele quando a fala for pessoal. Enquadramento: conferir que o queixo não corta embaixo (splitRatio 0.44, faceY 62). Evitar tela cheia de painel/só rosto; manter o rosto sempre visível. Nunca inventar dado real; dizer ao usuário o que é ilustração.

## Armadilhas já resolvidas

- **Sessão em nuvem é efêmera.** O que não está no repositório some. Rodar `./setup.sh` em sessão nova.
- **Whisper** baixa o modelo de huggingface.co (precisa estar liberado em Network access). `faster-whisper` 1.2.x quebra com `av` 19: usar `av<16`.
- **Fontes** ficam em `app/public/fonts` (Archivo, carregadas por `src/modelo/fonts.ts`). Não usar `@remotion/google-fonts`: o Chromium do sandbox não confia no certificado do proxy (ERR_CERT_AUTHORITY_INVALID) e o render falha.
- **Chromium**: `render-reel.sh` usa `/opt/pw-browsers/chromium_headless_shell-*/…/headless_shell` se existir.
- Instagram não abre pelo sandbox; peça o arquivo do vídeo de referência.
- Falas e saídas ficam fora do git (`app/public/<nome>/`, `app/out/`).

## Banco de ideias de animação (pedido do Diego)
- Quando a fala citar uma ação ou situação, ilustrar com boneco de palito animado: `kick` (jogar bola), `debate` (um acha certo, outro errado). Criar painéis novos do mesmo jeito (`Stick` em `Scenes.tsx`) para outras falas (correr, pagar conta, vender, reunião).
- Flash com som de câmera (`flashes`) em 4 a 6 viradas de impacto, não em todas.
- Imagem padronizada: camisa preta e fundo colorido via `scripts/padronizar.py` (precisa de `./setup.sh`).

## Lições do vídeo de referência (Reel de IA/Arena, analisado com o Diego)
- Painel = a coisa literal da fala (arena, página, e-mail riscado, janela de chat), não metáfora. Mascote recorrente (a Bolinha, `mascot`). Anotações desenhadas, selos, janelas com 3 pontinhos, cartões empilhando, cronômetro/HUD.
- Corte a cada ~2 s, alinhado ao início da frase. Legenda de 2 a 3 palavras em caixa alta (`captionMax: 3`, `captionUpper: true`), sem cor de destaque. Áudio da referência em -14 LUFS (o nosso sai em -16).
- Gancho nos 4 primeiros segundos com promessa; CTA com uma palavra e passos numerados (`steps`), sem inventar passo que a pessoa não falou.
- O link da referência baixa com `yt-dlp` (`pip install yt-dlp`), mesmo o Instagram.

## Fluxo de entrega e preferências do Diego (aprendido nos primeiros Reels)
- **Vídeo bruto:** o chat limita arquivo a 30 MB. O Diego sobe no Google Drive ("qualquer pessoa com o link"); baixar com `pip install gdown` e `gdown <link-da-pasta>`. Pasta ou arquivo funcionam.
- **Entrega:** o render sai grande (~50 MB); comprimir com `ffmpeg -c:v libx264 -crf 26 -preset slow -c:a copy -movflags +faststart` (fica ~13 a 18 MB) e enviar com SendUserFile junto com a capa. Dizer o que é ilustração e o que não foi conferido (não dá para ouvir o áudio nem ver o vídeo em movimento, só quadros).
- **Gostos:** natural (não artificial), rosto sempre inteiro e visível (queixo sem cortar), imagem real conhecida do público (escudo, bandeira), animação que ilustra a fala, flash com som em poucos momentos, camisa preta e fundo colorido (teste; perguntar se mantém).
- **Pontos de atenção:** `padronizar.py` leva ~8 min por 50 s de vídeo; `app/public/imagens/` fica fora do git (baixar de novo); Wikipédia: só a API REST de resumo, com User-Agent e pausa entre chamadas.
- **Pedir ao Diego** quando faltar: fotos dele nos trechos pessoais, prints de notícia, estádio/torcida; sugerir o gancho com promessa nos 4 primeiros segundos e um CTA com uma palavra só e entrega clara.
