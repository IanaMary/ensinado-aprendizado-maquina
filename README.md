# H2IA Tutor — Frontend (Angular)

Interface da plataforma educacional **H2IA Tutor**, onde estudantes do ensino fundamental e
médio montam um **pipeline de Aprendizado de Máquina** completo — dos dados à avaliação — com
um tutor que explica cada etapa.

Produção: <https://absapt.tk/h2ia/tutor/> · API: [`ensinado-aprendizado-maquina-back`](https://github.com/IanaMary/ensinado-aprendizado-maquina-back)

## O que o app faz

- **Área de Trabalho** (aluno): quatro colunas — Coleta → Pré-processamento → Treinamento →
  Métricas. Os itens são arrastados para as colunas e um assistente de 6 etapas conduz o
  carregamento dos dados, o treino (scikit-learn **de verdade**, no servidor) e a avaliação.
- **Tutor**: painel com conteúdo didático por item em dois níveis (Básico/Avançado) e um
  **chat com LLM** ciente do pipeline atual (dados, modelo, hiperparâmetros, métricas e o
  código gerado). O painel abre com boas-vindas e um resumo de como usar o sistema.
- **Desafios de montagem**: quebra-cabeças em que o aluno monta o pipeline **sem executar** e
  recebe nota 0–10 com retorno por regra da rubrica.
- **Turmas** (professor): código/QR de entrada, atividades, ranking e progresso da turma.
- **Administração**: catálogo do pipeline (habilitar itens, execução, conteúdo educacional),
  configuração do tutor, artefatos MLflow, telemetria e logs.
- **Exportação**: código Python executável, modelo treinado e relatório em PDF (`.zip`).

Manual ilustrado por papel dentro do app em **`/manual`**; a tela **`/sobre`** descreve a
dissertação que originou a plataforma.

## Stack

Angular 19 (módulos + componentes standalone), Angular Material e CDK (drag-and-drop), RxJS,
SCSS. Bibliotecas de apoio: `highlight.js` (código colorido no tutor), `jspdf` +
`jspdf-autotable` (relatório), `jszip` + `file-saver` (pacote de exportação), `xlsx`,
`qrcode`, `ngx-quill`, `ngx-mask`.

## Rodando localmente

Requer Node 20+ e a API rodando (veja o README do backend).

```bash
npm install
npx ng serve --port 4200          # http://localhost:4200/
```

O `environment.ts` (desenvolvimento) aponta para `http://localhost:8000/`; o
`environment.prod.ts` usa o caminho relativo `/h2ia/tutor/api/`.

### Verificação

```bash
npx ng test --watch=false --browsers=ChromeHeadless   # 147 testes
npx ng build --configuration production
```

> **Se o `ng serve` abrir uma página em branco** (já aconteceu após trocar de branch, sem erro
> no console): sirva o **build de produção** sob o caminho `/h2ia/tutor/` — o `index.html` tem
> `<base href="/h2ia/tutor/">` e servir na raiz também dá tela branca — com fallback SPA e
> proxy de `/h2ia/tutor/api/*` para a API local.

## Estrutura

```
src/app/
├── dashboard/            # Área de Trabalho: lanes, assistente (modals/), tutor e chat
│   ├── execucoes/        #   tela principal do aluno + modais (coleta, avaliação…)
│   ├── tutor/            #   painel didático (Básico/Avançado, código colorido)
│   └── chat-tutor/       #   chat com o LLM, ciente do contexto
├── interno/              # Telas autenticadas
│   ├── inicio/           #   seletor de experiência do aluno
│   ├── trilha/           #   Trilha de ML (ramos paralelos, estilo Orange)
│   ├── treine-robo/      #   wizard lúdico de treino
│   ├── leo-mundo-real/   #   classificação de imagens no navegador (TF.js)
│   ├── view-aluno/       #   pipeline, projetos, galeria, turmas e desafios
│   ├── view-professor/   #   turmas, atividades, ranking, progresso
│   ├── view-admin/       #   usuários, artefatos, telemetria, logs
│   ├── conf-pipeline/    #   catálogo do pipeline (admin)
│   ├── conf-tutor/       #   boas-vindas do tutor e LLM (admin)
│   └── desafio/          #   desafio de montagem (aluno)
├── externo/              # Login, cadastro, ativação de conta
├── shared/               # SharedModule: topbar, user-menu, brand-logo, manual, sobre
├── service/              # Serviços globais (auth, pipeline, turma, exportação…)
├── interceptors/         # Token, telemetria e tratamento de erro HTTP
└── styles/               # Variáveis (colores.scss), fontes e lanes
```

Convenções que economizam retrabalho:

- **SCSS de componente importa `styles/colores.scss`** (só variáveis), **nunca** `styles.scss`
  — o global já é injetado pelo `angular.json` e reimportá-lo duplica todo o CSS.
- Botões usam as classes globais **`.btn-primario` / `.btn-secundario`**.
- Marca e tipografia (Maven Pro, logos) vêm de `src/styles/fontes.scss` (global) e do
  componente **`<app-brand-logo>`**.
- **Não existe barra lateral de navegação**: cada tela traz seu próprio cabeçalho
  (`<app-topbar>` ou header próprio) com `<app-user-menu>`.
- O aviso de erro HTTP ao usuário sai do `ErrorInterceptor` (um toast por resposta); o
  `AuthInterceptor` cuida apenas do logout no 401.

## Branches

| Branch | Papel |
|---|---|
| **`master`** | **Esta branch.** Traz as experiências extras do aluno: **Trilha de ML** (`/trilha`), **Treine seu Robô** (`/treine-robo`) e **Léo no Mundo Real** (`/leo-mundo-real`, classificação de imagens no navegador com TensorFlow.js). |
| `mestrado-iana` | **Produção**: é ela que é publicada em `/var/www/h2ia/tutor`. Não tem as experiências acima. |

As duas compartilham quase tudo, mas **divergiram** (inclusive no `package.json`): mudanças
comuns entram nas duas, normalmente por `cherry-pick` com conflitos pequenos, e é preciso
rodar `npm install` ao trocar de branch antes de compilar.

## Deploy

O build de produção é publicado **por cima** do diretório servido pelo nginx (sem `rm -rf`,
para que abas já abertas continuem encontrando os chunks antigos). Os comandos exatos, o backup
e a validação pós-deploy ficam com o time do projeto; o histórico de cada publicação está no
[`CHANGELOG.md`](CHANGELOG.md).

## Autoria

Plataforma desenvolvida no contexto da dissertação de mestrado de **Iana Mary Costa** no
Programa de Pós-Graduação em Computação (PPGC) da **UFPel**, com o Hub de Inovação em
Inteligência Artificial (H2IA). A tela `/sobre` no app traz a autoria completa (orientação e
coorientação).
