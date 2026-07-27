import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { roleMap } from '../../models/item-coleta-dado.model';

interface SecaoManual {
  id: string;
  titulo: string;
  icone: string;
  conteudo: string;
}

interface ManualUsuario {
  tipo: string;
  titulo: string;
  descricao: string;
  icone: string;
  secoes: SecaoManual[];
}

@Component({
  selector: 'app-manual',
  templateUrl: './manual.component.html',
  styleUrls: ['./manual.component.scss'],
  standalone: false
})
export class ManualComponent implements OnInit {
  manualAtual: ManualUsuario | null = null;
  secaoAtiva = '';
  manuais: Record<string, ManualUsuario> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.carregarManuais();

    this.route.queryParams.subscribe(params => {
      const tipo = params['tipo'] || 'aluno';
      this.selecionarManual(tipo);
    });
  }

  selecionarManual(tipo: string): void {
    this.manualAtual = this.manuais[tipo] || this.manuais['aluno'];
    if (this.manualAtual.secoes.length > 0) {
      this.secaoAtiva = this.manualAtual.secoes[0].id;
    }
  }

  selecionarSecao(secaoId: string): void {
    this.secaoAtiva = secaoId;
  }

  getConteudoSecaoAtiva(): string {
    if (!this.manualAtual) return '';
    const secao = this.manualAtual.secoes.find(s => s.id === this.secaoAtiva);
    return secao?.conteudo || '';
  }

  voltar(): void {
    const role = sessionStorage.getItem('role') || '';
    this.router.navigateByUrl((role && (roleMap as any)[role]) || '/autenticacao/login');
  }

  private carregarManuais(): void {
    this.manuais = {
      'aluno': this.getManualAluno(),
      'professor': this.getManualProfessor(),
      'admin': this.getManualAdmin()
    };
  }

  private getManualAluno(): ManualUsuario {
    return {
      tipo: 'aluno',
      titulo: 'Manual do Aluno',
      descricao: 'Aprenda a montar, treinar e avaliar pipelines de Aprendizado de Máquina no H2IA Tutor',
      icone: 'school',
      secoes: [
        {
          id: 'visao-geral',
          titulo: 'Visão Geral',
          icone: 'info',
          conteudo: `
            <h2>Bem-vindo(a) ao H2IA Tutor!</h2>
            <p>Aqui você monta um <strong>pipeline de Aprendizado de Máquina</strong> completo — dos dados à avaliação —
            com um tutor que explica cada passo. O que você pode fazer:</p>
            <ul>
              <li><strong>Carregar dados</strong> (arquivo, URL ou dataset de exemplo) e configurar a divisão treino/teste</li>
              <li><strong>Preparar os dados</strong> com pré-processamento (escala, categorias, valores faltantes)</li>
              <li><strong>Treinar modelos reais</strong> (scikit-learn) e ajustar hiperparâmetros</li>
              <li><strong>Comparar vários modelos</strong> lado a lado, com as mesmas métricas</li>
              <li><strong>Avaliar</strong> com métricas e gráficos (matriz de confusão, resíduos etc.)</li>
              <li><strong>Perguntar ao tutor</strong> — conteúdo didático + chat com IA ciente do seu pipeline</li>
              <li><strong>Exportar tudo</strong>: código Python executável, modelo treinado e relatório em PDF</li>
            </ul>
            <h3>Como se orientar</h3>
            <ul>
              <li><strong>Área de Trabalho:</strong> as 4 lanes do pipeline (Coleta → Pré-processamento → Treinamento → Métricas). Clique num item para abrir a etapa; o ícone <strong>ⓘ</strong> abre a explicação no tutor.</li>
              <li><strong>Menu do usuário</strong> (avatar no canto): Meus Projetos, Galeria, Minhas turmas, Manual e Sobre.</li>
              <li><strong>Robô flutuante</strong> (borda direita): abre o painel do tutor + chat.</li>
            </ul>
            <figure class="manual-figura">
              <img src="assets/manual/area-trabalho.jpg" alt="Área de Trabalho com as quatro lanes do pipeline">
              <figcaption>Área de Trabalho: as lanes Coleta → Pré-processamento → Treinamento → Métricas.</figcaption>
            </figure>
            <figure class="manual-figura">
              <img src="assets/manual/aluno-menu.jpg" alt="Menu do usuário do aluno">
              <figcaption>Menu do usuário (avatar no canto): Meus Projetos, Galeria, Minhas turmas, Manual e Sobre.</figcaption>
            </figure>
            <figure class="manual-figura">
              <img src="assets/manual/login.jpg" alt="Tela de login do H2IA Tutor">
              <figcaption>Tela de entrada: acesse com seu e-mail e senha.</figcaption>
            </figure>
          `
        },
        {
          id: 'coleta',
          titulo: 'Carregar Dados',
          icone: 'upload_file',
          conteudo: `
            <h2>Etapa 1 — Coleta de Dados</h2>
            <p>Clique no item da lane <strong>Coleta</strong> para abrir o assistente. Três formas de trazer dados:</p>
            <ul>
              <li><strong>Arquivo:</strong> CSV, TSV, Excel (.xls/.xlsx) ou JSON. Em CSV você confere o separador
                (vírgula/ponto-e-vírgula) e o encoding (UTF-8) antes de importar. Dá para enviar um arquivo
                só de treino (o sistema divide) ou também um arquivo separado de teste.</li>
              <li><strong>URL:</strong> cole o link de um CSV público (ex.: datasets de aula) e o servidor baixa para você.</li>
              <li><strong>Dataset de exemplo:</strong> bases clássicas prontas (Iris, Wine, Câncer de Mama…), ótimas para praticar.</li>
            </ul>
            <h3>Configurações importantes</h3>
            <ul>
              <li><strong>Tipo de predição:</strong> Classificação (prever uma categoria), Regressão (prever um número)
                ou exploratório/agrupamento.</li>
              <li><strong>Rótulo (target):</strong> a coluna que o modelo vai aprender a prever. Em classificação pode
                ser <em>Texto</em> ou <em>Número</em> (ex.: 0/1); em regressão, precisa ser <em>Número</em>.</li>
              <li><strong>Atributos:</strong> escolha quais colunas entram como entrada do modelo.</li>
              <li><strong>Divisão treino/teste:</strong> padrão 70%/30%, ajustável — com <strong>shuffle</strong>
                (embaralhar) e <strong>estratificação</strong> (manter a proporção das classes).</li>
            </ul>
            <p><strong>Dica:</strong> a primeira linha do arquivo deve conter os nomes das colunas; dados limpos
            geram modelos melhores.</p>
            <figure class="manual-figura">
              <img src="assets/manual/coleta.jpg" alt="Assistente de coleta de dados com datasets de exemplo">
              <figcaption>Assistente de coleta: abas Arquivos / Toy Datasets / URL — aqui os datasets de exemplo (Iris, Wine…).</figcaption>
            </figure>
          `
        },
        {
          id: 'pre-processamento',
          titulo: 'Pré-processamento',
          icone: 'transform',
          conteudo: `
            <h2>Etapa 2 — Pré-processamento (opcional)</h2>
            <p>Prepare os dados antes do treino. A etapa mostra os <strong>tipos de colunas detectados</strong>
            (numéricas × categóricas) e você escolhe as transformações e em quais colunas aplicar:</p>
            <ul>
              <li><strong>Scalers</strong> (StandardScaler, MinMaxScaler, RobustScaler, Normalizer): colocam colunas
                <em>numéricas</em> na mesma escala — essencial para KNN, K-Means e SVM.</li>
              <li><strong>Encoders</strong> (OneHotEncoder, OrdinalEncoder): transformam colunas de <em>texto</em>
                em números que o modelo entende.</li>
              <li><strong>LabelEncoder:</strong> aplicado ao rótulo quando ele é texto categórico.</li>
              <li><strong>Imputers</strong> (SimpleImputer): preenchem valores faltantes com média/mediana/mais frequente.</li>
              <li><strong>Transformers</strong> (PolynomialFeatures, PowerTransformer): criam ou ajustam features.</li>
            </ul>
            <p><strong>Importante:</strong> o que você configura aqui é aplicado <em>de verdade</em> no treino
            (num Pipeline do scikit-learn) e aparece no código Python exportado.</p>
          `
        },
        {
          id: 'treinar-avaliar',
          titulo: 'Treinar e Avaliar',
          icone: 'model_training',
          conteudo: `
            <h2>Etapas 3 a 6 — Modelo, Treino, Métricas e Avaliação</h2>
            <h3>Escolher o modelo</h3>
            <p>Selecione o algoritmo (KNN, Árvore de Decisão, Floresta Aleatória, SVM, Regressão Logística,
            Regressão Linear, K-Means…) e ajuste os <strong>hiperparâmetros</strong> — cada um tem explicação no tutor.</p>
            <h3>Treinar</h3>
            <p>O botão <strong>Treinar</strong> fica na barra inferior do assistente. O treino roda no servidor com
            scikit-learn de verdade; ao final você vê status, classes, amostras e os hiperparâmetros usados.</p>
            <h3>Comparar vários modelos</h3>
            <p>Na Área de Trabalho, <strong>arraste outro preditor</strong> para a lane Treinamento: o sistema treina o
            novo modelo com os mesmos dados e a avaliação compara todos lado a lado (métrica × modelo), destacando
            o melhor.</p>
            <h3>Métricas e gráficos</h3>
            <ul>
              <li><strong>Classificação:</strong> Acurácia, Precisão, Recall, F1… + matriz de confusão, relatório por
                classe, erros de predição e balanceamento.</li>
              <li><strong>Regressão:</strong> R², MAE, RMSE… + resíduos, erro de predição e Distância de Cook.</li>
              <li><strong>Agrupamento:</strong> Silhueta e afins.</li>
            </ul>
            <p>Clique em <strong>Gerar avaliações</strong> (barra inferior) para calcular. Cada gráfico tem ações de
            <strong>ampliar</strong>, <strong>documentação</strong> e <strong>dica didática</strong> (explicada em modo
            Básico/Avançado).</p>
            <figure class="manual-figura">
              <img src="assets/manual/selecao-modelo.jpg" alt="Seleção do modelo e hiperparâmetros">
              <figcaption>Etapa 3: escolha o algoritmo e ajuste os hiperparâmetros.</figcaption>
            </figure>
            <figure class="manual-figura">
              <img src="assets/manual/selecao-metricas.jpg" alt="Seleção das métricas de avaliação">
              <figcaption>Etapa 5: escolha as métricas e a forma de agregação (Weighted/Macro/Micro).</figcaption>
            </figure>
            <figure class="manual-figura">
              <img src="assets/manual/avaliacao.jpg" alt="Resultado da avaliação com tabela de métricas e matriz de confusão">
              <figcaption>Etapa 6: tabela de métricas e matriz de confusão do modelo treinado.</figcaption>
            </figure>
            <figure class="manual-figura">
              <img src="assets/manual/yellowbrick.jpg" alt="Visualização Yellowbrick da matriz de confusão">
              <figcaption>Visualizações Yellowbrick geradas na avaliação (matriz de confusão, relatório…).</figcaption>
            </figure>
          `
        },
        {
          id: 'tutor',
          titulo: 'Tutor e Chat',
          icone: 'smart_toy',
          conteudo: `
            <h2>O Tutor</h2>
            <p>O botão do <strong>robô</strong> (borda direita) abre o painel do tutor, com duas partes:</p>
            <h3>Conteúdo didático</h3>
            <ul>
              <li>Ao abrir sem clicar em nada, mostra as <strong>boas-vindas</strong> com o passo a passo da ferramenta.</li>
              <li>Clique no <strong>ⓘ</strong> de qualquer item (modelo, métrica, pré-processador, dados) para ver a
                ficha completa: descrição, intuição, exemplo, <strong>código Python colorido</strong>, quando usar/evitar,
                vantagens/desvantagens e links para a documentação oficial.</li>
              <li>Alterne entre <strong>Básico</strong> (linguagem simples) e <strong>Avançado</strong>. No Avançado
                aparecem a fórmula, os hiperparâmetros com o efeito de cada um e dois blocos a mais:
                <strong>Fundamentos</strong> (o que o método otimiza, pressupostos, custo computacional e leitura de
                referência) e <strong>Na prática</strong> (código completo com validação cruzada, o que ajustar primeiro,
                armadilhas e como perceber que deu errado).</li>
              <li>A escolha do nível fica <strong>guardada no seu perfil</strong>: vale em todos os painéis do tutor,
                continua valendo quando você voltar — e o <strong>chat responde na mesma profundidade</strong>.</li>
            </ul>
            <h3>Chat com IA</h3>
            <p>Abaixo do conteúdo há um <strong>chat</strong> que conhece o seu pipeline (dataset, modelos,
            hiperparâmetros, métricas e até o código gerado). Use as perguntas sugeridas ou escreva a sua.
            O tutor responde só sobre Aprendizado de Máquina e a plataforma — e nunca inventa números que não estão
            nos seus resultados.</p>
            <figure class="manual-figura">
              <img src="assets/manual/tutor.jpg" alt="Painel do tutor com conteúdo didático e chat com IA">
              <figcaption>Painel do tutor: conteúdo didático (Básico/Avançado) acima e o chat com IA embaixo.</figcaption>
            </figure>
          `
        },
        {
          id: 'projetos-galeria',
          titulo: 'Projetos e Galeria',
          icone: 'folder',
          conteudo: `
            <h2>Meus Projetos</h2>
            <ul>
              <li><strong>Salvar:</strong> botão "Salvar" no topo da barra do Pipeline — dê um nome ao experimento
                (ele também nomeia os arquivos exportados: <code>pipeline_&lt;nome&gt;.zip</code>, <code>relatorio_&lt;nome&gt;.pdf</code>).</li>
              <li><strong>Abrir/continuar:</strong> a lista em Meus Projetos restaura o pipeline exatamente onde parou.</li>
              <li><strong>Excluir</strong> e <strong>buscar</strong> por nome.</li>
            </ul>
            <h2>Galeria</h2>
            <p>Pipelines compartilhados por professores. Você pode abrir, estudar a configuração e
            <strong>copiar</strong> para a sua conta — e então trocar modelos, ajustar pré-processamento e
            comparar resultados.</p>
            <h2>Minhas Turmas</h2>
            <p>Entre numa turma com o <strong>código</strong> (ou QR) que o professor compartilhar. Atividades da
            turma abrem a Área de Trabalho com um banner indicando a tarefa — monte o pipeline e
            <strong>salve para enviar sua submissão</strong> (ela entra no ranking da atividade).</p>
            <figure class="manual-figura">
              <img src="assets/manual/aluno-projetos.jpg" alt="Tela Meus Projetos">
              <figcaption>Meus Projetos: seus pipelines salvos, com busca e filtros por status.</figcaption>
            </figure>
            <figure class="manual-figura">
              <img src="assets/manual/galeria.jpg" alt="Galeria de pipelines compartilhados">
              <figcaption>Galeria: pipelines compartilhados que você pode abrir e copiar para a sua conta.</figcaption>
            </figure>
            <figure class="manual-figura">
              <img src="assets/manual/aluno-turmas.jpg" alt="Tela Minhas Turmas do aluno">
              <figcaption>Minhas Turmas: entre com o código do professor e faça as atividades.</figcaption>
            </figure>
          `
        },
        {
          id: 'exportar',
          titulo: 'Exportar (código, modelo e PDF)',
          icone: 'download',
          conteudo: `
            <h2>Baixar Pipeline (ZIP)</h2>
            <p>O botão <strong>Baixar Pipeline</strong> gera um ZIP com tudo o que você fez:</p>
            <ul>
              <li><strong>pipeline.py</strong> — script Python completo e executável do seu pipeline (no modo
                comparação, um script que treina e compara todos os modelos)</li>
              <li><strong>data/treino.csv</strong> e <strong>data/teste.csv</strong> — seus dados (quando vieram de arquivo)</li>
              <li><strong>modelo/</strong> — o modelo <em>já treinado</em> (formato MLflow)</li>
              <li><strong>usar_modelo_joblib.py</strong> — carrega o modelo salvo e faz uma previsão (opção simples)</li>
              <li><strong>usar_modelo_mlflow.py</strong> — o mesmo, via MLflow</li>
              <li><strong>hub-ia.pdf</strong> — conheça o Hub de Inovação em IA (ia.ufpel.edu.br)</li>
              <li><strong>README.md</strong> — instruções de execução</li>
            </ul>
            <h3>Como executar</h3>
            <pre><code>pip install pandas numpy scikit-learn
python pipeline.py            # re-treina do zero
python usar_modelo_joblib.py  # usa o modelo já treinado</code></pre>
            <h2>Relatório em PDF</h2>
            <p>Na etapa de avaliação, <strong>Baixar relatório (PDF)</strong> gera um documento com o experimento:
            dataset, modelos, tabela de métricas, o que observar e os gráficos com discussão — pronto para
            entregar como atividade.</p>
          `
        }
      ]
    };
  }

  private getManualProfessor(): ManualUsuario {
    return {
      tipo: 'professor',
      titulo: 'Manual do Professor',
      descricao: 'Turmas, atividades, acompanhamento dos alunos e conteúdo compartilhado',
      icone: 'person',
      secoes: [
        {
          id: 'visao-geral',
          titulo: 'Visão Geral',
          icone: 'info',
          conteudo: `
            <h2>Painel do Professor</h2>
            <p>Além de tudo o que o aluno faz, você pode:</p>
            <ul>
              <li><strong>Criar e gerenciar turmas</strong>, com entrada por código ou QR</li>
              <li><strong>Propor atividades</strong> (com dataset sugerido) e acompanhar as submissões</li>
              <li><strong>Ver o ranking</strong> da atividade por métrica e o progresso da turma</li>
              <li><strong>Publicar pipelines na Galeria</strong> (públicos ou da turma)</li>
              <li><strong>Acompanhar a telemetria</strong> dos alunos (tela Atividades dos Usuários)</li>
              <li><strong>Ler as conversas dos seus alunos com o tutor</strong> (para entender as dúvidas)</li>
            </ul>
            <p>Acesse pelo <strong>Painel do Professor</strong> (home do seu papel) — cada tela tem a barra
            superior com o botão de voltar e o menu do usuário.</p>
            <figure class="manual-figura">
              <img src="assets/manual/prof-painel.jpg" alt="Painel do Professor">
              <figcaption>Painel do Professor: criar turma, lista de turmas e atalho para as atividades dos alunos.</figcaption>
            </figure>
            <figure class="manual-figura">
              <img src="assets/manual/prof-menu.jpg" alt="Menu do usuário do professor">
              <figcaption>Menu do professor: Meus Projetos, Galeria, Minhas turmas, Gerenciar turmas, Manual e Sobre.</figcaption>
            </figure>
          `
        },
        {
          id: 'turmas',
          titulo: 'Turmas',
          icone: 'groups',
          conteudo: `
            <h2>Criar e gerenciar turmas</h2>
            <ol>
              <li>No Painel do Professor, crie a turma (nome + descrição).</li>
              <li>Compartilhe o <strong>código da turma</strong> ou o <strong>QR code</strong> — o aluno entra
                sozinho (e confirma a matrícula antes, para evitar conta errada em computador compartilhado).</li>
              <li>Você também pode adicionar/remover alunos manualmente na tela da turma.</li>
            </ol>
            <h3>Detalhe da turma</h3>
            <ul>
              <li><strong>Alunos:</strong> lista com progresso e último acesso</li>
              <li><strong>Atividades:</strong> tarefas propostas e submissões recebidas</li>
              <li><strong>Chat dos alunos:</strong> transcript das conversas com o tutor (auditado e restrito
                às suas turmas — os alunos são menores de idade, trate com cuidado)</li>
            </ul>
            <figure class="manual-figura">
              <img src="assets/manual/prof-turma.jpg" alt="Detalhe da turma com código, QR, alunos, atividades e progresso">
              <figcaption>Detalhe da turma: código + QR de entrada, alunos, atividades (com dataset e métrica) e progresso.</figcaption>
            </figure>
          `
        },
        {
          id: 'atividades-ranking',
          titulo: 'Atividades e Ranking',
          icone: 'assignment',
          conteudo: `
            <h2>Propor atividades</h2>
            <p>Numa turma, crie uma atividade com título, descrição e, se quiser, um <strong>dataset sugerido</strong>.
            O aluno abre a atividade e a Área de Trabalho mostra um banner com a tarefa; ao <strong>salvar</strong>
            o pipeline, a submissão fica ligada à atividade.</p>
            <h3>Ranking</h3>
            <p>Escolha a <strong>métrica</strong> (ex.: Acurácia) e veja o ranking das submissões — uma por aluno
            (vale a melhor). Use para gamificar ou para discutir por que um pipeline foi melhor que outro.</p>
            <h3>Progresso</h3>
            <p>A visão de progresso mostra quem já submeteu, quem está em andamento e o último acesso de cada aluno.</p>
            <h2>Boas práticas</h2>
            <ul>
              <li>Comece com datasets pequenos e conhecidos (Iris, Fruits) e modelos simples (KNN, Árvore).</li>
              <li>Peça comparações: mesmo dataset, modelos diferentes — e discuta as métricas.</li>
              <li>Explore o relatório PDF como formato de entrega.</li>
            </ul>
          `
        },
        {
          id: 'galeria',
          titulo: 'Galeria e Compartilhamento',
          icone: 'share',
          conteudo: `
            <h2>Publicar pipelines</h2>
            <p>Ao salvar um pipeline, você (professor) pode marcá-lo como <strong>público</strong> — ele aparece
            na Galeria para os alunos copiarem e estudarem. Pipelines ligados a uma turma ficam visíveis para
            os alunos matriculados.</p>
            <h3>Dicas para um bom pipeline de exemplo</h3>
            <ul>
              <li><strong>Nome e descrição didáticos</strong> ("Introdução ao KNN com Iris")</li>
              <li><strong>Pré-processamento mínimo</strong> no começo; acrescente complexidade aos poucos</li>
              <li><strong>Métricas variadas</strong> para ensinar avaliação (não só acurácia)</li>
            </ul>
            <figure class="manual-figura">
              <img src="assets/manual/galeria.jpg" alt="Galeria de pipelines">
              <figcaption>Galeria: pipelines publicados por professores, filtráveis por nível e turma.</figcaption>
            </figure>
          `
        },
        {
          id: 'telemetria',
          titulo: 'Atividades dos Usuários',
          icone: 'analytics',
          conteudo: `
            <h2>Telemetria da jornada dos alunos</h2>
            <p>A tela <strong>Atividades dos Usuários</strong> registra a jornada na plataforma: ações do pipeline,
            navegação, chamadas ao servidor, erros e uso do tutor (com prévia da pergunta/resposta, não o texto
            completo). Use para identificar onde a turma trava.</p>
            <ul>
              <li><strong>Cards de resumo</strong> (ações, erros, tempo preso) e filtros por aluno/período</li>
              <li><strong>Acesso restrito</strong> a professor e admin; os dados expiram automaticamente
                (retenção padrão de 90 dias — público menor de idade, LGPD)</li>
            </ul>
            <figure class="manual-figura">
              <img src="assets/manual/prof-telemetria.jpg" alt="Tela Atividades dos Usuários (telemetria)">
              <figcaption>Atividades dos Usuários: resumo (eventos, erros, ativos), filtros e a jornada por aluno.</figcaption>
            </figure>
          `
        }
      ]
    };
  }

  private getManualAdmin(): ManualUsuario {
    return {
      tipo: 'admin',
      titulo: 'Manual do Administrador',
      descricao: 'Usuários, catálogo do pipeline, tutor, artefatos e monitoramento',
      icone: 'admin_panel_settings',
      secoes: [
        {
          id: 'visao-geral',
          titulo: 'Visão Geral',
          icone: 'info',
          conteudo: `
            <h2>Painel de Administração</h2>
            <p>O admin controla a plataforma inteira. Cards do painel:</p>
            <ul>
              <li><strong>Pipeline ML:</strong> a Área de Trabalho (a mesma do aluno, para testar de ponta a ponta)</li>
              <li><strong>Configuração do Pipeline:</strong> o catálogo que os alunos usam (habilitar, editar, criar, excluir)</li>
              <li><strong>Configuração do Tutor:</strong> boas-vindas, modelo LLM do chat e auditoria</li>
              <li><strong>Gerenciar Usuários:</strong> contas e convites</li>
              <li><strong>Turmas & Atividades:</strong> o admin vê e gerencia as turmas de todos os professores</li>
              <li><strong>Artefatos:</strong> runs de treino no MLflow</li>
              <li><strong>Atividades / Logs:</strong> telemetria e monitoramento</li>
            </ul>
            <p>Todas as telas têm a <strong>barra superior padrão</strong>: voltar à esquerda, título e menu do usuário.</p>
            <figure class="manual-figura">
              <img src="assets/manual/painel-admin.jpg" alt="Painel de Administração">
              <figcaption>Painel de Administração: Pipeline ML, Gerenciar Usuários, Turmas, Config. Pipeline/Tutor, Artefatos e Logs.</figcaption>
            </figure>
          `
        },
        {
          id: 'usuarios',
          titulo: 'Gerenciar Usuários',
          icone: 'people',
          conteudo: `
            <h2>Contas e convites</h2>
            <ol>
              <li>Clique em <strong>Novo Usuário</strong> (barra superior), preencha nome, email e papel
                (Aluno/Professor/Admin) e envie o convite.</li>
              <li>O usuário recebe um link único por email e cria a própria senha.</li>
            </ol>
            <ul>
              <li><strong>Status:</strong> Pendente (convite enviado), Ativo, Inativo</li>
              <li><strong>Último acesso:</strong> registrado a cada login</li>
              <li><strong>Ações:</strong> reenviar convite, ativar/desativar, excluir</li>
            </ul>
            <p><strong>Papéis:</strong> aluno usa a plataforma; professor ganha turmas/atividades/publicação;
            admin ganha as telas de configuração e monitoramento.</p>
            <figure class="manual-figura">
              <img src="assets/manual/ativacao.jpg" alt="Página de ativação de conta aberta pelo link do e-mail">
              <figcaption>O convidado abre o link do e-mail e cria a própria senha nesta página de ativação.</figcaption>
            </figure>
            <figure class="manual-figura">
              <img src="assets/manual/cadastro.jpg" alt="Tela de cadastro de usuário">
              <figcaption>Cadastro: alternativa de auto-registro (nome, e-mail, instituição, senha e perfil).</figcaption>
            </figure>
          `
        },
        {
          id: 'conf-pipeline',
          titulo: 'Configuração do Pipeline',
          icone: 'tune',
          conteudo: `
            <h2>O catálogo do pipeline (fonte da verdade)</h2>
            <p>Quatro abas — Coleta, Pré-processamento, Modelos e Métricas. Cada item tem:</p>
            <ul>
              <li><strong>Habilitado:</strong> liga/desliga o item para os alunos (reversível — prefira a excluir)</li>
              <li><strong>Campos do item</strong> (lápis): resumo do card; nos modelos, tipo de tarefa +
                explicação do tutor + métricas compatíveis; nas métricas, grupo + explicação; no pré-proc, grupo</li>
              <li><strong>Conteúdo educacional</strong> (livro): a ficha completa do tutor — descrição (Avançado),
                resumo básico, intuição, exemplo, código Python, fórmula, quando usar/evitar, links oficiais…</li>
              <li><strong>Execução</strong> (ajustes): módulo/classe (ou função) do scikit-learn e os
                hiperparâmetros expostos ao aluno (tipo, default, min/max, opções). É o que o treino executa
                e o que o código exportado gera. Módulos aceitos: <code>sklearn.*</code> e
                <code>app.modelos_custom.*</code>.</li>
              <li><strong>Excluir</strong> (lixeira, com confirmação)</li>
            </ul>
            <h3>FAB ☰ (canto inferior direito)</h3>
            <ul>
              <li><strong>+ Criar:</strong> novo elemento na aba atual (modelo, métrica ou pré-processador)</li>
              <li><strong>🤖 Assistente de preenchimento:</strong> um chat que conhece o guia completo de
                preenchimento (armazenado no banco e editável) — pergunte "como declaro um hiperparâmetro enum?"
                ou "o que vai no campo grupo?"</li>
            </ul>
          `
        },
        {
          id: 'conf-tutor',
          titulo: 'Configuração do Tutor',
          icone: 'school',
          conteudo: `
            <h2>Como o tutor ensina</h2>
            <ul>
              <li><strong>Aba Início:</strong> o texto de boas-vindas que o aluno vê ao abrir o tutor na Área de
                Trabalho (aceita HTML básico, com pré-visualização).</li>
              <li><strong>Aba LLM:</strong> escolha o modelo de linguagem que responde o chat. A tela testa quais
                modelos estão respondendo (ativos/inativos) antes de deixar trocar.</li>
              <li><strong>Histórico de edições:</strong> auditoria de quem alterou o quê, por etapa.</li>
            </ul>
            <p><strong>Onde edito as fichas dos modelos/métricas?</strong> Na <strong>Configuração do Pipeline</strong>
            (botão no topo desta tela) — o catálogo inteiro vive lá.</p>
          `
        },
        {
          id: 'artefatos',
          titulo: 'Artefatos (MLflow)',
          icone: 'science',
          conteudo: `
            <h2>Runs de treino</h2>
            <p>Cada treino dos usuários vira uma <strong>run no MLflow</strong>. A tela Artefatos lista as runs com
            filtros por usuário (autocomplete), modelo, dataset, papel e período. Clique numa run para ver:</p>
            <ul>
              <li><strong>Parâmetros e métricas</strong> registrados no treino</li>
              <li><strong>Artefatos</strong>: gráficos gerados e o <strong>modelo salvo</strong> (formato MLflow, baixável)</li>
              <li><strong>Contexto</strong>: a qual atividade/turma a submissão pertence (quando aplicável)</li>
            </ul>
          `
        },
        {
          id: 'monitoramento',
          titulo: 'Monitoramento e Logs',
          icone: 'monitor_heart',
          conteudo: `
            <h2>Telemetria e logs</h2>
            <ul>
              <li><strong>Atividades dos Usuários:</strong> jornada dos alunos (ações, navegação, erros, uso do
                tutor). Retenção automática — padrão 90 dias (público menor de idade; minimizar dados é a regra).</li>
              <li><strong>Logs de Erros (Frontend):</strong> erros capturados no navegador dos usuários, com URL e
                mensagem. Útil para detectar problemas após um deploy.</li>
              <li><strong>Logs de Backend:</strong> os últimos registros do servidor (nível, módulo, mensagem, exceção).</li>
            </ul>
            <h3>Boas práticas</h3>
            <ul>
              <li>Depois de mudanças no catálogo, teste como aluno (card Pipeline ML) antes de liberar.</li>
              <li>Erros "Failed to fetch module" em massa logo após um deploy indicam abas antigas abertas —
                o app se recarrega sozinho uma vez; oriente um recarregar (Ctrl+Shift+R) se persistir.</li>
            </ul>
          `
        }
      ]
    };
  }
}
