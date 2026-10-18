# Contexto do projeto (resumo da conversa de criação)

Resumo para uma sessão nova continuar sem perguntar tudo de novo. Sem números de negócio de propósito
(o repositório pode estar público). Dados de vendas e métricas se consultam pelos conectores quando preciso.

## Objetivo
Ferramenta para editar Reels do @diegoolivotti no formato "tela dividida": a pessoa fala embaixo, painéis
animados em cima, legenda em caixa preta. Referência: um Reel de IA/skills de outro criador, que o Diego validou.

## Estilo validado (copiado do vídeo-modelo)
- Fundo do painel cinza quente `#EBEBE6`, destaque laranja `#E8452C`, fonte Archivo.
- Tela dividida com degradê na emenda. Aqui a divisão é 47/53 (o modelo usa 51/49) porque o Diego grava em
  close de rosto; com 51/49 o queixo corta.
- Legenda: caixa preta de cantos redondos, texto branco, palavra-chave em laranja, as palavras entram conforme são ditas.
- Três layouts com transição deslizando (~0,5 s, sem quicar): `split`, `panel` (só animação, pessoa sai),
  `speaker` (só o rosto, painel sai). A legenda desce junto e fica em ~68 a 70% da altura nos modos de tela cheia.
- Painéis são mini-cenas animadas feitas pelo assunto da fala (calendário, boleto, barras, gráfico, cartões, texto grande).
- Zoom alternado nos cortes de silêncio, aproximação lenta ao longo do vídeo, whoosh baixinho nas trocas, áudio em -16 LUFS.
- Sem música dentro do arquivo (decisão: a voz é o produto; se quiser música, aplicar no app do Instagram a 5 a 10%).

## Fluxo combinado
1. Diego manda o vídeo bruto (e o roteiro, se tiver). 2. `./novo-reel.sh` corta e transcreve.
3. Claude escreve `scenes`, `layout` e `highlight` a partir da fala e avisa o que é ilustração. 4. `./render-reel.sh`.
5. Claude confere os quadros e envia mp4 + capa. 6. Ajustes. 7. Opcional: rascunho no Metricool (nunca publicar direto).

## Limites do ambiente (ver CLAUDE.md)
Sessão em nuvem é efêmera; Whisper precisa de huggingface.co liberado; fontes são locais; Instagram não abre pelo sandbox;
o ambiente não cria repositórios no GitHub (o Diego cria e anexa).

## Estratégia de CTA e lead (conversa de análise do perfil)
- O modelo faz CTA "comenta PALAVRA" e manda a skill no direct. Para o perfil do Diego: uma oferta e uma palavra por vídeo,
  dizendo claramente o que a pessoa recebe. Teste anterior ("Comenta IA aí que vou te chamar") não prometia nada concreto.
- Perguntas de opinião ("Concorda?", "Justo?") geram comentário de opinião, não lead.
- Conteúdo hoje espalhado (política, frases, notícia, tênis, IA): escolher um eixo para quem chega saber por que seguir.
- Escada de ofertas sugerida: TÊNIS (convite/ingresso da próxima etapa do Olivotti Tênis), IA (skill ou modelo pronto para
  empresário, depois pacote/workshop/implantação), FRANQUIA (checklist de expansão, depois conversa comercial).
- Automação comentário-para-DM por ferramenta que use a API oficial da Meta (ex.: ManyChat); confirmar regras atuais da Meta e LGPD no DM.

## Próximos passos
- Cartão de CTA no editor: fecha o vídeo só com o rosto e a palavra grande na tela ("COMENTA TÊNIS").
- Texto do DM de cada oferta.
- Puxar idade, gênero e cidade dos seguidores (Metricool) para confirmar se o público é de empresários.
- Tornar o repositório privado.
