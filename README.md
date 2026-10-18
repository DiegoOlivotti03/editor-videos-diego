# Editor de Reels (estilo tela dividida)

Pessoa falando embaixo, painéis animados em cima, legenda em caixa preta com palavra-chave em laranja.
Layouts: tela dividida, só o painel, só a pessoa, com transição deslizando entre eles. Feito com Remotion + ffmpeg + Whisper.

## Uso

```bash
./setup.sh                                   # uma vez
./novo-reel.sh video_bruto.mp4 meu-reel      # corta silêncio, transcreve, cria app/public/meu-reel/modelo.json
# preencher scenes / layout / highlight em app/public/meu-reel/modelo.json
./render-reel.sh meu-reel                    # app/out/meu-reel.mp4 + capa + folha de conferência
npm --prefix app run studio                  # (opcional) pré-visualizar no navegador
```

## Padronizar a imagem (camisa preta + fundo colorido)

```bash
python3 scripts/padronizar.py app/public/meu-reel/falas.mp4 app/public/meu-reel/falas-pad.mp4   # ~8 min para 50 s
# depois: "speaker": "meu-reel/falas-pad.mp4" no modelo.json
python3 scripts/padronizar.py falas.mp4 teste.png --frame 20   # só um quadro de teste (segundos)
```
Opções: `--cor1/--cor2` (degradê do fundo, padrão laranja da marca), `--camisa` (brilho da camisa). Também nivela a exposição entre gravações de lugares diferentes.

## modelo.json

| campo | o que é |
|---|---|
| `speaker` | `<nome>/falas.mp4` (gerado) |
| `splitRatio` | altura do painel na tela dividida (0.47; o modelo usa 0.51, mas close de rosto pede menos) |
| `faceY` | enquadramento vertical da pessoa, 0 a 100 (62 com splitRatio 0.44 mostra o queixo inteiro em selfie de perto) |
| `highlight` | palavras da legenda que ficam laranja |
| `layout` | `[{ "from": seg, "mode": "split" \| "speaker" \| "panel" }]`; o primeiro vale desde 0 |
| `scenes` | painéis animados (abaixo) |
| `flashes` | instantes (s) com flash branco e som de câmera (`sfx/flash.wav`) |
| `zoomCuts` | instantes do zoom alternado (vêm dos cortes de silêncio) |

### Painéis (`scenes`): `{ kind, from, to, label, data }`, tempos em segundos do vídeo já cortado

- `bigword`: `data.lines: [{text, accent?}]`, `data.size`
- `duo`: `data.items: [{value, at}]` (cartões que entram no instante `at`)
- `calendar`: `data.month, firstWeekday (0=domingo), days, mark, at`
- `boleto`: `data.strikeAt, youAt`
- `bars`: `data.at, data.targets?` (barras que caem)
- `line`: gráfico descendo
- `question`: `data.items: [{value, at}], data.qAt`
- `pie`: `data.value` (0-100), `at`, `caption: [linhas]` (rosca que enche e conta o número)
- `timeline`: `data.steps: [{label, at}]` (linha do tempo, cada marco acende em `at`)
- `scale`: `data.left, right, at` (balança que vira para o lado de `right` em `at`)
- `checklist`: `data.items: [{text, at}]` (itens marcados um a um)
- `counter`: `data.from, to, at, caption?, prefix?, suffix?` (número que conta)
- `versus`: `data.left, right, at, symbol?` (dois cartões com "=" ou "VS" no meio)
- `swap`: `data.from, to, at` (palavra riscada e substituída)
- `pics`: `data.items: [{src, at, label?, frame?}], badge?: {text, at}, height?` (imagens reais de `app/public/imagens/`: escudo, bandeira, foto)
- `kick`: dois bonecos passando a bola (`data.period?`)
- `debate`: dois bonecos, um aprova e outro reprova (`data.at, at2`)
- `chat`: `data.comment, at, reply, replyAt` (comentário que recebe a resposta no direct)

Exemplo completo: `exemplos/modelo.exemplo.json`. Para criar um painel novo, adicione o componente em `app/src/modelo/Scenes.tsx` e o `kind` em `types.ts`.

## Regras de edição

- Algo novo na tela a cada 3 a 4 s. Painéis em tela cheia e só-rosto servem para dar respiro e ênfase.
- A legenda precisa ficar dentro da zona segura (topo 270 px e rodapé 480 px livres no Instagram).
- Números e fatos nos painéis são ilustração; confira com o autor antes de publicar.
- Voz em primeiro lugar: áudio em -16 LUFS, som de transição bem baixo, sem música no arquivo.
