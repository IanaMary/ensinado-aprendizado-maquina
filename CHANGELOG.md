# Changelog — Iana / H2IA Tutor

Histórico de deploys em produção (`https://absapt.tk/h2ia/`). Formato inspirado em
[Keep a Changelog](https://keepachangelog.com); datas em AAAA-MM-DD. Cada entrada cita os
commits (frontend/backend) e o bundle publicado. Fonte: `CLAUDE.md` → _Historical Production Reference_.

> Frontend: `IanaMary/ensinado-aprendizado-maquina` · Backend: `IanaMary/ensinado-aprendizado-maquina-back`.

---

## 2026-06-23

### Voltar no topo da página; Sair só no menu do usuário. Front `9db1772` (bundle `main-P3H2XFKI.js`) · só frontend
- Botão **Voltar** removido da barra lateral e colocado no **cabeçalho da área de trabalho** (topo
  da página), indo para o painel de entrada (`/inicio`). **Sair** fica só no menu do usuário (sem
  duplicar). Build OK + 106/106.

### Barra do pipeline (overflow/cabeçalho/Voltar-Sair) + painel de entrada do aluno. Front `ccb9ce9` (bundle `main-GDRJBBKX.js`) · só frontend
- **Barra do pipeline (modo clássico):** os cards das etapas **não vazam mais** para fora da barra
  (`flex-wrap:nowrap` no override de `.opcoesPipeline` + `overflow-x:hidden` em `.pipeline-content`)
  e o cabeçalho "Pipeline" acomoda os 4 ícones de ação sem cortar (padding/gap menores, rótulo
  trunca). **Voltar/Sair** movidos para o **topo** da barra.
- **Preditores arrastáveis:** `habilitadarModelos` não desabilita mais **todos** os modelos quando
  ainda não há target definido — destrava o arrasto do preditor.
- **Painel de entrada do aluno (`/inicio`):** **menu do usuário** (avatar + sair) e **listagem dos
  projetos salvos** (abrir no modo clássico via `?pipeline=`, excluir). Diagnóstico de overflow/drag
  por review multi-agente. Build OK + 106/106 testes.

### Correções da comparação de preditores (review adversarial). Front `2efff9b` (bundle `main-PZEUSF3L.js`) · só frontend
- Review multi-agente da feature de comparação encontrou e corrigiu: **cancelar (X)** a adição de
  um 2º preditor não polui mais o estado (commit passa a depender do que foi **treinado**, não do
  fechamento; modelo/avaliações anteriores preservados; card não treinado descartado); o
  **`modeloSelecionado`** só aponta para modelos treinados (sem "modelo fantasma" no tutor/export/chat);
  arrastar um preditor de **categoria incompatível** remove o card órfão da lane; o **"×"** só aparece
  com 2+ modelos; `removerItemExecucao` casa por `valor`+`tipoItem`; chat do drawer não corta o input
  em telas baixas; telemetria coerente. Build OK + 106/106 testes.

### Remover preditor da comparação. Front `6db26b2` (bundle `main-6GMZWT4I.js`) · só frontend
- Botão **"×"** em cada card da lane de treino: remove o resultado do modelo, tira o card da lane
  (devolvendo o preditor à barra lateral) e **recalcula a comparação** com os modelos restantes.
  Novo `DashboardService.removerItemExecucao`. Build OK + 106/106 testes.

### Comparação de múltiplos preditores na janela principal. Front `7e35c63` (bundle `main-GASKTKNH.js`) · só frontend
- Na área de trabalho clássica, depois de treinar um preditor é possível **arrastar outro da mesma
  categoria** (classificação/regressão/agrupamento) para a lane de treino: abre o modal como **cópia
  do pipeline** na etapa de seleção (ajusta os hiperparâmetros do novo; incompatíveis desabilitados)
  → treina → métricas (as **mesmas já marcadas**, editáveis) → a **comparação aparece no painel de
  métricas e gráficos** (tabela métrica×modelo + gráficos lado a lado). Suporta **N modelos**.
- Implementação **só de orquestração** (`execucoes.component.ts`): acumula modelos em
  `resultadoTreinamento` (merge) + `modelosSelecionados`, abre o 2º+ em `selecao-modelo` e re-roda a
  avaliação para todos os modelos, auto-abre ao arrastar, guarda de mesma categoria, persistência.
  Reusa `tipos-classificadores`, `classificador`, `metrica-avaliacao` (já multi-modelo) e o endpoint
  `avaliar_modelos`. **Backend inalterado.** Verificação: build de produção OK + **106/106** testes.

### Refino de layout: barra da trilha, gaveta do tutor e etapas do modal. Front `6c5fc53` (bundle `main-PT65DMTB.js`) · só frontend
- **Barra esquerda (trilha):** itens de todas as etapas ficam **uniformes e ocupam a largura
  toda** (sem estouro; botão de info contido) — `.pipeline-item` com `width:100%`+`box-sizing`
  e `.pipeline-container .opcoesPipeline` em coluna (corrige Dados/Modelos/Métricas menores que
  a barra). **Sub-grupos colapsáveis** (pré-proc, métricas, supervisionado/não-supervisionado),
  auto-colapsando grupos com todos os itens desabilitados.
- **Gaveta do tutor (modal + área de trabalho):** o **chat fica fixo na base**; o conteúdo
  contextual rola e, se estourar a tela, fica acessível por **barra de rolagem**.
- **Modal pré-processamento:** removido o texto "(indisponível)" (estado já indicado por
  desabilitado/ícone/tooltip); ícone de adição com largura fixa e rótulo truncado → **texto não
  sobrepõe mais o botão**.
- **Modal de modelos:** **hiperparâmetros aparecem logo abaixo do grupo do modelo selecionado**;
  **grupos de preditores colapsáveis**, auto-colapsando os totalmente incompatíveis.
- Verificação: build de produção OK + **106/106** testes.

### Tutor drawer na área de trabalho, itens da trilha e correção do seletor de LLM. Front `1697078` (bundle `main-4XBKEVN2.js`) · Back `9b3bac5`
- **Workspace:** o painel do tutor da área de trabalho (`execucoes`) virou **drawer lateral** que desliza da direita (FAB centralizado na altura, conteúdo em cima, chatbot embaixo), espelhando o modal. Corrigida a **sobreposição de textos no chat** (`app-chat-tutor` renderizava o host como `inline` → `:host { display: block }`).
- **Seletor de LLM (conf-tutor):** corrigido o **422 ao trocar o modelo** — era colisão de rota (`PUT /tutor/{id}` de `tutor.py` capturava `PUT /tutor/modelo`); `chat_tutor.router` passou a ser registrado **antes** de `tutor.router` (+ teste de regressão). UX: enquanto o teste de saúde roda, a seleção fica **bloqueada com barra de progresso**; concluído, os modelos aparecem em **Ativos** e **Inativos** (recolhido).
- **Trilha (itens do pipeline):** o layout de `.pipeline-item` (Dados/Pré-processamento/Modelos/Avaliação) estava sem estilo — as regras viviam com escopo do `pipeline.component` e não alcançavam os componentes-filhos (encapsulation), só a borda global aplicava. Movido para o **`styles.scss` global** (mesmo visual do `item-card`: ícone em caixa + rótulo + ℹ️ à direita), eliminando o empilhamento/sobreposição.
- Verificação: backend **290 passed** (1 skipped); frontend **106/106** + build de produção OK.

### Artefatos por usuário + UX do modal. Front `fe4ce52` (bundle `main-A7ZA3RLS.js`) · Back `262bab9`
- **Backend:** runs do MLflow **associadas ao usuário** (coleção `mlflow_runs`); `GET /tutor/artefatos` lista por **usuário** e **data** (admin/professor). `get_run_summary` consolidado. `pytest`: 289 passed.
- **Admin:** tela `/view-admin/artefatos` reescrita como **tabela de runs** (usuário/data/paginação) → clica e vê o resumo; fim da busca por `run_id` "no escuro".
- **Modal:** tutor virou **drawer lateral** (FAB centralizado na altura; conteúdo em cima, chatbot embaixo); **ℹ️ por item** (métricas/modelos/pré-proc) abre a explicação no tutor e o chat fica ciente do item; etapa de métricas em **2 colunas com subcards** (alinhamento + ícone corrigidos, inline removido); **scroll volta ao topo** ao trocar de etapa; cabeçalho fixo da tabela de atributos sem overlap. Front: **106/106**.

### Corrigido — Endpoint de artefatos do MLflow (backend-only). Back `60198bb`
- `GET /tutor/artefatos/{run_id}` reimplementado (era um stub): resumo de run do MLflow 3.x (params/metrics/tags + artefatos com recursão), com **503** (MLflow não configurado), **400** (run_id inválido/longo), **404** (run inexistente). Os 4 testes de `tests/test_artefatos.py` (antes rotulados "falhas de MLflow") eram, na verdade, **testes obsoletos de uma feature removida** — agora passam contra código real. API verificada contra MLflow 3.14. **Suíte do backend: 282 passed, 0 failed** (1 skipped). Sem mudança de frontend.

### Limpeza — `exigir_admin_ou_professor` consolidado (backend-only). Back `28b413c`
- As 3 cópias idênticas do gate (em `conf_pipeline`/`atividade`/`tutor`) foram unificadas num único helper em `app/security.py`. Comportamento inalterado (282 passed). Sem mudança de frontend.

### Enhancement — Modelos logados no resumo de artefatos (backend-only). Back `85d1e8d`
- `GET /tutor/artefatos/{run_id}` agora inclui uma chave **`models`** com os modelos logados da run (no MLflow 3.x os modelos viraram entidades `LoggedModel` e não aparecem mais em `list_artifacts`). Busca via `search_logged_models` (filtro `source_run_id`, com fallback + filtro em Python) e degradação graciosa. **Suíte: 285 passed.** Sem mudança de frontend.

### UI — Tela admin de artefatos do MLflow (frontend). Front `09055c9` (bundle `main-VEB2T2R6.js`)
- Nova tela admin **`/view-admin/artefatos`** (card no painel) que consome `GET /tutor/artefatos/{run_id}`: busca por `run_id` e exibe status/período, parâmetros, métricas, tags, artefatos e **modelos logados** (com seus artefatos). Trata 503 (MLflow não configurado), 404 e 400 com mensagens amigáveis. `ArtefatosService` dedicado + specs. Frontend **104/104**.

### Configuração de produção — MLflow ativado (não-código)
- Definido `MLFLOW_TRACKING_URI=sqlite:////home/ubuntu/mlflow/mlflow.db` no `.env` do backend da VM; experimento **`iana-treinamento`** com artefatos em `file:///home/ubuntu/mlflow/artifacts`; serviço reiniciado. Treino/avaliação agora **logam runs no MLflow** e o endpoint/tela de artefatos ficam funcionais (não mais 503). Validado ponta a ponta. Store SQLite local, sem porta exposta. (Configuração de servidor; sem mudança de código.)

---

## 2026-06-22

### Adicionado — Telemetria de atividades dos usuários
- Registro da jornada do aluno em `db.atividade_usuario` (ações do pipeline, navegação, chamadas HTTP, erros e uso do tutor) com duração das ações ("tempo preso"). Tela admin/professor em `/atividades` (filtros, paginação, cards de resumo). Front `0a4c7b4` (bundle `main-XMEH6BLD.js`) · Back `9379cf5`.
- Chat: evento canônico no backend com **resumo compacto** (preview + tamanho, sem conteúdo completo) e status `sucesso`/`erro`/`interrompido`; o histórico completo segue em `db.historico_chat`.
- Retenção: índice **TTL** em `atividade_usuario` (env `ATIVIDADE_TTL_DIAS`, default 90 dias); acesso restrito a admin/professor. Política em `CLAUDE.md`.

### Infra
- venv do backend reconstruída com **Python 3.12** (3.13 removido do sistema). `pytest`: 261 passed (5 falhas pré-existentes — 4 MLflow + 1 `test_tutor`).

### Melhorias — Telemetria (P2). Front `502fb4a` (bundle `main-YCVLMARW.js`) · Back `a03e574`
- Backend: validação do `EventoAtividade` (enums `tipo`/`status`, faixas de `duracao_ms`, ISO; **422** em abuso); `GET /atividades` não conta por página (`incluir_total`); `/resumo` em um único `$facet`; truncamento de `detalhes` por campo (preserva estrutura). `pytest`: 270 passed.
- Frontend: interceptor amostra GETs 2xx (25%, sempre logando mutações e erros) e deduplica navegação; `flush` re-tenta só em erro transitório (descarta 4xx); paginação reaproveita o total; `treine-robo` registra `previu`/`desafio_palpite`. 99 testes.

### Análise & UX (P2/P3). Front `ac3de3f` (bundle `main-SWV5IFX5.js`) · Back `d681ae9`
- Backend: rate-limit da ingestão por usuário/janela (`ATIVIDADE_RATE_MAX`/`_WINDOW`; excesso → 429); `GET /atividades/tempo-preso` (ranking de ações por duração média/máx + taxa de erro). `pytest`: 274 passed.
- Frontend: tela do professor/admin com seletor de usuário, **Exportar CSV**, **auto-atualização** (30s), acessibilidade (caption/scope, `aria-live`, badges rotulados), painel **"Onde os alunos demoram/travam"** e atalho **"Ver jornada"**. Acesso de `professor` à tela já liberado no lote anterior.

### Correção — Editor de conteúdo do tutor (backend-only). Back `afa55bb`
- Os PUT de conteúdo do tutor descartavam campos por uma `Union` de Pydantic "lossy" (caía no `Contexto` genérico) → `400 "Nenhum campo para atualizar"`. `PUT /tutor/{id}` agora usa contexto livre (Dict); `/editar-modelos` e `/editar-tipo-aprendizado` usam o modelo tipado de seleção (preservando `supervisionado`/`texto_pipe`).
- **Segurança:** escrita do conteúdo do tutor restrita a **admin/professor** (antes qualquer autenticado podia escrever). `pytest`: 278 passed (só 4 falhas pré-existentes de MLflow). Sem mudança de frontend.

---

## 2026-06-21

### Documentação
- Documentação completa do projeto atualizada (`docs/DOCUMENTACAO.md` + PDF) — inclui Léo no Mundo Real, Desafiar o Léo, missão Cachorros e WebGPU/câmera. Front `b4a0658` · Back `bfdd923`.
- Adicionado este `CHANGELOG.md`.

---

## 2026-06-20 — Léo no Mundo Real (classificação de imagens no navegador)

### Added
- **Léo no Mundo Real** (`/leo-mundo-real`, 4º card no `/inicio`): a criança cria categorias, sobe/tira fotos e o Léo aprende por **transfer learning 100% no navegador** (MobileNet + KNN, TF.js), prevendo a categoria de uma foto nova, com barras de confiança, placar e a lição "a IA só sabe o que ensinamos". **Sem backend.** Front `81dc1c0` · bundle `main-BKBSFI7T.js`.
- **WebGPU** com fallback automático para WebGL/CPU (chip na topbar mostra o motor ativo). Front `7e69844` · bundle `main-IQ5AQN7L.js`.
- **Câmera ao vivo** (`getUserMedia`) — botão "📷 Tirar foto" (desktop e celular; exige HTTPS), com "🖼️ Da galeria" como alternativa. Front `fb7b7f3` · bundle `main-NPDWV6GI.js`.

### Notas
- TF.js isolado no **chunk lazy** da rota (bundle inicial inalterado); modelo MobileNet (~16 MB) baixado em runtime na 1ª visita.

---

## 2026-06-20 — Treine seu Robô: Desafiar o Léo + Cachorros; fix Trilha

### Added
- **"🎲 Desafiar o Léo"** (criança × robô): após treinar um dataset de classificação, deck de 5 exemplos reais; a criança chuta a categoria e o robô responde com o **modelo real** (`POST /classificador/prever`); placar 🧒×🤖.
- **Missão 🐶 Cachorros** (regressão altura→peso): pontos viram emojis de cachorro que crescem com o valor previsto, com a reta de tendência por cima. Dataset lúdico **`gen_cachorro`** no backend (`b415d65`).

### Fixed
- **Trilha**: `.bus-slot.add` (span vazio do barramento) virou pseudo-elemento `::after` — mesmo alinhamento, sem nó vazio no DOM.

Front `ee9c092` · bundle `main-K22OL6D6.js` · Back `b415d65`.

---

## 2026-06-20 — Correções do tutor

### Fixed
- **Histórico do chat (500)**: os endpoints usavam `usuario["id"]` (inexistente) → `KeyError`; trocado por `_id`. Back `13da397` (+ teste de regressão).

### Changed
- **Chat compacto** no painel do tutor (rola junto com o conteúdo; ocupa menos espaço). Front `d270664` · bundle `main-WQCLDCK5.js`.

---

## 2026-06-19 — Conteúdo didático verificado + aba Básico + base de conhecimento no chatbot

### Added
- Campo **`conteudo.resumo_basico`** (aba **Básico** em linguagem simples; **Avançado** mantém descrição técnica + fórmula + hiperparâmetros). Front `520e40f` · bundle `main-TC4MVBSP.js`.
- **Chatbot usa a base de conhecimento**: `app/tutor_kb.py` lê o `conteudo` do catálogo e injeta no system prompt (índice do catálogo + fichas dos itens em contexto). Back `1be0437`.
- `base_de_conhecimento/catalogo_tutor/` — espelho legível do catálogo (JSON + 36 fichas .md).

### Changed
- **24 modelos + 12 métricas** com `conteudo` reescrito a partir da doc oficial do scikit-learn (correções de versão: `multi_class`/`penalty`, `n_init='auto'`, `root_mean_squared_error`, AdaBoost; 3 métricas de agrupamento corrigidas). Migração não-destrutiva no DB.

---

## 2026-06-18 — "Treine seu Robô"

### Added
- **Usar o robô — "🔮 Mostra que eu adivinho!"**: sliders por característica + Surpresa + Adivinha → `POST /classificador/prever` (Back `6aeb2f4`). Front bundle `main-Q5E472NZ.js`.
- **Fase B (regressão + agrupamento)**: datasets lúdicos `gen_sorvete` (regressão) e `gen_cardume` (agrupamento); wizard ciente do tipo de tarefa. Back `e6e7791` · Front bundle `main-4NLPZGNG.js`.
- **Fase A + seletor `/inicio`**: nova entrada lúdica `treine-robo` com treino real (classificação); `AuthGuard` com `ROTAS_POR_PAPEL`. Front `0d5aa59` · bundle `main-56NLZGNY.js`.

---

## 2026-06-17 — Trilha de ML + correções

### Added
- **Trilha de ML** (`/trilha`): nova UI do aluno em ramos paralelos (multi-modelo), inspetor didático, código por ramo, exportação. Front `e58750f` · bundle `main-HXCL2M74.js`.
- **Persistência + ingestão por URL**: salvar/abrir projetos; `POST /coleta_dados/url` com anti-SSRF. Front `df89aae` · bundle `main-S264QYC6.js` · Back `7e4c131`.
- **Cadastro consistente de elementos** (conf-pipeline data-driven via `execucao`). Front `cc03bfb` · Back `60204d2`.

### Fixed
- **Treino 500**: `converter_numpy` sanitiza `NaN/Inf → None` (SimpleImputer). Back `8075e54` · Front `2feb021` (`main-GHXLXGBH.js`).
- **Visualizações Yellowbrick**: rótulos/legendas (`finalize()` + fonte DejaVu Sans, `778c68b`/`fcdf9fa`), cores no tema roxo (`3e3822a`), e valores corretos com rótulos string (render via sklearn, `c431019` + `a2fd962`).
- **UX da Trilha**: conectores X|y, modal só-coleta, salvar com barra final, viz comparada. Front `2c4c840` (`main-KY6B66XI.js`).

### Changed
- **Tutor LLM**: health-check dos modelos (`57bd7e7`); estratificação + chip de saúde (Front `GYFHBO3U`/`OBOV3YRB`). LLM em prod → `meta/llama-3.3-70b-instruct` (config no DB).

---

## 2026-06-16 — Pré-processamento fiel + conteúdo educacional

### Added
- Pré-processamento aplicado de verdade no treino (`sklearn.Pipeline` no sandbox); `db.pre_processamento` com `execucao`; campo `conteudo` no catálogo. Front `66b034c` · Back `3615da6`.

---

## 2026-06-15 — Base

### Added
- FAB do tutor + chat NVIDIA + catálogo de modelos expandido. Front `b8e3e0b` · Back `51bdfed`.

---

_Sempre confirme os commits atuais antes de qualquer decisão de produção. O `CLAUDE.md` (raiz do backend) tem o detalhamento completo de cada deploy, backups e notas de migração._
