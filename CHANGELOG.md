# Changelog — H2IA Tutor

Histórico de deploys em produção (`https://absapt.tk/h2ia/`). Formato inspirado em
[Keep a Changelog](https://keepachangelog.com); datas em AAAA-MM-DD. Cada entrada cita os
commits (frontend/backend) e o bundle publicado. Fonte: `CLAUDE.md` → _Historical Production Reference_.

> Frontend: `IanaMary/ensinado-aprendizado-maquina` · Backend: `IanaMary/ensinado-aprendizado-maquina-back`.

---

## 2026-08-01b (auditoria Mantis — 2ª passada: telas internas/dashboard)

> Varredura das telas que a 1ª passada não cobriu (`src/app/interno/**`, `src/app/dashboard/**`).
> Resultado: quase tudo limpo (o pipe de markdown escapa antes de renderizar; a tela de desafio não
> recebe gabarito/lane/papel; editores do admin tratam a chave de API com segurança). Um achado real.
> Suíte 217 passed + build ok.

### Corrigido — segurança
- **CSV/formula injection na exportação de telemetria** (`view-admin/atividades`): `montarCsv` só
  tratava `" , \n`, não os gatilhos de fórmula (`= + - @`). O aluno controla o próprio nome/e-mail;
  ao exportar e abrir no Excel/Sheets, uma fórmula/DDE do aluno executaria (exfiltração). Agora
  células que começam com gatilho recebem prefixo `'` (continuam visíveis, não executam).

## 2026-08-01 (auditoria de segurança Mantis — frontend)

> Parte da campanha de segurança 2026-08-01 (ver changelog do backend para o conjunto completo).
> Suíte 217 passed + build de produção ok.

### Corrigido — segurança
- **Token de convite persistido no log de erros.** O `ErrorInterceptor` enviava a URL crua da
  requisição ao endpoint `/sistema/erro` (visível no painel do admin). Uma ativação que falhava
  gravava o token do convite (path `/convite/<token>` ou `?token=`). Agora a URL é **sanitizada**
  antes do envio: remove a query string e redige o token do path (`error.interceptor.ts`).

---

## 2026-07-31 (build e suíte sem avisos: Sass 3, NG8107 e 2 testes que não afirmavam nada)

> Frontend `mestrado-iana` **`5dd8d64`**. Nenhuma mudança de comportamento — o CSS emitido é
> byte a byte o mesmo (provado abaixo).

### Corrigido
- **2 specs "has no expectations"** (`AtividadeService`): usavam só `httpMock.expectNone()`, que
  verifica de verdade mas o Jasmine não conta — o runner não os distinguia de um teste vazio, e
  esvaziá-los não acenderia nada. Passaram a afirmar `match(url).length === 0` e ganharam a metade
  que faltava: o lote rejeitado com 4xx é descartado **e o evento seguinte ainda sobe** (sem isso,
  "o flush parou de enviar qualquer coisa" passaria pelo mesmo teste).
- **7 avisos NG8107** (`?.` tido como redundante). **A sugestão do compilador — trocar `?.` por
  `.` — introduziria crash:** todos os casos eram acesso indexado a `Record` ou `@ViewChild`, que
  devolvem `undefined` em runtime. Quem estava errado era o tipo: `saudeModelos` e
  `historicoDesafio` passaram a admitir `| undefined`, o `@ViewChild` trocou `!` por `?`, o
  histórico do desafio usa `*ngIf … as h`, e só no diálogo de nomear o `?.` era de fato redundante
  (o único chamador sempre passa `data`).
- **60 avisos de Sass** (dois grupos, ambos com remoção marcada para o **Dart Sass 3.0**):
  `@import` → `@use … as *` em 9 arquivos e `darken($c, N%)` → `color.adjust($c, $lightness: -N%)`
  em 27 chamadas (equivalência exata da definição de `darken`).
- **Regressão que a migração causou e a verificação pegou:** `pipeline.component.scss` fazia
  `@use '../dashboard.component' as *` e recebia as variáveis **de carona** pelo `@import` de lá.
  O `@use` não repassa membros de terceiros — é o ponto dele — então a dependência virou explícita.
  Sem o passo de comparação isto teria ido para produção como uma tela sem cor.
- **CommonJS**: `allowedCommonJsDependencies` no `angular.json` para as libs de exportação
  (jszip/file-saver/qrcode) e as transitivas de jspdf/canvg/quill. O aviso só alerta bailout de
  otimização; declará-las deixa o log limpo para o que exige ação.

### Verificação
- **Prova da equivalência do CSS:** os **53** `.scss` do projeto compilados com o dart-sass antes e
  depois — **0 diferenças** e nenhum que deixe de compilar (foi assim que a regressão do
  `pipeline.component` apareceu).
- Build de produção com **0 avisos e 0 erros** (eram 78). 217/217. Backend intacto (623 passed).

---

## 2026-07-30b (testes que pegam os dois defeitos que só apareceram na tela)

> Frontend `mestrado-iana` **`606c479`**. Não requer deploy: só testes, comentários e a
> extração de uma constante (comportamento idêntico). Produção segue em `main-2KWK6MAL.js`.

### Adicionado
- **`html-boas-vindas.quill.spec.ts`** — ida e volta pelo **editor Quill de verdade**, pelo mesmo
  caminho do `ngx-quill` em `format="html"` (`clipboard.convert()` na escrita, `getSemanticHTML()` na
  leitura), com um trecho fiel do texto de produção. Os casos que já existiam alimentam o conversor
  com HTML escrito à mão: provam a conversão, mas só cobrem as armadilhas já conhecidas — e foi por
  isso que o `&nbsp;` passou verde e apareceu na tela. **Verificado que o caso fica vermelho** sem o
  `normalizarEspacos`.
- **Testes de DOM na aba LLM** (`conf-tutor.component.spec.ts`): a listagem tem de chegar à *tela*.
  O defeito do provedor sem preço estava num `*ngIf`, com `gruposModelos.length` maior que zero o
  tempo todo — teste de getter passa verde nesse cenário. Inclui a regra geral: **em nenhum estado do
  teste de saúde** (nada testado / em andamento / parcial / completo) a tela fica em branco — ou há
  listagem, ou há um progresso explicando a espera. **Verificado que 3 casos ficam vermelhos** com o
  `total > 0` de volta no getter.
- `QUILL_MODULOS_BOAS_VINDAS` exportado do `html-boas-vindas.ts`: o teste usa a configuração **real**
  da barra do editor, não uma cópia que poderia divergir dela sem ninguém notar.

### Corrigido (registro, não código)
- A entrada de 29/07d afirmava que a lista com marcador "apareceria numerada para o aluno". O teste
  novo mediu: pelo `getSemanticHTML()` o Quill 2.0.3 já devolve `<ul>`. O `data-list` é a forma do
  `root.innerHTML`, que esta tela não usa — a conversão é guarda, não correção. Corrigido também no
  `CLAUDE.md`.

### Verificação
217/217 (11 novos).

---

## 2026-07-30 (correções da revisão: provedor sem preço, colapso na busca, prévia)

> **Implantado em 30/07/2026 12h10.** Frontend `mestrado-iana` **`8bdad04`** · bundle
> **`main-2KWK6MAL.js`**. Backup `/home/ubuntu/backups/deploy-20260730-121006`.
> Portado para a `master` em `6e2d550`.

### Corrigido
- **Bloqueador:** com provedor que não informa preço (endpoint customizado) nada entra no teste
  automático, e a listagem exigia `total > 0` — 300 modelos carregados e tela vazia, sem como
  escolher o primeiro. A lista aparece assim que não há teste em curso, com "teste sob demanda" e
  o botão "testar" por item.
- O **seletor de provedor** da aba LLM não existia na primeira visita (só a aba Provedores carregava
  a lista); agora as duas carregam.
- **Recolher grupo** não respondia com busca ativa (a busca forçava aberto).
- **Ordem dos grupos** empatava em "tem ≥1 gratuito" — um fornecedor com 1 vinha antes de um com 40.
- **Pré-visualização** das boas-vindas mostrava a saída crua do editor (lista numerada, `&nbsp;`) em
  vez do HTML convertido que será gravado.
- Toast duplicado nos handlers de provedor (o `ErrorInterceptor` já mostra o `detail`).
- `package-lock.json` restaurado (o diff removia entradas sem mudança no `package.json`).

### Verificação
206/206 (5 novos) + build. Verificado no navegador contra um endpoint OpenAI-compatible local.

---

## 2026-07-29d (editor de texto rico nas boas-vindas do tutor)

> Frontend `mestrado-iana` **`56683bb`** · bundle **`main-PJ3RSM34.js`**. Backend inalterado.

### Adicionado
- **Editor visual** (Quill) no lugar do `<textarea>` de HTML cru da aba Início. Barra limitada ao
  que o painel do tutor renderiza: título, negrito, itálico, listas e link — oferecer formatação
  que desaparece na tela do aluno seria pior que não oferecer. Modo **Código HTML** para quem
  quiser conferir ou colar o texto exato.
- `html-boas-vindas.ts`: converte a saída do editor para o subconjunto suportado (16 testes).
- **Nenhuma dependência nova:** `quill`/`ngx-quill` já estavam no `package.json` e o
  `quill.snow.css` no `angular.json`, sobrando da versão antiga desta tela. Cai no chunk do admin.

### Corrigido / evitado
- **Lista com marcador convertida para `<ul><li>`:** o `data-list` do Quill só desenha marcador com
  o CSS dele, que o painel do aluno não carrega. **Corrigido o relato em 30/07:** esta entrada dizia
  que a lista "apareceria numerada para o aluno"; medindo pelo caminho real do `ngx-quill`
  (`getSemanticHTML()`), o Quill 2.0.3 já devolve `<ul>` — a conversão é guarda para HTML colado de
  outra origem e para lista mista, não correção de defeito observado.
- **`&nbsp;` em todo espaço:** o Quill converte os espaços vizinhos de quebra de linha do HTML de
  origem, e o texto versionado é quebrado em ~95 colunas. Com espaço inquebrável o parágrafo
  deixaria de quebrar linha e transbordaria. **Encontrado na tela, não nos testes.**
- **Abrir a aba não conta como edição:** o editor reserializa o HTML ao carregar, então um Salvar
  sem intenção marcaria o texto como "do admin" — o que o faz parar de receber as atualizações dos
  deploys (mecanismo de 29/07b). O Salvar só habilita quando o conteúdo muda, com aviso explicando.
- O botão Salvar era `mat-flat-button` (span de foco que destoa) → `.btn-primario`.

### Verificação
201/201 + build de produção. Verificado no navegador com o texto real de produção.

---

## 2026-07-29c (aba Provedores, busca de modelo e listagem por fornecedor)

> **Implantado em 29/07/2026 17h53.** Frontend `mestrado-iana` **`7d3c6d1`** · bundle
> **`main-Y4RSIG3U.js`**.
> Backend: provedores de LLM (ver changelog do backend).

### Adicionado
- **Aba Provedores** no conf-tutor: um card por provedor (NVIDIA NIM, OpenRouter, "outro provedor")
  com URL base, porta, chave e botão Ativar. A NVIDIA é somente-leitura — a chave dela vem do
  `.env`. O campo de chave nasce **vazio**: a tela não conhece o segredo, e pré-preenchê-lo com
  asteriscos convidaria a gravar lixo por cima.
- **Seletor de provedor** na aba LLM, com atalho para a aba de configuração.
- **Busca** por nome de modelo ou fornecedor; grupos com resultado abrem automaticamente.
- **Listagem colapsável por fornecedor** (o que vem antes da "/"), com contagem, quantos gratuitos
  e quantos respondem. Fechados por padrão — no OpenRouter são 367 modelos em ~40 fornecedores —,
  exceto o grupo do modelo em uso.
- **Selo `free`** por modelo e por grupo; grupos com gratuito vêm primeiro.
- Botão **testar** por item nos modelos que ficam fora do teste automático (os pagos).

### Corrigido
- O botão "Re-testar" era `mat-stroked-button`, que nesta versão do Material renderiza o span de
  foco e destoa dos demais botões da tela; passou a usar `.btn-secundario` (global).

### Verificação
185/185 (10 novos) + build de produção. Verificado no navegador contra o OpenRouter real.

---

## 2026-07-29b (o material que o aluno baixa não diz mais "Iana")

> Frontend `mestrado-iana` **`c61acd0`** · bundle **`main-GSFLR7TL.js`**.
> Backend: seed do conf-pipeline com guarda + marca (ver changelog do backend).

### Alterado
- O `.zip` do pipeline levava o nome antigo da plataforma em quatro lugares (título e rodapé do
  `README.md`, duas docstrings dos `.py` gerados) — agora dizem **H2IA Tutor**.
- O card da galeria mostrava "Professor Iana" quando o pipeline não tinha professor; virou só
  "Professor" (o fallback é sobre a pessoa ausente, não sobre a plataforma).
- H1 deste changelog e de `PRODUCT.md`/`docs/DOCUMENTACAO.md`.

**Preservados:** o nome da autora em `/sobre` e as entradas históricas que narram a própria mudança
de marca — reescrevê-las contradiria os commits daquela data.

### Verificação
175/175 + build de produção.

---

## 2026-07-29 (aba LLM mostra o estado de versão da instrução do tutor)

> Frontend `mestrado-iana` **`fd7e836`** · bundle **`main-CGLQE76V.js`**.
> Backend: a instrução passou a ser persistida e versionada (ver changelog do backend).

### Adicionado
- Aviso na aba LLM quando **o padrão do sistema mudou depois da edição do admin**, com botão
  "Usar o novo padrão". A instrução dele continua no ar até decidir.
- Selo **"não persistido"** quando o backend responde `fonte: 'versionado'` — ou seja, o tutor está
  usando o texto do código porque o seed não rodou. Em regime normal nunca aparece; é o indicador
  de que a persistência falhou, em vez de o problema passar batido.
- `confirm()` antes de "Voltar ao padrão": o botão fica ao lado de "Salvar" e tira do ar a
  instrução escrita pelo admin. A copy diz que o texto fica registrado no histórico (não se perde).
- `conf-tutor.component.spec.ts`, que não existia (6 casos).

### Corrigido
- A aba LLM buscava o prompt com a guarda `!promptTexto`, isto é, pelo **conteúdo**: se o admin
  limpasse o textarea e trocasse de aba, a volta refazia o GET por cima do que ele estava
  editando — e o estado de versão só era lido uma vez por carga de página. Agora a guarda é um
  booleano de "já carregou".
- O contador de caracteres usava `promptTexto.length` enquanto o servidor valida o texto sem
  espaço nas pontas: perto do teto, tela e servidor discordavam. Passou a contar o texto trimado,
  no contador e nas guardas dos botões.

### Verificação
175/175 (eram 169) + build de produção. Verificado no navegador sobre o build, com o banco no
estado "admin editou e o padrão mudou": aviso, selos, contador e o histórico com os rótulos novos
("Padrão do sistema aplicado no deploy"). O `confirm` não foi clicado no navegador de propósito —
diálogo modal travaria a automação; está coberto no spec.

---

## 2026-07-28 (a tela do desafio não corrige mais a raia errada)

> **Implantado em 28/07/2026 14h57.** Frontend `mestrado-iana` **`ec3680c`** · bundle
> **`main-EARQSDDB.js`**. Backup `/home/ubuntu/backups/deploy-20260728-145721`.
> Backend: nova regra da rubrica e tabuleiro sem `lane` (ver changelog do backend).

### Corrigido
- **A peça fica na coluna em que o aluno a colocou.** Saíram as duas correções automáticas da
  tela do desafio: o **realce laranja + ícone de alerta** ("Esta peça não é desta etapa"), que
  apontava o erro na hora, e o **clique único**, que mandava a peça para a coluna correta
  sozinho — ou seja, respondia a pergunta que o desafio faz. Quem avalia agora é só a rubrica,
  depois do envio.

### Alterado
- A alternativa ao arrastar (importante no celular) virou de **dois toques**: o primeiro escolhe
  a peça, o segundo diz a coluna. Todas as quatro colunas oferecem "Colocar … aqui", sem
  distinção — nenhuma pista de qual é a certa.
- `PecaDesafio` não tem mais `lane`: o backend não envia a etapa da peça, então nem a tela nem o
  DevTools têm a resposta. `MatTooltipModule` saiu do componente (ficou órfão com o alerta).

### Verificação
- 169/169 + build de produção. **Verificado no navegador** sobre o build (Mongo em Docker +
  API local): k-NN colocado na coluna Métrica permanece lá, sem aviso; o envio devolve 4,4/10
  com as duas regras explicando o erro. Sem erros no console.

---

## 2026-07-27c (nível do aluno nos hiperparâmetros avançados + limpezas)

> Frontend `mestrado-iana` **`72ca7e5`** (bundle `main-Q6M4OQ5U.js`) / Backend `master` `823e4b4`.

### Corrigido
- A seção recolhível **"Avançado (n)"** dos hiperparâmetros (modal de seleção do modelo) tinha
  a própria noção de "avançado" e ignorava a preferência do aluno: vinha sempre fechada. Agora
  abre sozinha para quem escolheu o nível Avançado no tutor.
- O **fallback do card de gráfico** preenchia `descricao` e `resumo_basico` com o mesmo texto,
  fingindo dois registros de linguagem que não existem ali.
- `Router` não usado no `AuthInterceptor` (removido também do spec) e o comentário do schema que
  dizia que `exemplo_codigo` era só do Avançado — ele aparece nos dois níveis.

### Notas
- Testes: 168/168 + build de produção.
- Os `data: { breadcrumb }` das rotas seguem sem consumidor (o BreadcrumbComponent saiu em
  2026-07-26i). Mantidos de propósito: são metadados inertes e removê-los tocaria 12 arquivos
  nas duas branches sem mudar comportamento.

---

## 2026-07-27b (manual descreve o Avançado atual)

> Frontend `mestrado-iana` **`6a7267f`** (bundle `main-7ITTBJMV.js`). Backend `master` `ee69abf`.

- O manual do aluno dizia apenas "Avançado (técnico, com fórmula e hiperparâmetros)". Agora
  descreve os blocos **Fundamentos** e **Na prática** e explica que a escolha do nível fica
  guardada no perfil e vale também para o chat.

---

## 2026-07-27 (nível do tutor no perfil + blocos Fundamentos / Na prática)

> Frontend `mestrado-iana` **`8e4e774`** / Backend `master` `a9c2eba`.

### Alterado
- O toggle **Básico/Avançado** deixou de ser estado de tela: `NivelTutorService` guarda a
  escolha no perfil do aluno, ela vale nos três painéis do tutor, **sobrevive ao recarregar** e
  vai no **contexto do chat** — o tutor responde na profundidade que o aluno está lendo.

### Adicionado
- Dois blocos no card, só em Avançado: **Fundamentos** (fórmula, o que otimiza, pressupostos,
  complexidade, leitura de referência) e **Na prática** (pipeline sklearn completo com
  highlight, ordem de ajuste, armadilhas, diagnóstico). Editáveis no conf-pipeline.

### Notas
- `nivel_tutor` chega no login e é gravado na sessão; falha ao salvar não derruba a escolha.
- Testes: 167/167 (novo `nivel-tutor.service.spec.ts`) + build de produção.

---

## 2026-07-26k (editor da instrução do tutor no conf-tutor)

> Frontend `mestrado-iana` **`53f1853`** (bundle `main-E6W5LFEI.js`) / Backend `master` `7d40bed`.

### Adicionado
- **Editor da instrução de sistema** do chat na aba **LLM** do conf-tutor, abaixo da escolha do
  modelo: textarea com o texto vigente, selo "padrão do sistema"/"personalizado", contador com o
  teto de 6000 caracteres, **Salvar** e **Voltar ao padrão**. A edição aparece no histórico da
  própria aba.
- `DashboardService.getSystemPrompt()` / `putSystemPrompt(texto)`.

### Notas
- O texto é enviado ao modelo em toda pergunta, antes do contexto do pipeline e da base de
  conhecimento — a tela diz isso, para o admin saber o que está mexendo.
- Testes: 162/162 + build de produção.

---

## 2026-07-26j (criar desafio a partir de um dataset de exemplo)

> Frontend `mestrado-iana` **`09b419e`** (bundle `main-A75CCYTF.js`) / Backend `master` `a1f6f61`.

### Adicionado
- **A criação do desafio começa pela base**: novo campo "Base de dados do desafio" (datasets de
  exemplo) como primeiro passo. Ao escolher, a tela mostra um bloco com a **tarefa derivada**, a
  pergunta-guia, a descrição, o alvo e as pistas — e pré-preenche título e enunciado (editáveis).
- **Peças do tabuleiro**: "Sortear as peças" (padrão) ou "Escolher as peças", com lista agrupada
  por lane e filtrada pela tarefa da base (só modelos/métricas compatíveis).
- As três caixas "o que a base exige" vêm **lidas do dataset** e seguem ajustáveis; o select de
  tarefa saiu (é derivado). A lista de atividades mostra a base do desafio.
- Tela do aluno: chip **"Base: Iris"** no tabuleiro, ao lado de "Tentativa N".

### Notas
- `DashboardService.getPerfilDesafioDataset`; `GabaritoMontagem` ganhou `dataset` e
  `sortear_pecas`; `TabuleiroDesafio` ganhou `dataset_nome`.
- Testes: 162/162 (novos casos no spec de `turma-detalhe`) + build de produção.

---

## 2026-07-26i (voltar às boas-vindas, um toast por erro, código morto removido)

> Frontend `mestrado-iana` **`fb784c8`** (bundle `main-JE2Q5PDD.js`). Backend inalterado.

### Corrigido
- **As boas-vindas do tutor não voltavam.** O primeiro clique num item as escondia para sempre
  (`tutorGeral` exige `!contexto && !tutorItemInfo`, e nada revertia esses estados — selecionar
  um modelo já bastava). Novo botão **"Voltar ao início"** no painel: o componente limpa o
  `contexto` que ele mesmo constrói e o pai limpa item/pipeline/sugestões e recarrega o pipe
  `inicio` (zerando a guarda de dedupe do `getTutor`).
- **Dois toasts para o mesmo erro.** `AuthInterceptor` e `ErrorInterceptor` avisavam o mesmo
  403 com textos diferentes. O aviso ficou só no `ErrorInterceptor` (com a mensagem melhor);
  o `AuthInterceptor` cuida apenas do logout no 401. Novo `error.interceptor.spec.ts`.

### Removido
- `ShellComponent` (barra lateral) e `BreadcrumbComponent`: **código morto** — só o
  `InternoComponent` os renderizava e ele nunca foi roteado. `InternoComponent` saiu junto.
  Os `data: { breadcrumb }` das rotas ficaram sem consumidor (mantidos).

### Notas
- Testes 156/156; bundle 571,17 kB (−0,83 kB).

---

## 2026-07-26h (aviso de desafio + boas-vindas do tutor + contas da banca)

> Frontend `mestrado-iana` **`ac512ff`** (bundle `main-5ZEHBTUF.js`) / Backend `master` `c3faae2`.

### Corrigido
- **Boas-vindas do tutor**: o painel mostrava uma frase só. O texto longo saiu do
  `execucoes.component.ts` (ficou um fallback curto) e a fonte passou a ser o backend
  (pipe `inicio`, versionado e editável pelo admin em conf-tutor).
- **`/atividades` como professor** não mostra mais o toast "Acesso negado" ao abrir:
  `GET /usuario/` (admin-only) era chamado só para preencher o seletor do filtro.

### Adicionado
- **Aviso de desafio pendente** na Área de Trabalho (uma chamada a
  `GET /turmas/minhas/desafios`, falha silenciosa); com um único desafio, o botão abre direto.
- Lista de turmas: **desafios primeiro**, com "N tentativas · melhor nota X" e botão
  "Tentar de novo"; a tela e o item do menu do avatar viraram **"Turmas e desafios"**.

### Notas
- `ShellComponent` (barra lateral Home/Pipeline/Resultados) é **código morto** nesta branch:
  `InternoComponent` (`<app-shell>`) não é roteado. Não foi removido — só registrado.

---

## 2026-07-26g (documentação das 3 funcionalidades + 2 correções vistas nas capturas)

> Frontend `mestrado-iana` `11888e4` (bundle **`main-EDMYYQK2.js`**), portado p/ `master`
> `7273a76`. Backend `master` **`a7c133e`**. Backup `/home/ubuntu/backups/deploy-20260726-125237`.

### Adicionado
- **Documento para a dissertação** com 7 capturas de tela e a justificativa de cada decisão:
  `docs/dissertacao/04-desafios-avaliacao-e-divisao.md` (+ `figuras/` e blocos ABNT em
  `latex/figuras-abnt.tex`). Repositório do workspace (local).
- Documentação de arquitetura no backend: `docs/desafios-montagem.md`, `docs/evolucao-aluno.md`,
  `docs/divisao-treino-teste.md`; `docs/DOCUMENTACAO.md` (nos dois repos) com as coleções
  `atividades`/`submissoes_montagem` e as seções 3.8/3.9.

### Corrigido
- **Nota do desafio aparecia como "5.3000"** no ranking: reusava o formatador de métrica
  (4 casas). Agora 1 casa para nota, 4 para métrica de pipeline.
- **Histórico de evolução fragmentado**: o mesmo dataset chega como `Iris` pelo assistente e
  `Iris.xlsx` por outros caminhos, e o filtro comparava nome cru — o aluno não veria evolução.
  O servidor passou a comparar nomes normalizados (minúsculas, sem extensão).

> Ambos os defeitos apareceram ao montar as capturas para a dissertação, não nos testes.

---

## 2026-07-26f (aviso quando não dá para estratificar + bateria de testes da divisão)

> Frontend `mestrado-iana` `3cec11c` (bundle **`main-PTQJ6V2W.js`**), portado p/ `master`
> `94970d7`. Backend `master` **`bf91612`**. Backup `/home/ubuntu/backups/deploy-20260726-115357`.

### Adicionado
- No caso estranho (categoria com um único exemplo), a caixa "Separar treino/teste com
  estratificação" **desmarca sozinha** e o aluno recebe a explicação. O alerta ficou em
  `preencherDados`, por onde passam as respostas de **todas** as portas de entrada (CSV,
  XLSX, URL e redivisão) — antes só a redivisão avisava.
- Backend devolve `stratify` **efetivo** + `aviso_estratificacao` nas quatro portas.

### Corrigido
- **URL:** o pedido de estratificação era ignorado em silêncio e a config ainda gravava
  `stratify: true` — mentia sobre o que fez. Agora usa o mesmo divisor e grava o efetivo.

### Testes
- `tests/test_divisao_treino_teste.py` (16 novos), em três níveis: **unidade** de
  `dividir_dataframe` (disjunção, proporções, fallback, override, erro claro);
  **regressão do vazamento** dos datasets de exemplo (treino+teste = total, nenhuma linha de
  teste no treino, proporções preservadas, `content_completo_base64` gravado);
  **integração** da redivisão (redividir 2× não encolhe o dataset, aviso e valor efetivo
  chegam ao cliente, regressão não estratifica, escolha do aluno prevalece).
- Backend **441 passed, 1 skipped**; frontend 147/147 (`mestrado-iana`) e 138/138 (`master`).
- Verificado no navegador com CSV de 7 linhas (6 "gato", 1 "raro"): caixa desmarcou e o aviso
  apareceu; com base saudável (4/4), estratificou e o teste saiu 2 de cada categoria.

---

## 2026-07-26e (estratificação por padrão em classificação + fim do vazamento nos datasets de exemplo)

> Frontend `mestrado-iana` `de8301b` (bundle **`main-OP3WGDPI.js`**), portado p/ `master`
> `e9507fd`. Backend `master` **`4a6ef48`**. Backup `/home/ubuntu/backups/deploy-20260726-110345`.

### Alterado
- **Classificação estratifica treino/teste por padrão.** Sem isso, uma categoria pouco
  frequente pode ficar de fora do teste e a métrica engana o aluno. Regressão e exploratório
  seguem sem estratificar (não faz sentido); o aluno ainda pode desmarcar, e o assistente
  explica por que já vem ligada.
- Quando o dataset **não permite** estratificar (categoria com um único exemplo), a divisão é
  feita sem estratificar e a tela avisa — antes o upload era recusado com **400**, o que com o
  padrão ligado viraria parede para CSV real de aluno.
- Uploads CSV/XLSX passaram a usar o mesmo divisor da redivisão (menos duplicação).

### Corrigido
- **Vazamento treino/teste nos datasets de exemplo.** `content_treino` recebia o dataframe
  INTEIRO e `content_teste` a cauda de 25%: o teste era subconjunto do treino e, sem
  embaralhar, a cauda de um dataset ordenado por classe (iris, wine) só tinha uma categoria.
  Agora há divisão real e estratificada, e o doc guarda `content_completo_base64` (a
  redivisão relê dele; sem isso o dataset encolheria a cada mudança de proporção).
  Verificado no iris: 112 treino / 38 teste, **0 linha de teste dentro do treino**, proporções
  de classe preservadas nos dois lados.

### Notas
- `stratify` virou opcional na redivisão: `None` = "o cliente não opinou", e o servidor liga
  quando a config diz classificação. A resposta traz o valor **efetivo** + `aviso_estratificacao`.
- 8 testes novos no backend (425 passed) e 6 no frontend (144/144; 135/135 na `master`).
  Dois testes que codificavam o contrato antigo foram atualizados com o porquê.

---

## 2026-07-26d (Fase 2: evolução do aluno na mesma base)

> Frontend `mestrado-iana` `bda1294`+`93d1872` (bundle **`main-5OWPTQIF.js`**), portado p/
> `master` `11646f8`. Backend `master` **`4204bc0`**. Backup `/home/ubuntu/backups/deploy-20260726-102325`.

### Adicionado
- **"Sua evolução nesta base"** no topo do resultado da avaliação: chute burro da base, a
  melhor tentativa do aluno e a avaliação atual, com a diferença em pontos percentuais.
  A leitura é sempre **relativa** — métrica crua não é comparável entre bases (acurácia 0,92
  é fraca no iris e ótima no titanic), então nunca há nota absoluta.
- **Chute burro** derivado do que já estava gravado, sem reprocessar dados: proporção da
  classe majoritária lida das somas das linhas da matriz de confusão; R² = 0 por definição;
  nas demais métricas não há baseline barato e o bloco simplesmente omite a comparação.
- `GET /pipelines/evolucao` (só os próprios pipelines) agrupa por `(dataset, alvo)`
  atravessando atividades e projetos livres, com o que mudou entre tentativas
  ("trocou o modelo", "acrescentou pré-processamento"). Aceita `dataset` (repetível) e
  `alvo`: o cliente manda os nomes que conhece e **o servidor decide a identidade**.
- `app/metricas/resultado.py`: leitura dos resultados extraída de `turmas.py` — ranking e
  evolução precisavam da mesma resolução rótulo × slug e não devem ter duas cópias.

### Notas
- A identidade da base **não** usa `datasetId` primeiro: ele é o id do arquivo criado a cada
  carregamento, e preferi-lo fragmentaria a história (cada recarregamento viraria base nova).
- "Melhorou" tem sinal positivo também em métricas de menor-é-melhor (MAE).
- Verificado no navegador com o fluxo real (Iris → treinar → avaliar): *"Sua melhor até agora
  0.88 · Esta avaliação 1.00 · +12.0pp"*. Backend 420 passed; front 138/138 e 129/129 (master).
- **Fase 3 (perfil do aluno + narrativa) não implementada.**

---

## 2026-07-26c (recorte dos lockups do Hub + clamp que encolhia o logo)

> Só frontend: `mestrado-iana` `1fd7e52` (bundle **`main-TYN6VZGN.js`**), portado p/ `master`
> `30ca59b`. Backend inalterado. Backup `/home/ubuntu/backups/deploy-20260726-084815-frontend`.

### Alterado
- **`hub-ia-{positivo,negativo}.png` recortados**: 1367×768 (79% de transparência, resto de
  export 16:9) → **906×278**, com área de respiro deliberada de 6% da altura da arte. Com
  isso `altura` volta a significar altura real em qualquer call site — a classe de bug
  "logo pequeno" morre na fonte, em vez de depender de cada tela lembrar de usar `largura`.
  Arquivos ~30% menores (16,5 KB → 11,4 KB).
- Call sites reajustados pelo fator 0,663 (login `360→239`, convite/cadastro `largura`
  `360→239`, clamp mobile `200→133`): a arte renderizada segue **231×65**, idêntica.

### Corrigido
- **Clamp que encolhia o logo em 8%** no convite e no cadastro (239 → 220): o
  `max-width: 92%` estava no `<img>`, cujo pai é o próprio `<app-brand-logo>` — a
  porcentagem se resolvia contra a largura da própria imagem. O limite passou para o host.
  Só apareceu porque a conferência pós-recorte mediu o elemento em vez de olhar a tela.

---

## 2026-07-26b (desafio: trava do professor + progresso separado)

> Frontend `mestrado-iana` `0260394` (bundle **`main-7ZCANP7T.js`**), portado p/ `master`
> `5697c6f`. Backend `master` **`f17dfb8`**. Backup `/home/ubuntu/backups/deploy-20260726-052138`.

Revisão do que subiu horas antes, contra as *karpathy-guidelines*.

### Adicionado
- **Trava do professor no sorteio**: dois selects múltiplos ("peças que devem aparecer" e
  "que nunca aparecem"), alimentados pelos catálogos que o `DashboardService` já publica —
  sem endpoint novo. Era decisão da grelha que tinha ficado só no backend, sem tela.

### Alterado
- **Progresso separa Pipelines e Desafios.** `submissoes` voltou a significar apenas
  pipelines submetidos (número que o professor já lia); desafios ganharam coluna própria
  com a melhor nota. A fração `/ total_atividades` saiu — o denominador mistura os tipos.
- Removida a seleção/repesagem de regras por atividade (`gabarito.regras`): nenhuma tela
  alcançava, e a rubrica sempre usou o conjunto completo. Os pesos seguem na biblioteca.

### Corrigido
- Select múltiplo era cortado em uma linha (o `.campo-input-wrapper` global tem altura de
  campo simples); agora cresce com o `size`. Rótulo da peça cai para `nome` antes do slug.

### Testes
- Spec novo do `turma-detalhe` (8 casos) cobrindo o gabarito enviado ao backend — era a
  única lógica de decisão da tela sem cobertura. 131/131 na `mestrado-iana`, 122/122 na
  `master`; backend 396 passed. `fixar`/`vetar` verificados contra backend real.

---

## 2026-07-26 (desafio de montagem de pipeline — Fase 1)

> Frontend `mestrado-iana` `a440695` (bundle **`main-GT47M2MG.js`**), portado p/ `master`
> `fdb1c46`. Backend `master` **`e6e90a5`**. Backup `/home/ubuntu/backups/deploy-20260726-044207`.

### Adicionado
- **Desafio de montagem (quebra-cabeça avaliado, sem executar nada).** O professor cria uma
  atividade de tipo **montagem** na turma (tarefa, dificuldade e como é a base descrita no
  enunciado); o aluno recebe as peças embaralhadas — úteis + **distratoras** — e monta nas
  mesmas 4 lanes do dashboard. A correção é uma **rubrica de regras com peso** (não um
  gabarito de sequência única, porque vários pipelines resolvem o mesmo problema) e cada
  regra violada devolve um texto didático, que é o material que o tutor vai reusar.
- Tela nova `interno/desafio/` (standalone, rota lazy `desafio`): bandeja de peças, clique
  ou arrasto para as lanes, aviso local de peça na lane errada, resultado com nota 0–10,
  "o que revisar" e "o que já está certo", e **"Tentar de novo" com peças novas**.
- `turma-detalhe`: seletor de tipo (pipeline real × desafio), campos do desafio e ranking
  com **nota + tentativas**; `entrar-turma` abre o desafio na tela própria (selo "Desafio").
- `src/styles/_lanes.scss`: cores por etapa + esqueleto das lanes/cards, antes presos no
  `execucoes.component.scss`. O dashboard clássico **não** foi reescrito (tela mais carregada
  da produção, sem teste de UI) — o parcial é a fonte para telas novas.

### Notas
- As regras derivam do **catálogo** (`db.modelos`/`db.metricas`/`db.pre_processamento`), então
  um item novo cadastrado pelo admin já participa dos desafios sem mudança de código.
- Verificado ponta a ponta contra backend real (Mongo em Docker): montagem errada → 0/10 com
  6 explicações, re-sorteio a cada tentativa, criação pelo professor e ranking. 123/123 na
  `mestrado-iana`, 114/114 na `master`.
- **Próximas fases (não implantadas):** F2 pontuação relativa de qualidade do pipeline real
  (chute burro + evolução na mesma base) e F3 perfil do aluno + narrativa para o professor.

---

## 2026-07-25 (logo do Hub em tamanho legível no convite e no cadastro)

> Só frontend (`mestrado-iana` `25a189b`, portado p/ `master` `7668235`; bundle
> `main-3BTTSO7Z.js`). Backend inalterado. Backup `/home/ubuntu/backups/deploy-20260726-020757-frontend`.

### Corrigido
- **Logo do Hub aparecia ~3× menor** nas telas de **ativação de convite** (`/ativar-conta`) e
  **cadastro**. Causa: o lockup `hub-ia-*.png` tem muita margem transparente (arte em 876×248
  numa tela de 1367×768), então dimensionar pela **altura do arquivo** (`[altura]="60"`) rendia
  só ~19px de arte visível — a tela de login não sofria porque usa `width: 360px` no `<img>`.
- `BrandLogoComponent` ganhou `@Input largura` (quando informada prevalece sobre `altura`, com
  `height: auto`); as duas telas passaram a usar `[largura]="360"`, igual ao login. Clamp em
  celulares via `max-width: 200px` no `.logo-container` (≤768px).

---

## 2026-07-22c (Manual: desfoque de dados sensíveis nas capturas)

> Só frontend (3 assets estáticos). Backend inalterado.

### Corrigido
- Pixelização (LGPD) das regiões com dados reais nas capturas do `/manual`:
  **login** e **cadastro** (campos de e-mail e senha preenchidos) e **detalhe da turma**
  (código, QR code, link de entrada e e-mail do aluno). Assets regravados em
  `src/assets/manual/` a partir dos originais.

---

## 2026-07-22b (capturas de tela no Manual)

> Só frontend. Backend inalterado.

### Adicionado
- **Capturas de tela ilustrativas no `/manual`** (todas as três abas). 19 imagens em
  `src/assets/manual/` inseridas nas seções via `<figure class="manual-figura">` com legenda:
  - **Aluno:** área de trabalho, menu, login (Visão Geral); assistente de coleta; seleção de
    modelo, seleção de métricas, avaliação e Yellowbrick (Treinar e Avaliar); painel do tutor;
    Meus Projetos, Galeria e Minhas Turmas.
  - **Professor:** painel e menu; detalhe da turma (código + QR); galeria; telemetria.
  - **Admin:** painel de administração; página de ativação e cadastro (Gerenciar Usuários).
- Estilo `.manual-figura` em `manual.component.scss` (imagem responsiva com borda/sombra + legenda).

---

## 2026-07-22 (marca H2IA Tutor + terminologia "Aprendizado de Máquina" + redesign do cadastro)

> Frontend `mestrado-iana`, portado p/ `master`. Backend: e-mail de convite (repo back).

### Corrigido
- **Marca desatualizada:** a página aberta pelo link do e-mail (`/ativar-conta`) mostrava
  "Mestrado Iana" com um logo de texto "IA"; agora usa a **logo oficial** (`<app-brand-logo>`)
  e **"H2IA Tutor"**, espelhando a tela de login. Mesma limpeza no `shell` (sidebar).
- **Terminologia:** "Machine Learning" → **"Aprendizado de Máquina"** nas telas (login,
  ativação, admin, início, conf-tutor, meus-projetos, manual, área de trabalho, `tutor.json`)
  e no conteúdo exportado (scripts `.py`/`.ipynb` e nome do PDF). Preservado o nome próprio
  **"UCI Machine Learning Repository"**.
- **Redesign do cadastro (`/autenticacao/login/cadastro-usuario`):** trocada a caixa Material
  genérica pelo padrão da tela de login (duas colunas com gradiente roxo, coluna de marca,
  campos custom com ícones, botões em gradiente). Lógica do componente intacta.

### Observação
- O deploy incluiu também trabalho em andamento não relacionado (chat-tutor, conf-pipeline,
  global-error-handler) por decisão de publicar toda a árvore de trabalho.

---

## 2026-07-09 (tutor: conteúdo por etapa no modal, card por dataset, fences coloridos no chat)

> Frontend `mestrado-iana` (bundle `main-WZTDYM2S.js`), portado p/ `master`. Backend inalterado.

### Adicionado/Corrigido
- **Drawer do modal** agora exibe o conteúdo por etapa editável do admin (`GET /tutor/?pipe=`,
  cache por etapa) — resíduo conhecido desde o fix do tutor por etapa.
- **Toy datasets:** ⓘ em cada card abre o conteúdo educacional do dataset no tutor
  (`/toy_datasets/{name}/conteudo`; endpoint estava pronto desde 2026-06-26, sem UI).
- **Chat:** code fences do markdown agora têm **highlight de Python** (diretiva
  `appRealcarBlocos` + bloco escuro na paleta do tutor) — pendência antiga.

## 2026-07-09 (botões padrão nas topbars + manual enriquecido)

> Frontend `mestrado-iana` (bundle `main-KWB7QOBM.js`), portado p/ `master`. Backend inalterado.

### Mudado
- **Botões padrão** `.btn-primario`/`.btn-secundario` viraram estilo global e substituem os botões
  antigos nas topbars (Novo Usuário, Configuração do Pipeline, Atualizar dos logs).
- **Manual** reescrito por papel, refletindo o sistema atual (coleta arquivo/URL/dataset, comparação
  de modelos, tutor+chat, turmas/atividades/ranking, exportação zip/PDF, conf-pipeline com
  assistente, artefatos MLflow, monitoramento).

## 2026-07-09 (topbar em todas as telas do admin)

> Frontend `mestrado-iana` (bundle `main-AW73YJJJ.js`), portado p/ `master`. Backend inalterado.

### Corrigido
- A padronização da barra superior valia só p/ conf-pipeline/conf-tutor; agora **Gerenciar
  Usuários** (sem nem user-menu antes), **Artefatos**, **Logs de Backend**, **Logs de Erros** e
  **Atividades** usam o `<app-topbar>` (voltar à esquerda + marca + título + user-menu; em
  Atividades o voltar vai à home do papel).

## 2026-07-09 (admin: topbar + FAB-menu c/ assistente; modal: Treinar no rodapé; robustez a chunk defasado)

> Frontend `mestrado-iana` `ffee720`+`f2784ec` (bundle `main-4J2NDQLO.js`), portado p/ `master`.
> Backend `30f47a5`. Verificação: 115/115 + build prod; backend 353 passed.

### Adicionado
- **`<app-topbar>` compartilhada** (voltar à esquerda + marca + título + user-menu), aplicada em
  conf-pipeline e conf-tutor (fim dos botões antigos/telas sem menu).
- **FAB-menu (☰) no conf-pipeline:** criar elemento na lane atual + **assistente de preenchimento**
  (chat com o guia versionado — db.tutor pipe `conf-pipeline` — como contexto).
- **Auto-reload de chunk defasado:** `GlobalErrorHandler` recarrega a página uma vez quando um
  chunk lazy some após deploy (guarda anti-loop); deploy passa a **preservar assets hasheados**.

### Corrigido
- **Modal:** botão **Treinar** movido para a barra do modal (etapa treinamento); bloco "Tipos de
  colunas detectados" subiu para antes das transformações (pré-proc).
- **Logs de Erros (admin):** tabela responsiva/legível (URL quebrava letra a letra).

## 2026-07-09 (UX: ações no rodapé do modal, código do tutor, identidade Hub no PDF/zip/Sobre, FABs)

> Frontend `mestrado-iana` `7184e90`+`79c5e7c` (bundle `main-OCQSCJ5R.js`), portado p/ `master`.
> Backend inalterado. Verificação: 115/115 + build prod.

### Mudado/Corrigido
- **Modal (avaliação):** "Baixar relatório (PDF)" e "Gerar avaliações" movidos do corpo da etapa
  para a **barra de botões do modal**; drawers do tutor ganham `visibility:hidden` fechados
  (defesa contra elemento invisível capturando cliques nos controles dos gráficos).
- **Tutor:** bloco de código com **scroll próprio** (não estoura o drawer) e **cores do hljs**
  de volta (tema em `::ng-deep` — os spans entram por innerHTML sem `_ngcontent`).
- **Identidade Hub (ia.ufpel.edu.br):** logo+link no cabeçalho do relatório PDF; `hub-ia.pdf`
  promocional dentro do zip do pipeline; capa do `/sobre` com símbolo branco **sem corte**
  (novo `simbolo-ia-branco.png`) e bloco de identidade centralizado/clicável.
- **conf-pipeline:** criação de elementos via **FAB** (mat-fab fixo, canto inferior direito).

## 2026-07-09 (consolidação: catálogo só no conf-pipeline; conf-tutor enxuto)

> Frontend `mestrado-iana` `378e594` (bundle `main-UMKXYKDW.js`), portado p/ `master`.
> Backend inalterado. Verificação: 115/115 + build prod. Saldo: −870 linhas.

### Mudado
- **conf-pipeline** vira o único administrador do catálogo: novo painel **"Campos do item"**
  (resumo em todas as lanes; tipo de tarefa + explicação + métricas compatíveis nos modelos;
  grupo + explicação nas métricas; grupo no pré-proc) e botão **Excluir** com confirmação
  (exceto Coleta) — capacidades absorvidas do editor antigo antes de aposentá-lo.
- **conf-tutor enxuto**: só Início (boas-vindas), LLM e histórico de auditoria; as 4 abas de
  catálogo (que duplicavam o CRUD nas mesmas coleções com editor divergente) foram removidas
  junto com `tutor-elementos-catalogo`, os forms órfãos e o `fetchPreProcessamentoOverrides`.
  Cabeçalho linka a Configuração do Pipeline.

## 2026-07-08 (tutor: boas-vindas editáveis; menu: Manual + Sobre modal; logo símbolo com respiro)

> Frontend `mestrado-iana` `1b37e26`+`725d972` (bundle `main-VEKLQ5CZ.js`), portado p/ `master`.
> Backend `4ed7562`. Verificação: 115/115 + build prod; backend 349 passed (+4 testes novos).

### Adicionado
- **Texto inicial do tutor:** o drawer da área de trabalho mostra boas-vindas (pipe `inicio`,
  editável) quando o aluno ainda não clicou em nada — antes ficava vazio. Fallback estático
  quando o doc não existe. Nova aba **"Início"** no conf-tutor (edição com preview) salvando via
  novo `PUT /tutor/pipe/{pipe}` (upsert, allowlist, auditoria).
- **Menu do usuário:** opção **Manual** (`/manual?tipo=<papel>`) para todos os papéis; **Sobre**
  agora abre como **modal** para usuário logado (`SobreComponent` com `MatDialogRef` opcional —
  fecha em vez de navegar; a rota pública `/sobre` segue igual).

### Corrigido
- **Logo símbolo cortado:** novo asset `simbolo-ia.png` (recorte com margem do símbolo roxo do
  `hub-ia-marca.png`); a variante `marca` usava o `apple-touch-icon` full-bleed e aparecia cortada.

## 2026-07-08 (login/marca/voltar: link Sobre único, logo símbolo nos cabeçalhos, voltar no Pipeline)

> Frontend `mestrado-iana` `efd647e`+`6319f12` (bundle `main-JIBVUOCP.js`). `efd647e` portado p/
> `master`; `6319f12` é só-`mestrado-iana` (o dashboard do `master` mantém o voltar p/ `/inicio`).
> Backend inalterado. Verificação: 115/115 + build prod.

### Corrigido
- **Login:** removido o link "Sobre este trabalho" duplicado no rodapé do formulário; o botão do
  painel esquerdo virou o 4º card, com o mesmo visual/largura dos `feature-item`.
- **Cabeçalhos Admin/Professor:** o logo completo (lockup com texto) a 34px era ilegível — trocado
  pela variante `marca` (símbolo "iA") a 40px; a variante passa a usar `apple-touch-icon.png`
  (180px, mais nítido que o favicon 64).
- **Dashboard (`/view-admin/dashboard`):** restaurado o botão **voltar** no cabeçalho do Pipeline
  (perdido na criação da branch `mestrado-iana` por apontar p/ `/inicio`); agora volta à home do
  papel via `roleMap`.

## 2026-07-08 (exportação: usar_modelo em 2 versões — MLflow e joblib)

> Frontend `mestrado-iana` `8443dbd` (bundle `main-AX4QGGHT.js`), portado p/ `master` (não
> implantado). Backend inalterado. Verificação: 115/115 + build prod.

### Adicionado
- O zip exportado do pipeline traz **dois** exemplos de uso do modelo treinado no lugar do
  `usar_modelo.py` único: `usar_modelo_joblib.py` (carrega `modelo/model.pkl` direto, sem
  dependência do MLflow — funciona inclusive quando o artefato veio do fallback sem MLflow) e
  `usar_modelo_mlflow.py` (`mlflow.sklearn.load_model`). README do bundle documenta as duas
  opções; no modo comparação cada modelo ganha os dois arquivos.

## 2026-07-08 (coleta: rótulo numérico + upload xlsx de teste; tutor por etapa; lanes; escopo do LLM)

> Frontend `mestrado-iana` `bfce9c9`+`1640098` (bundle `main-SDFP4XFO.js`), portado p/ `master`
> (`3b518b1`+`8db4281`, não implantado). Backend `3c5043a`. Verificação: 115/115 + build prod
> (`mestrado-iana`), 108/108 + build prod (`master`), backend 342 passed + 3 testes novos.

### Corrigido
- **Coleta (modal):** classificação aceita coluna **Número** como rótulo (ex.: `Survived` 0/1 do
  titanic.csv) — antes só Texto; upload de **xlsx de teste** funcionava só com o campo `file_teste`
  que o front não envia → backend aceita `file` (mesmo campo do CSV); botões **+/−** do Total
  Treino centralizados e com gap.
- **Tutor do modal (wizard):** conteúdo agora **atualiza ao avançar/voltar de etapa** — o reset do
  `tutorContexto` era pulado justamente no pré-processamento (condição do layout antigo) e o mapa
  de chaves das etapas estava deslocado (faltava `pre_processamento`, tudo após a coleta pegava a
  chave errada). Nova entrada `pipeline.pre_processamento` no `tutor.json` (título/descrição/
  dicas/conceitos).
- **Lanes do dashboard:** Coleta/Pré-proc/Treinamento/Métricas ocupam a **altura visível** da tela
  (`:host` flex na cadeia, `grid-auto-rows: minmax(0,1fr)`, `min-height` de fallback na área de
  drop) — antes encolhiam ao conteúdo e não havia para onde arrastar.
- **Tutor LLM (backend):** system prompt com **escopo restrito** ao projeto (ML/plataforma/pipeline
  do aluno), priorizando o pipeline atual; recusa educada fora do escopo.

## 2026-07-06/07 (Identidade H2IA + tela Sobre + a11y/QR + performance)

> Sequência de deploys só-frontend em `mestrado-iana`; tudo portado para `master`
> (`0658e4e`, não implantado). Backend inalterado. Verificação: 115/115 (`mestrado-iana`) /
> 108/108 (`master`) em cada passo. **Sem verificação visual** (extensão do Chrome offline).

### Frontend `mestrado-iana` `1918306` (bundle `main-FVDVRNVM.js`, estado final)

- **Fluxo de entrada por QR corrigido + endurecido.** O link/QR aponta para rota protegida;
  aluno deslogado perdia o `?codigo` no login (join nunca acontecia). Helper
  `service/auth/retorno-login.ts`: `returnUrl` com **expiração 10 min**, consumido só após a
  navegação resolver; o **cadastro** também o consome; e o `entrar-turma` **não auto-matricula**
  mais — pede **1 clique de confirmação** (evita matricular a conta errada em PC compartilhado).
- **Acessibilidade em `turma-detalhe`:** `aria-label` nos botões só-ícone, contraste AA, modal de
  chat com `role="dialog"`+`cdkTrapFocus`+Esc + foco devolvido a elemento vivo, `<thead>`/`scope`,
  `overflow-x`, `:focus-visible`, `<h1>`, `<li>`→`<button>`.
- **Identidade visual H2IA:** fonte **Maven Pro** auto-hospedada (**WOFF2**, ~124 KB; TTF fallback);
  **logo do Hub** no login, cabeçalhos Admin/Professor e favicon "iA"; componente `<app-brand-logo>`.
- **Tela pública `/sobre`** (dissertação de **Iana Mary Costa**; orientador Ulisses Brisolara Corrêa;
  coorientação Larissa Astrogildo de Freitas e Marilton Sanchotene de Aguiar — links UFPel; PPGC/UFPel;
  ano 2026). Acessível pelo login (rodapé + painel) e menu do usuário. Símbolo iA animado.
- **Matriz de confusão:** legenda movida para uma linha horizontal acima da matriz.
- **Performance (revisão `max`):** fim da **duplicação global de CSS** — 23 componentes passaram a
  importar `colores.scss` (variáveis-only) em vez de `styles.scss` (que re-emitia todo o CSS global
  com escopo): `.pipeline-item` **337→35** no bundle, `'Maven Pro'` 120→12. Fontes movidas para
  `styles/fontes.scss` (global-only, via `angular.json`). Dead code/assets removidos.

Detalhes: `handoffs/2026-07-07-marca-h2ia-sobre-a11y-perf.md`.

## 2026-07-06 (Artefatos: filtro Dataset com autocomplete)

### Frontend `mestrado-iana` `cd14583` (bundle `main-3LZKNEI6.js`) · só frontend
- O `<select>` de **Dataset** virou autocomplete (mesmo padrão de Modelo: filtra a lista de
  facetas por texto). Build + 115/115.

## 2026-07-06 (Artefatos: filtros Usuário/Modelo com autocomplete)

### Frontend `mestrado-iana` `f9593a5` (bundle `main-ETFF2MHY.js`) + backend `07c9fa3`
- Os `<select>` de **Usuário** e **Modelo** viravam inviáveis com muitos registros. Agora:
  **Usuário** = input com autocomplete + **busca debounced no servidor** (`/artefatos/usuarios`,
  regex nome/email, limitado) — escala p/ milhares de alunos, não carrega todos no init;
  **Modelo** = autocomplete filtrando a lista de facetas. Painel via CDK overlay (não clipa).
  Build + 115/115; backend 342 passed.

## 2026-07-06 (Artefatos: botão Baixar modelo no drawer)

### Frontend `mestrado-iana` `0a6e2fc` (bundle `main-6YHNVWUM.js`) · só frontend
- Quando a run tem `modelo_id`, o painel mostra **"Baixar modelo"** → baixa o `.zip` do modelo
  MLflow (`MLmodel`/`model.pkl`/`requirements`/exemplo) via `baixarModeloArtefato` (blob +
  download client-side). Endpoint backend já existia. Build + 115/115.

## 2026-07-06 (Artefatos: run ligada à atividade/turma)

### Frontend `mestrado-iana` `689327e` (bundle `main-MV5KT6UD.js`) + backend `b7b320a`
- Ao abrir uma run, o painel mostra **"Usada em atividade X · turma Y"** (submissões que
  usaram a run), com **link para a turma** (`/view-professor/turmas/{id}`). Cruza run↔pipeline
  via `GET /artefatos/{run_id}/contexto` — **sem tocar no fluxo de treino**. Build + 115/115;
  backend 341 passed.

## 2026-07-06 (Artefatos: dataset gravado na run + filtro/coluna)

### Frontend `mestrado-iana` `3b4dfb9` (bundle `main-VEEKPYQC.js`) + backend `0dbd5b5`
- O **treino passa a enviar `dataset_nome`** → a run guarda o dataset. Artefatos ganha
  **filtro Dataset** (dropdown via `/facetas`) e **coluna Dataset** na tabela.
- Retroativo: runs antigas ficam sem dataset (—); vale dos próximos treinos. Build + 115/115;
  backend 340 passed.

## 2026-07-06 (Artefatos: filtros modelo/papel + detalhe em drawer)

### Frontend `mestrado-iana` `81f0d0d` (bundle `main-PJH75CY3.js`) + backend `b1f6831`
- **Filtros novos:** Modelo e Papel (aluno/professor/admin), dropdowns populados por
  `GET /artefatos/facetas`. (Dataset/professor-de-turma/turma **não** são gravados na run —
  filtrar por eles exigiria enriquecer o doc no treino, não retroativo.)
- **"Ver" → painel lateral (drawer):** o resumo abre num painel deslizante à direita com
  backdrop (antes empilhava abaixo da lista e parecia "não ter acontecido nada"). Fecha por X,
  backdrop ou **Esc**; respeita `prefers-reduced-motion`; z-index semântico.
- Build + 115/115; backend 340 passed.

## 2026-07-06 (polish da tela de Artefatos MLflow — /impeccable critique)

### Frontend `mestrado-iana` `cf6008f` (bundle `main-25GBCWSY.js`) · só frontend
- Corrige os achados da crítica em `/view-admin/artefatos`:
  - **Design system:** hexes hardcoded (roxo-Material) → tokens `colores.scss`; filtros no padrão
    `.campo-*`; botões `.btn-primario`/`.btn-secundario` do app.
  - **Contraste AA:** textos suaves (#999/#777, falhavam) → `$cinza-escuro` (≥7:1).
  - **Estados:** hover + `:focus-visible` (anel roxo) nos botões; hover nas linhas.
  - **"Ver":** rola até o resumo e o destaca 1,2s (reduced-motion → instantâneo).
  - **Copiar run_id** em 1 clique (tabela + detalhe), com feedback "Copiado".
- Build + 115/115; detector `/impeccable` limpo.

## 2026-07-06 (design: salvar-pipeline + arredondamento global dos campos)

### Frontend `mestrado-iana` `fc0dfc6` (bundle `main-AQRT7EVE.js`) · só frontend
- **Salvar/renomear pipeline** (`nomear-pipeline-dialog`): campo convertido para `.campo-*`
  (arredondado, com ícone + contador de caracteres), igual ao login.
- **Arredondamento global** dos `mat-form-field` outline restantes (modais de coleta/CSV/
  visualização de dados e o editor de conteúdo do tutor): cantos 10px, borda 2px, foco roxo —
  **override CSS seguro**, sem alterar markup/comportamento dos controles Material (mat-select,
  máscaras). Build + 115/115.

## 2026-07-06 (design: campos de Turmas no estilo do login)

### Frontend `mestrado-iana` `27d2dcd` (bundle `main-SGZFKQEX.js`) · só frontend
- As telas de **Turmas** usavam `mat-form-field` outline ("quadradão, sem profundidade"),
  destoando do login. Novo conjunto **reutilizável `.campo-*`** (global em `styles.scss`) com o
  visual do login (borda 2px arredondada, ícone, foco com anel roxo). Aplicado em `view-professor`
  (criar turma), `turma-detalhe` (adicionar aluno, criar atividade — inputs e **selects**) e
  `entrar-turma` (código). Build + 115/115.

## 2026-07-05 (admin: supervisão global de turmas)

### Frontend `mestrado-iana` `61ccf8f` (bundle `main-5IB3SKSX.js`) + backend `77aeeda`
- Admin passa a **ver/gerenciar todas as turmas** (backend devolve todas para admin); o
  cabeçalho da lista mostra "Todas as turmas" (admin) vs "Minhas turmas" (professor).

## 2026-07-05 (admin herda capacidades de professor)

### Frontend `mestrado-iana` `cb08626` (bundle `main-TWZFP3KS.js`) + teste backend `e121c24`
- **Admin ganha as capacidades de professor** (Turmas & Atividades): `AuthGuard` libera a rota
  `view-professor` para admin; menu do usuário ganha **"Gerenciar turmas"** (→ `/view-professor`)
  para professor e admin; painel admin ganha o card **"Turmas & Atividades"**.
- Backend **inalterado** (já aceitava admin via `exigir_admin_ou_professor`, escopo por dono da
  turma); +teste de regressão (`test_criar_turma_admin`). Build + 115/115 + turmas 5 passed.

## 2026-07-05 (manutenção — dedup de menu + MarkdownPipe compartilhado)

### Frontend `mestrado-iana` `6fef786` (bundle `main-PHAXKDVA.js`) · só frontend
- **Dedup do menu do usuário:** `execucoes` e `view-admin` passam a usar o `<app-user-menu>`
  compartilhado; removida a lógica de menu duplicada (getters/métodos/`HostListener`) e os
  testes do menu inline (cobertos por `user-menu.component.spec`). Rotas idênticas (+ entrada
  "Minhas turmas" agora também nesses menus).
- **`MarkdownPipe` → `SharedModule`** (DashboardModule importa SharedModule): o visualizador de
  chat do aluno (`turma-detalhe`) renderiza a resposta do tutor com **markdown** (antes mostrava
  `**`/`#` crus). Sem mudança de comportamento nos demais usos. Build + 115/115. Backup
  `frontend-20260705-174127`.

## 2026-07-05 (correções da revisão — Turmas)

### Frontend `mestrado-iana` `4d2620a` (bundle `main-Q3ESLUUV.js`) + backend `14746d0`
- **Backend (ver CHANGELOG do back):** ranking por rótulo da métrica + dedup por aluno; chat do
  aluno gated por vínculo de turma; `is_public` e `atividade_id`/`turma_id` validados no servidor;
  `progresso` escopado à turma; índices; N+1 → agregações. 334 testes.
- **Frontend (#5):** o dashboard lia o queryParam `dataset` da atividade mas **nunca o usava** (o
  comentário prometia carregar o template). Agora o banner de atividade tem o botão **"Carregar
  dados"** que abre direto a etapa de Coleta; comentário corrigido. Build + 117/117.
- Deploy validado (front 200, API 200, endpoints gated 401). Backup `deploy-20260705-160308`.

## 2026-07-04 (Turmas & Atividades — professor/aluno — + correções e "publicar")

### Subsistema de Turmas (backend `aec30b7`+`e786757`; frontend bundles `main-PFBXCGYF.js` → `main-35UES7KI.js`)

- **Correções (Parte A):** logout ao "Voltar"/abrir projeto era navegação para a rota MORTA
  `/interno/view-aluno` (→ wildcard → login), corrigida para `/view-aluno` (galeria + meus-projetos);
  **UserMenuComponent** compartilhado (menu do usuário na galeria + "Painel admin"/"Usuários" no menu
  do admin); **logs vazios** (URL com `//sistema` duplo-barra corrigida no front + `get_last_logs`
  achatado no backend); **publicar pipeline** (checkbox no modal de salvar, só professor/admin → `is_public`).
- **Turmas & Atividades (Parte B):**
  - Backend: router `/turmas` (criar/gerir turmas, alunos, **entrar por código**, atividades com
    template = pipeline parcial, **ranking** por métrica, **progresso**), pipeline com
    `atividade_id`/`turma_id`, e `GET /tutor/chat/aluno/{id}/historico` gated professor (transcript
    completo, com auditoria — LGPD). Testes `test_turmas.py`; suíte 317+4 passed.
  - Frontend professor (`view-professor`): lista/criação de turmas; **turma-detalhe** com código +
    **QR code** + link de entrada, alunos (add por e-mail/remover), atividades (dataset + métrica),
    ranking, tabela de progresso e **visualizador do chat** do aluno.
  - Frontend aluno (`view-aluno/entrar`, lazy): entrar por código/link (`?codigo=` auto-join), listar
    turmas/atividades, "Fazer" → dashboard clássico com `?atividade=&turma=&dataset=`; a submissão
    salva fica ligada à atividade e alimenta o ranking. Dep nova: `qrcode`.
- Verificação: build prod + 117/117 (mestrado-iana). Backups `deploy-20260704-062257` … `-161346`.
- **Master:** port do subsistema Turmas é follow-up (não implantado).

## 2026-07-04 (4 correções de UX: relatório PDF, clique nos gráficos, contexto do chat, logout ao carregar projeto)

### Front (bundle `main-O6ARUHQO.js`, commit `fa98542`) · só frontend

- **Relatório PDF voltou a gerar:** removido o `jspdf-autotable` (o interop de import quebrava no
  bundle — `TypeError: n is not a function`); a tabela de métricas passou a ser **desenhada à mão**
  com jsPDF core (retângulos + texto + quebra de página). `RelatorioPdfService`.
- **Cliques nos controles do gráfico (zoom/link/info) destravados:** o **FAB do tutor da página**
  (`execucoes.component.scss`, `position:fixed`) tinha `z-index:2100` e flutuava **acima** do modal de
  métricas (CDK overlay ~1000), roubando os cliques. Rebaixado para `900` (drawer `2090→890`), abaixo
  do overlay — um modal aberto agora o cobre. (A correção anterior só tratava o drawer.)
- **Chatbot passa a conhecer os modelos treinados:** o contexto do chat só olhava `modeloSelecionado`
  (null na comparação) e dizia "você não selecionou um modelo" mesmo após treinar/avaliar. Agora inclui
  `modelosTreinados` (com hiperparâmetros), `modelos` selecionados e `avaliacoes`; `modelo` cai no 1º
  treinado quando não há selecionado. Vale para o modal (`getContextoChat`) e a página
  (`montarContextoChat`). O backend já repassa o contexto inteiro (`json.dumps`) — sem mudança de backend.
- **Carregar projeto salvo não desloga mais admin/professor:** abrir um projeto navega para `view-aluno`
  (área clássica compartilhada); o `AuthGuard` só permitia isso ao aluno e mandava admin/professor ao
  `/autenticacao/login` (parecia "deslogar") — o backend nem recebia o `GET /pipelines/{id}`. Agora
  admin/professor também carregam `view-aluno`, e um autenticado com papel errado vai para a HOME do
  papel (`roleMap`), não para o login.
- **Master (`1d593ca`, não implantado):** mesmas 4 correções (auth adaptado às rotas do master —
  `projetos`/`trilha`/`galeria` para admin/professor).
- Verificação: build prod + 117/117 (mestrado-iana) / 108/108 (master). Backup `deploy-20260704-062257`.

## 2026-07-04 (exportar o modelo já treinado + código para usá-lo)

### Zip do pipeline passa a incluir o modelo treinado (MLflow) + `usar_modelo.py`. Front (bundle `main-CYDRHMCG.js`) · Back `b94ca13`

- **O zip exportado agora leva o modelo JÁ treinado + como reutilizá-lo:** pasta `modelo/`
  (formato MLflow — `MLmodel`, `model.pkl`, `requirements.txt`, `python_env.yaml`, `input_example`)
  e um **`usar_modelo.py`** gerado (carrega via `mlflow.sklearn.load_model("modelo")` e prevê um
  exemplo). README com a seção "Como usar o modelo". Multi-modelo: cada um em `modelos/<nome>/`.
- **Backend `b94ca13`:** o treino passa a logar o modelo como **flavor `mlflow.sklearn`** (não só
  bytes brutos) → o MLflow gera as configs + exemplo de uso; novo endpoint
  **`GET /classificador/modelo/{id}/artefato`** devolve um `.zip` do dir `model/` do MLflow
  (fallback: `model.pkl` + `requirements.txt` fixo). Bytes no Mongo intactos (`/prever` inalterado).
  Correções: loga no run já ativo (evita "Run already active"); `serialization_format=cloudpickle`
  (o default skops do MLflow 3.x recusa o KDTree do KNN).
- **"Salvar no projeto":** o projeto já persiste `resultadoTreinamento` (com `id` + `mlflow_run_id`),
  então recarregar o projeto mantém a referência ao modelo (usável por `/prever`/`/avaliar`); com o
  log de flavor, o modelo fica navegável em `/view-admin/artefatos`.
- **Front:** `DashboardService.baixarModeloArtefato(id)` (blob, auth via interceptor);
  `ScriptGeneratorService.anexarModeloTreinado` (baixa, mescla o zip sob `modelo/`, escreve
  `usar_modelo.py`); `execucoes.baixarPipeline` passa `resultadoTreinamento`. **Trilha** (master
  `3b6977c`, não implantado): mesmo anexo por ramo no `exportar()`.
- Verificação: backend 317 passed (+2 novos do endpoint); fluxo MLflow (log→download→zip→load→predict)
  validado por script; front build + 117/117 (mestrado-iana) / 108/108 (master); endpoint 401 em prod.
  Backup `deploy-20260704-053304`. **Modelos treinados ANTES deste deploy** caem no fallback joblib.

## 2026-07-04 (relatório PDF, nome do experimento nos downloads e fix de clique nos gráficos)

### Relatório em PDF + arquivos por nome do experimento + drawer não bloqueia clique. Front (bundle `main-KVS5ZUGR.js`) · Back `32ac226`

- **Relatório em PDF (Clássico)**: o botão "Baixar relatório" do painel de métricas passa a
  gerar um **PDF completo** (capa com nome do experimento + dataset + modelos, tabela de métricas,
  seção "O que observar" e, por gráfico, imagem + discussão) em vez do `.md` anterior. Novo
  `RelatorioPdfService` (jsPDF + jspdf-autotable **carregados lazy** — bundle inicial inalterado).
- **Downloads usam o nome do experimento salvo**: `pipeline_<nome>.zip` e `relatorio_<nome>.pdf`
  (ex.: experimento "overfit" → `pipeline_overfit.zip`/`relatorio_overfit.pdf`). Sem nome salvo,
  mantém o nome genérico. Util `slugificarNome`; o nome é propagado por `pipelineAtual$` →
  `execucoes` → `modal-execucao` → `metrica-avaliacao`.
- **Fix cliques bloqueados nos controles do gráfico** (zoom/link/info): o painel do tutor (drawer
  fixo) ganhou `pointer-events: none` quando **fechado** — mesmo deslocado para fora da tela ele
  podia interceptar o clique (agravado pelo bloco contido de um ancestral com `transform` no
  mat-dialog). Aplicado no `modal-execucao` e no `execucoes`.
- **Backend `32ac226`**: legenda do gráfico "Erros de Predição por Classe" movida para **fora das
  barras** (`ax.legend` com `bbox_to_anchor` à direita). **Re-rodar a avaliação** para regenerar os PNGs.
- **Master (`e46813d`, não implantado)**: mesmas mudanças + relatório PDF também na **Trilha**
  (botão "Relatório (PDF)" no modal de exportação; zip da Trilha passa a usar o nome do projeto).
- Verificação: build prod OK, 117/117 testes (mestrado-iana) e 108/108 (master); PDF e legenda
  validados por render. Backup `deploy-20260704-043623`.

## 2026-07-03 (fix 404 intermitente em prod + API movida p/ `/h2ia/tutor/api/`)

### Bug de infra: dois serviços na porta 8002 · API isolada sob o prefixo do tutor. Front (bundle `main-ZQCG37CJ.js`) · nginx + infra

- **Fix do 404 intermitente (infra, sem código):** havia **dois serviços systemd escutando a
  porta 8002** via SO_REUSEPORT — `h2ia-backend.service` (código atual, `/home/ubuntu/ensinado-aprendizado-maquina-back`)
  e uma cópia ANTIGA `h2ia-tutor.service` (`/home/ubuntu/servers/h2ia_tutor/backend`, commit
  `2a31d00` de 11/06). O kernel balanceava conexões entre os dois, então parte das requisições
  caía no backend velho → **404 intermitente** em rotas novas (`conf_pipeline/pre_processamento/todos`,
  `atividades/lote`, `sistema/erro`, `configurar_treinamento/.../redividir`), enquanto `/docs`
  respondia 200. Fix: `stop` + `disable` do `h2ia-tutor.service` (unit salvo em
  `/home/ubuntu/backups/h2ia-tutor.service.disabled-*`) e `restart` do `h2ia-backend.service`.
- **API movida de `/h2ia/api/` → `/h2ia/tutor/api/`:** todo o app do tutor agora vive sob
  `/h2ia/tutor/`; nada fica solto direto em `/h2ia/` (que hospeda outros apps: enade, proxy,
  checker, vlp…). Mudança: nginx renomeia a `location` (proxy segue p/ 8002) + `environment.prod.ts`
  (`apiUrl`). O path antigo `/h2ia/api/` foi **removido** (corte limpo — abas antigas quebram até dar F5).
- Verificação: build prod OK; ao vivo novo path 401/405/422 (rota existe), path antigo 404, docs 200,
  frontend 200. Backup `/home/ubuntu/backups/deploy-20260703-232436`.

## 2026-06-26 (limpeza do painel admin — código morto + logs expostos)

### Remove wizards mortos do conf-tutor, duplicata de "Usuários" e expõe logs. Front (bundle `main-ZGZOF4J5.js`) · só frontend
- **Código morto removido (−1066 linhas):** 7 componentes "wizard" do `conf-tutor` que estavam
  declarados no módulo mas **nunca renderizados** (só `tutor-elementos-catalogo` é usado):
  `tutor-inicio`, `tutor-coleta-dados`, `tutor-selecao-modelo`, `tutor-treinamento`,
  `tutor-avaliacao`, `tutor-selecao-metricas`, `tutor-tipos-aprendizado`. Removido também o
  `QuillModule` do `conf-tutor` (ficou órfão após a limpeza).
- **Navegação:** removido o item **"Usuários" duplicado** do dropdown do avatar (segue como card
  no painel); método `navegarParaUsuarios()` órfão removido.
- **Logs expostos:** `logs-erros` e `logs-backend` tinham rota mas **nenhum menu** apontava para
  elas (só por URL). Adicionados dois cards no painel admin ("Logs de Erros" → `/sistema/erros`;
  "Logs do Backend" → `/sistema/logs-backend`). Endpoints já existentes no backend.
- Verificação: 117/117 testes + build prod OK.

## 2026-06-26 (textos de apoio: Básico/Avançado + código Python colorido + links)

### Cards educacionais DB-driven com código colorido e link Yellowbrick. Front `76dc145` (bundle `main-DR46LGHV.js`) · Back `9b9265c`
- **Código Python colorido (modo Avançado)**: highlight.js carregado **lazy** (core + python via
  `import()` dinâmico, memoizado) — `HighlightService` + diretiva `appHighlightCode` no card do
  tutor, com **fallback para texto puro** se offline. Tema dark escopado em `.codigo-bloco`. Não
  pesa no bundle inicial (chunk lazy separado).
- **Todos os elementos com Básico + Avançado + link** (conteúdo vem do DB — ver back `9b9265c`):
  - `link_yellowbrick` em `TutorItemInfo` + render no card (irmão do link sklearn).
  - Pré-processamento e coleta agora **100% DB-driven**: removidos os dicts hardcoded de
    `getItemInfo` (caem em stub mínimo quando sem `conteudo`).
  - **Gráficos** (modal de avaliação): a "dica" reusa o `<app-tutor>` com split Básico/Avançado
    por `grafico_id` (`db.graficos`), com fallback ao texto hardcoded; `getConteudoGraficos`/
    `getConteudoDataset` no `DashboardService`.
  - Helper único `conteudo-to-item-info` (mapeamento DB→card), reusado em execucoes e nos gráficos.
- **Admin (`ConteudoEditor`)**: novos campos **Resumo básico** (modo Básico) e **Link Yellowbrick**.
- **Seleção de métricas**: o toggle "selecionar todas do grupo" agora mostra o rótulo **Todos/Nenhum**
  (e troca o ícone) conforme o clique vá marcar ou desmarcar.
- Verificação: **117/117** testes + build prod OK (highlight.js em chunk lazy).

## 2026-06-26 (branding — branch `mestrado-iana`)

### Nome exibido "Mestrado Iana". Front `8afdf3b` (bundle `main-NJP3DCSL.js`) · só frontend
- Logo "Iana" → **"Mestrado Iana"** no shell (sidebar) e nas telas de login e ativar-conta.
- Título da aba do navegador (`index.html`): `EnsinadoAprendizadoMaquina` → **`Mestrado Iana`**.
- Títulos de docs (`CHANGELOG.md`, `docs/DOCUMENTACAO.md`): `Iana` → `Mestrado Iana`.
- **Não** alterado: orgs do GitHub (`IanaMary/...`), caminhos, e a prosa do manual/script gerado
  (evita texto truncado tipo "à Mestrado Iana").
- Backend inalterado. Backup de produção: `/home/ubuntu/backups/deploy-20260626-051255`.
- Validação: frontend 200, `<title>Mestrado Iana</title>` servido, `/api/docs` 200, backend active.

## 2026-06-26 (deploy em produção — branch `mestrado-iana`)

### Deploy da branch `mestrado-iana` (Modo Clássico + Admin). Front `9b7b92c` (bundle `main-LCRSEPVQ.js`) · só frontend
- **Primeiro deploy do split**: produção (`https://absapt.tk/h2ia/tutor/`) passa a servir a branch
  `mestrado-iana` (**Modo Clássico** `/view-aluno` + painel admin `/view-admin`; sem os modos
  lúdicos Treine seu Robô / Léo no Mundo Real / Trilha). Conteúdo da branch descrito na entrada
  de 2026-06-25 (split) abaixo.
- Backend **inalterado** (`3654547`); deploy só de frontend.
- Verificação: build prod OK + 108/108 testes. Backup de produção:
  `/home/ubuntu/backups/deploy-20260626-013633`.
- Validação pós-deploy: frontend 200, `/api/docs` 200, `h2ia-backend.service` active.

## 2026-06-25 (split — branch `mestrado-iana`)

### Branch `mestrado-iana` — Modo Clássico + Admin only. Front `a57c99f`
- **Split do repositório em duas bases de código:**
  - `mestrado-iana` = **Modo Clássico** (`/view-aluno` com Projetos e Galeria) + painel admin
    (`/view-admin`). Modos lúdicos do aluno removidos (Treine seu Robô, Léo no Mundo Real,
    Trilha de ML).
  - `master` = sistema-completo (admin + 3 modos lúdicos; `/view-aluno` removido).
  - `desenvolvimento` = versão combinada original (snapshot, preserva todos os modos).
- **Removido** desta branch: `interno/treine-robo/`, `leo-mundo-real/`, `trilha/`.
- `interno-routing`: removidas rotas `trilha`/`treine-robo`/`leo-mundo-real` e seletor `inicio`
  (default redirect → `/view-aluno`).
- `AuthGuard ROTAS_POR_PAPEL.aluno`: `['view-aluno']`.
- `roleMap.aluno`: `/view-aluno`.
- `dashboard.component`: removidos `irParaTrilha()` e `voltar()`, botão Trilha e botão Voltar.
- `manual`: removida seção "Trilha de ML".
- `package.json`: removidas 4 deps `@tensorflow/*` (tfjs, tfjs-backend-webgpu,
  tfjs-models/mobilenet, tfjs-models/knn-classifier). `angular.json`: `allowedCommonJsDependencies`
  (seedrandom/node-fetch/string_decoder/long) removidas — eram só do TensorFlow.js.
- `dashboard.service`: removido `classificadorPrever` (só usado por treine-robo).
- Backup não-destrutivo (sem deploy). Build prod OK + 108/108 testes.

## 2026-06-25

### Menu do usuário (avatar + Sair) no `/view-admin` + ajustes de UX no modal de métricas. Front `7ec88d1` (bundle `main-RVMAUYPM.js`) · só frontend
- **Menu do usuário no `/view-admin`**: reescrito no mesmo padrão do dashboard `execucoes.component`
  (`.admin-header > .header-actions > .usuario-menu` com `.usuario-avatar-btn`, dropdown
  `.usuario-dropdown`含 `.usuario-header`/`.usuario-avatar-grande`/`.usuario-papel` e blocos de
  `.usuario-opcoes`). Opções: **Meus Projetos**, **Galeria**, **Usuários**, **Sair**. Carrega
  `name`/`email`/`role` do `sessionStorage` via `AuthService`, fecha ao clicar fora
  (`@HostListener('document:click')` + `closest('.usuario-menu')`) e usa `authService.logout()`.
  `MatTooltipModule` adicionado ao `ViewAdminModule`.
- **Specs corrigidos**: `LogsErrosComponent`/`LogsBackendComponent` (faltavam `HttpClientTestingModule`
  + `MatIconModule`/`MatProgressSpinnerModule`/`MatTableModule` e usavam `imports` em vez de
  `declarations`). 108/108 verdes.
- **Modal de seleção de métricas** (`selecao-metricas.component`):
  - Botões "Selecionar todas" e "Selecionar todas do grupo" deixaram de ser `mat-icon-button` (o
    ripple persistente do MDC descentralizava o glifo) e viraram `<button type="button">` simples,
    alinhado via CSS existente.
  - **Agregação multiclasse** (`media-config` com Weighted/Macro/Micro) agora aparece **dentro do
    grupo "Classificação"**, junto às métricas às quais se refere, em vez de flutuar ao fim do
    modal. Build OK + 108/108.

### Menu do usuário (avatar + Sair) no `/view-admin` (versão inicial). Front `2f0c58b` (bundle `main-PDMQHJR7.js`) · só frontend
- Versão inicial do menu de avatar (estilo `/inicio`), posteriormente reescrita no padrão do
  dashboard em `7ec88d1`. Ver item acima.

## 2026-06-23

### `:host{display:block}` nos componentes da barra (overflow cross-browser). Front `7480e32` (bundle `main-R3EI5OEE.js`) · só frontend
- O host do `app-pipeline` e dos 4 filhos era `display:inline` (padrão). Fora do Chrome, host
  inline com filho flex em bloco encolhe ao conteúdo (rótulos longos) e **estoura a barra**. Adicionado
  `:host{display:block;min-width:0;max-width:100%}` aos 5 componentes. Verificado por medição headless:
  item mais longo 205px dentro da barra de 236px, rótulo truncando. Build OK + 106/106.

### Itens da barra não vazam mais a largura (host inline + min-width). Front `2bac8e7` (bundle `main-2VELERHM.js`) · só frontend
- Os hosts dos componentes-filhos da barra eram `display:inline` (padrão Angular), deixando os
  rótulos (sem quebra) definirem a largura e **vazarem para fora da barra**. Forçado `display:block`
  + `min-width:0` + `max-width:100%` nesses hosts e em toda a cadeia de containers flex, e
  `max-width:100%` no `.pipeline-item` — os rótulos truncam dentro da barra. Build OK + 106/106.

### Barra presa à viewport + gate de preditores por categoria da lane. Front `5913237` (bundle `main-WDLGRJP4.js`) · só frontend
- A barra do pipeline **não cresce mais até o fim da página** — fica presa à viewport
  (`align-self:flex-start` + `position:sticky` + `max-height: calc(100vh - topbar)`) e rola
  internamente.
- **Gate de preditores por categoria da lane**: com um preditor na lane de treino, só ficam
  habilitados os da **mesma categoria** (classificador↔classificador etc., para comparação); lane
  vazia → todos habilitados; **"Limpar" reseta** (todos voltam). Substitui o gate por tipo do alvo do
  dataset. Build OK + 106/106.

### Ícones de ação do cabeçalho + preditores arrastáveis (fail-open). Front `b0ec8c5` (bundle `main-QZSPO2VL.js`) · só frontend
- Os 4 ícones de ação do cabeçalho da barra deixaram de ser `mat-icon-button` (a 28px o padding
  interno do Material cortava o glifo → "quebrados") e viraram `<button>` simples com sizing próprio.
- `habilitadarModelos` virou **fail-open**: quando nenhum modelo casa com o tipo do target (gate mal
  configurado/dado divergente), **não desabilita todos** — os preditores ficam arrastáveis; a
  compatibilidade segue reforçada na etapa de seleção do modelo. Build OK + 106/106.

### Voltar como seta antes de "Pipeline". Front `76ae8ef` (bundle `main-CT6QRDG6.js`) · só frontend
- A seta de **Voltar** (só ícone) substitui o `account_tree` do cabeçalho da barra, **antes** do
  título "Pipeline" (→ `/inicio`); removida do cabeçalho da área de trabalho. Cabeçalho ajustado
  para caber seta + título + 4 ações em 260px. Build OK + 106/106.

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
