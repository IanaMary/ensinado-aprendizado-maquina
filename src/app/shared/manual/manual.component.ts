import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

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
    this.router.navigate(['/interno']);
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
      descricao: 'Aprenda a usar a plataforma Iana para criar seus pipelines de Machine Learning',
      icone: 'school',
      secoes: [
        {
          id: 'visao-geral',
          titulo: 'Visão Geral',
          icone: 'info',
          conteudo: `
            <h2>Bem-vindo à Iana!</h2>
            <p>A Iana é uma plataforma interativa para aprendizado de Machine Learning. Aqui você pode:</p>
            <ul>
              <li><strong>Criar pipelines</strong> completos de ML passo a passo</li>
              <li><strong>Explorar datasets</strong> prontos para praticar</li>
              <li><strong>Configurar modelos</strong> de classificação e regressão</li>
              <li><strong>Aplicar pré-processamento</strong> nos seus dados</li>
              <li><strong>Avaliar resultados</strong> com métricas detalhadas</li>
              <li><strong>Baixar scripts Python</strong> do seu pipeline</li>
            </ul>
            <h3>Navegação Principal</h3>
            <ul>
              <li><strong>Meus Projetos:</strong> Lista de todos os seus pipelines salvos</li>
              <li><strong>Galeria:</strong> Pipelines criados por professores para explorar</li>
              <li><strong>Pipeline:</strong> Área de trabalho para criar/editar pipelines</li>
            </ul>
          `
        },
        {
          id: 'criar-pipeline',
          titulo: 'Criar um Pipeline',
          icone: 'add_circle',
          conteudo: `
            <h2>Criando seu Primeiro Pipeline</h2>
            <h3>Passo 1: Coleta de Dados</h3>
            <p>Arraste um item de <strong>Coleta de Dados</strong> para a área de trabalho:</p>
            <ul>
              <li><strong>CSV/Excel/JSON:</strong> Carregue seu próprio arquivo</li>
              <li><strong>Dataset:</strong> Use um dataset pronto (sklearn ou UCI)</li>
            </ul>
            
            <h3>Passo 2: Pré-processamento</h3>
            <p>Configure transformações nos seus dados:</p>
            <ul>
              <li><strong>Scalers:</strong> StandardScaler, MinMaxScaler, RobustScaler, Normalizer (para colunas Número)</li>
              <li><strong>Encoders:</strong> OneHotEncoder, OrdinalEncoder (para colunas Texto ou Booleano)</li>
              <li><strong>LabelEncoder:</strong> aplicado ao target quando ele é Texto categórico</li>
              <li><strong>Imputers:</strong> SimpleImputer (para valores ausentes)</li>
              <li><strong>Transformers:</strong> PolynomialFeatures, PowerTransformer</li>
            </ul>
            <p><strong>Nota:</strong> Encoders categóricos só podem ser aplicados a colunas Texto ou Booleano. Scalers só podem ser aplicados a colunas Número.</p>
            
            <h3>Passo 3: Seleção do Modelo</h3>
            <p>Escolha o algoritmo de ML:</p>
            <ul>
              <li><strong>Classificação:</strong> KNN, Decision Tree, SVM, Logistic Regression, Random Forest, etc.</li>
              <li><strong>Regressão:</strong> Linear Regression, Random Forest Regressor, etc.</li>
            </ul>
            
            <h3>Passo 4: Treinamento</h3>
            <p>Configure hiperparâmetros e treine o modelo.</p>
            
            <h3>Passo 5: Avaliação</h3>
            <p>Selecione métricas e visualize resultados:</p>
            <ul>
              <li>Acurácia, Precisão, Recall, F1-Score</li>
              <li>Matriz de Confusão</li>
            </ul>
          `
        },
        {
          id: 'projetos',
          titulo: 'Meus Projetos',
          icone: 'folder',
          conteudo: `
            <h2>Gerenciando seus Projetos</h2>
            <p>A página <strong>Meus Projetos</strong> mostra todos os seus pipelines salvos.</p>
            
            <h3>Funcionalidades</h3>
            <ul>
              <li><strong>Criar Novo:</strong> Clique em "Novo Pipeline" para começar</li>
              <li><strong>Abrir:</strong> Clique em um projeto para continuar editando</li>
              <li><strong>Excluir:</strong> Use o ícone de lixeira para remover</li>
              <li><strong>Buscar:</strong> Filtre por nome ou descrição</li>
              <li><strong>Status:</strong> Rascunho, Em Progresso ou Concluído</li>
            </ul>
            
            <h3>Salvar Pipeline</h3>
            <p>Use o botão <strong>"Salvar"</strong> no topo da área de trabalho para salvar o estado atual do pipeline.</p>
          `
        },
        {
          id: 'galeria',
          titulo: 'Galeria de Pipelines',
          icone: 'explore',
          conteudo: `
            <h2>Explorando a Galeria</h2>
            <p>A <strong>Galeria de Pipelines</strong> contém pipelines criados por professores.</p>
            
            <h3>Tipos de Pipelines</h3>
            <ul>
              <li><strong>Públicos:</strong> Visíveis para todos os alunos</li>
              <li><strong>Da Turma:</strong> Visíveis apenas para sua turma</li>
            </ul>
            
            <h3>Filtros Disponíveis</h3>
            <ul>
              <li><strong>Dificuldade:</strong> Iniciante, Intermediário, Avançado</li>
              <li><strong>Tipo:</strong> Públicos, Minha Turma, Todos</li>
              <li><strong>Busca:</strong> Por nome, professor ou tags</li>
            </ul>
            
            <h3>Copiar Pipeline</h3>
            <p>Clique em <strong>"Copiar"</strong> para criar uma cópia do pipeline na sua conta. Você pode então:</p>
            <ul>
              <li>Modificar configurações</li>
              <li>Trocar modelos</li>
              <li>Experimentar diferentes pré-processamentos</li>
              <li>Salvar como seu próprio projeto</li>
            </ul>
          `
        },
        {
          id: 'download',
          titulo: 'Baixar Pipeline',
          icone: 'download',
          conteudo: `
            <h2>Baixando seu Pipeline</h2>
            <p>O botão <strong>"Baixar Pipeline"</strong> gera um arquivo ZIP contendo:</p>
            
            <h3>Conteúdo do ZIP</h3>
            <ul>
              <li><strong>pipeline.py:</strong> Script Python completo e executável</li>
              <li><strong>data/treino.csv:</strong> Dados de treino</li>
              <li><strong>data/teste.csv:</strong> Dados de teste</li>
              <li><strong>README.md:</strong> Instruções de execução</li>
            </ul>
            
            <h3>Estrutura do Script</h3>
            <p>O script Python gerado contém funções modulares:</p>
            <ul>
              <li><strong>carregar_dados():</strong> Carrega os CSVs</li>
              <li><strong>selecionar_features():</strong> Separa features e target</li>
              <li><strong>aplicar_preprocessamento():</strong> Aplica transformações</li>
              <li><strong>treinar_modelo():</strong> Treina o modelo</li>
              <li><strong>avaliar_modelo():</strong> Calcula métricas</li>
            </ul>
            
            <h3>Como Executar</h3>
            <pre><code>pip install pandas numpy scikit-learn
python pipeline.py</code></pre>
          `
        },
        {
          id: 'tutor',
          titulo: 'Painel do Tutor',
          icone: 'school',
          conteudo: `
            <h2>O Painel do Tutor</h2>
            <p>O <strong>Painel do Tutor</strong> na lateral direita fornece conteúdo educativo contextual.</p>
            
            <h3>Conteúdo Disponível</h3>
            <ul>
              <li><strong>Modelos:</strong> Descrição, quando usar, hiperparâmetros</li>
              <li><strong>Métricas:</strong> Fórmula, intuição, exemplos práticos</li>
              <li><strong>Pré-processamento:</strong> Explicação de cada transformador</li>
            </ul>
            
            <h3>Como Usar</h3>
            <p>O tutor atualiza automaticamente conforme você navega pelo pipeline:</p>
            <ul>
              <li>Clique em um item no pipeline para ver informações</li>
              <li>Use o ícone <strong>info</strong> em cada item para detalhes</li>
              <li>O tutor mostra dicas contextuais durante a criação</li>
            </ul>
          `
        }
      ]
    };
  }

  private getManualProfessor(): ManualUsuario {
    return {
      tipo: 'professor',
      titulo: 'Manual do Professor',
      descricao: 'Crie e compartilhe pipelines educativos com seus alunos',
      icone: 'person',
      secoes: [
        {
          id: 'visao-geral',
          titulo: 'Visão Geral',
          icone: 'info',
          conteudo: `
            <h2>Área do Professor</h2>
            <p>Como professor, você tem acesso a funcionalidades adicionais:</p>
            <ul>
              <li><strong>Criar pipelines educativos</strong> para seus alunos</li>
              <li><strong>Configurar turmas</strong> e gerenciar alunos</li>
              <li><strong>Compartilhar pipelines</strong> pública ou privatamente</li>
              <li><strong>Acompanhar progresso</strong> dos alunos</li>
            </ul>
            
            <h3>Diferenças do Aluno</h3>
            <ul>
              <li>Pode criar pipelines <strong>públicos</strong> (visíveis para todos)</li>
              <li>Pode criar pipelines <strong>privados</strong> (apenas para sua turma)</li>
              <li>Acesso ao painel de <strong>configuração de pipelines</strong></li>
              <li>Pode adicionar <strong>tags e dificuldade</strong> aos pipelines</li>
            </ul>
          `
        },
        {
          id: 'criar-pipeline',
          titulo: 'Criar Pipeline Educativo',
          icone: 'add_circle',
          conteudo: `
            <h2>Criando Pipelines Educativos</h2>
            <p>Pipelines educativos são projetados para ajudar alunos a aprender conceitos de ML.</p>
            
            <h3>Boas Práticas</h3>
            <ul>
              <li><strong>Nome descritivo:</strong> Use nomes como "Introdução ao KNN" ou "SVM para Texto"</li>
              <li><strong>Descrição clara:</strong> Explique o que o aluno vai aprender</li>
              <li><strong>Tags relevantes:</strong> Adicione tags para facilitar busca</li>
              <li><strong>Dificuldade adequada:</strong> Classifique como Iniciante, Intermediário ou Avançado</li>
            </ul>
            
            <h3>Configuração Recomendada</h3>
            <ul>
              <li>Use <strong>datasets pequenos</strong> e didáticos</li>
              <li>Configure <strong>pré-processamento mínimo</strong> para facilitar entendimento</li>
              <li>Escolha <strong>modelos simples</strong> primeiro (KNN, Decision Tree)</li>
              <li>Inclua <strong>métricas variadas</strong> para ensinar avaliação</li>
            </ul>
          `
        },
        {
          id: 'compartilhar',
          titulo: 'Compartilhar Pipelines',
          icone: 'share',
          conteudo: `
            <h2>Compartilhando seus Pipelines</h2>
            
            <h3>Pipelines Públicos</h3>
            <p>Pipelines públicos aparecem na <strong>Galeria</strong> para todos os alunos:</p>
            <ul>
              <li>Visíveis para todas as turmas</li>
              <li>Podem ser copiados por qualquer aluno</li>
              <li>Ideal para conteúdo geral da disciplina</li>
            </ul>
            
            <h3>Pipelines Privados (Turma)</h3>
            <p>Pipelines privados são visíveis apenas para alunos da sua turma:</p>
            <ul>
              <li>Visíveis apenas para alunos matriculados</li>
              <li>Ideal para exercícios específicos</li>
              <li>Útil para provas e trabalhos</li>
            </ul>
            
            <h3>Como Compartilhar</h3>
            <ol>
              <li>Crie o pipeline normalmente</li>
              <li>Salve o pipeline</li>
              <li>Na página de configuração, selecione "Público" ou "Privado"</li>
              <li>Se privado, selecione a turma</li>
            </ol>
          `
        },
        {
          id: 'turmas',
          titulo: 'Gerenciar Turmas',
          icone: 'group',
          conteudo: `
            <h2>Gerenciando suas Turmas</h2>
            <p>Organize seus alunos em turmas para facilitar o compartilhamento.</p>
            
            <h3>Criar Turma</h3>
            <ol>
              <li>Acesse o painel de configuração</li>
              <li>Clique em "Nova Turma"</li>
              <li>Defina nome e descrição</li>
              <li>Adicione alunos (manualmente ou por convite)</li>
            </ol>
            
            <h3>Adicionar Alunos</h3>
            <ul>
              <li><strong>Manual:</strong> Digite o email do aluno</li>
              <li><strong>Convite:</strong> Envie link de convite por email</li>
              <li><strong>Código:</strong> Compartilhe código da turma</li>
            </ul>
            
            <h3>Pipelines da Turma</h3>
            <p>Pipelines associados a uma turma são automaticamente visíveis para todos os alunos matriculados.</p>
          `
        },
        {
          id: 'dicas',
          titulo: 'Dicas para Professores',
          icone: 'lightbulb',
          conteudo: `
            <h2>Dicas para Ensinar ML</h2>
            
            <h3>Progressão Recomendada</h3>
            <ol>
              <li><strong>Iniciante:</strong> KNN, Decision Tree com datasets simples</li>
              <li><strong>Intermediário:</strong> SVM, Random Forest com pré-processamento</li>
              <li><strong>Avançado:</strong> Ensemble methods, feature engineering</li>
            </ol>
            
            <h3>Conceitos para Ensinar</h3>
            <ul>
              <li><strong>Divisão treino/teste:</strong> Por que é importante</li>
              <li><strong>Overfitting:</strong> Como identificar e evitar</li>
              <li><strong>Métricas:</strong> Quando usar cada uma</li>
              <li><strong>Pré-processamento:</strong> Impacto nos resultados</li>
            </ul>
            
            <h3>Exercícios Sugeridos</h3>
            <ul>
              <li>Comparar modelos com mesmo dataset</li>
              <li>Testar impacto de diferentes pré-processamentos</li>
              <li>Analisar matriz de confusão</li>
              <li>Experimentar hiperparâmetros</li>
            </ul>
          `
        }
      ]
    };
  }

  private getManualAdmin(): ManualUsuario {
    return {
      tipo: 'admin',
      titulo: 'Manual do Administrador',
      descricao: 'Gerencie usuários, configure a plataforma e monitore o uso',
      icone: 'admin_panel_settings',
      secoes: [
        {
          id: 'visao-geral',
          titulo: 'Visão Geral',
          icone: 'info',
          conteudo: `
            <h2>Painel do Administrador</h2>
            <p>Como administrador, você tem controle total sobre a plataforma:</p>
            <ul>
              <li><strong>Gerenciar usuários:</strong> Criar, editar, desativar contas</li>
              <li><strong>Configurar plataforma:</strong> Ajustar parâmetros globais</li>
              <li><strong>Monitorar uso:</strong> Acompanhar atividade dos usuários</li>
              <li><strong>Gerenciar conteúdo:</strong> Pipelines, datasets, tutor</li>
            </ul>
            
            <h3>Acesso Admin</h3>
            <p>O painel admin é acessível apenas para usuários com role <strong>admin</strong>.</p>
          `
        },
        {
          id: 'usuarios',
          titulo: 'Gerenciar Usuários',
          icone: 'people',
          conteudo: `
            <h2>Gerenciamento de Usuários</h2>
            <p>A página <strong>Gerenciar Usuários</strong> permite criar e gerenciar contas.</p>
            
            <h3>Criar Novo Usuário</h3>
            <ol>
              <li>Clique em <strong>"Novo Usuário"</strong></li>
              <li>Preencha nome, email e tipo (Aluno/Professor/Admin)</li>
              <li>Clique em <strong>"Enviar Convite"</strong></li>
              <li>O usuário receberá um email com link para criar senha</li>
            </ol>
            
            <h3>Tipos de Usuário</h3>
            <ul>
              <li><strong>Aluno:</strong> Acesso básico à plataforma</li>
              <li><strong>Professor:</strong> Pode criar pipelines públicos/privados</li>
              <li><strong>Admin:</strong> Acesso total ao painel de administração</li>
            </ul>
            
            <h3>Status dos Usuários</h3>
            <ul>
              <li><strong>Pendente:</strong> Convite enviado, aguardando ativação</li>
              <li><strong>Ativo:</strong> Conta ativa e funcionando</li>
              <li><strong>Inativo:</strong> Conta desativada temporariamente</li>
            </ul>
            
            <h3>Ações Disponíveis</h3>
            <ul>
              <li><strong>Reenviar Convite:</strong> Para usuários pendentes</li>
              <li><strong>Ativar/Desativar:</strong> Alterar status da conta</li>
              <li><strong>Excluir:</strong> Remover usuário permanentemente</li>
            </ul>
          `
        },
        {
          id: 'convites',
          titulo: 'Sistema de Convites',
          icone: 'mail',
          conteudo: `
            <h2>Sistema de Convites por Email</h2>
            <p>O sistema de convites permite criar contas de forma segura.</p>
            
            <h3>Como Funciona</h3>
            <ol>
              <li>Admin cria o usuário e envia convite</li>
              <li>Usuário recebe email com link único</li>
              <li>Ao clicar no link, usuário cria sua senha</li>
              <li>Conta é ativada automaticamente</li>
            </ol>
            
            <h3>Segurança</h3>
            <ul>
              <li>Links de convite expiram em <strong>7 dias</strong></li>
              <li>Cada link pode ser usado <strong>apenas uma vez</strong></li>
              <li>Senhas são criptografadas com <strong>bcrypt</strong></li>
            </ul>
            
            <h3>Configuração de Email</h3>
            <p>Para envio de emails, configure as variáveis de ambiente:</p>
            <ul>
              <li><strong>SMTP_HOST:</strong> Servidor SMTP (ex: smtp.gmail.com)</li>
              <li><strong>SMTP_PORT:</strong> Porta (ex: 587)</li>
              <li><strong>SMTP_USER:</strong> Usuário SMTP</li>
              <li><strong>SMTP_PASSWORD:</strong> Senha SMTP</li>
              <li><strong>EMAIL_FROM:</strong> Email remetente</li>
            </ul>
          `
        },
        {
          id: 'pipeline',
          titulo: 'Configurar Pipeline',
          icone: 'settings',
          conteudo: `
            <h2>Configuração do Pipeline</h2>
            <p>Configure os modelos e transformadores disponíveis na plataforma.</p>
            
            <h3>Modelos Disponíveis</h3>
            <ul>
              <li><strong>Classificação:</strong> KNN, Decision Tree, SVM, Logistic Regression, etc.</li>
              <li><strong>Regressão:</strong> Linear Regression, Random Forest Regressor, etc.</li>
              <li><strong>Não Supervisionado:</strong> K-Means, PCA</li>
            </ul>
            
            <h3>Pré-processamento</h3>
            <ul>
              <li><strong>Scalers:</strong> StandardScaler, MinMaxScaler, RobustScaler, Normalizer</li>
              <li><strong>Encoders:</strong> OneHotEncoder, OrdinalEncoder</li>
              <li><strong>Imputers:</strong> SimpleImputer</li>
              <li><strong>Transformers:</strong> PolynomialFeatures, PowerTransformer</li>
            </ul>
            
            <h3>Datasets</h3>
            <p>Configure datasets disponíveis para uso:</p>
            <ul>
              <li><strong>Sklearn:</strong> Iris, Wine, Breast Cancer, etc.</li>
              <li><strong>UCI:</strong> Fruits, Wine Quality, etc.</li>
              <li><strong>Customizados:</strong> Upload de datasets próprios</li>
            </ul>
          `
        },
        {
          id: 'tutor',
          titulo: 'Configurar Tutor',
          icone: 'school',
          conteudo: `
            <h2>Configuração do Tutor</h2>
            <p>O Tutor fornece conteúdo educativo contextual durante o uso da plataforma.</p>
            
            <h3>Conteúdo Configurável</h3>
            <ul>
              <li><strong>Modelos:</strong> Descrições, quando usar, hiperparâmetros</li>
              <li><strong>Métricas:</strong> Fórmulas, intuição, exemplos</li>
              <li><strong>Pré-processamento:</strong> Explicações de cada transformador</li>
              <li><strong>Pipeline:</strong> Guias passo a passo</li>
            </ul>
            
            <h3>Editar Conteúdo</h3>
            <ol>
              <li>Acesse <strong>Config Tutor</strong></li>
              <li>Selecione a seção para editar</li>
              <li>Use o editor rich text para formatar</li>
              <li>Salve as alterações</li>
            </ol>
            
            <h3>Formato do Conteúdo</h3>
            <ul>
              <li>Suporta <strong>HTML</strong> para formatação</li>
              <li>Use <strong>listas</strong> para organizar informações</li>
              <li>Adicione <strong>exemplos práticos</strong></li>
              <li>Inclua <strong>fórmulas</strong> quando necessário</li>
            </ul>
          `
        },
        {
          id: 'monitoramento',
          titulo: 'Monitoramento',
          icone: 'analytics',
          conteudo: `
            <h2>Monitoramento da Plataforma</h2>
            <p>Acompanhe o uso da plataforma e atividade dos usuários.</p>
            
            <h3>Métricas Disponíveis</h3>
            <ul>
              <li><strong>Usuários ativos:</strong> Quantidade de usuários logados</li>
              <li><strong>Pipelines criados:</strong> Total de pipelines no sistema</li>
              <li><strong>Modelos treinados:</strong> Quantidade de treinamentos realizados</li>
              <li><strong>Datasets usados:</strong> Datasets mais populares</li>
            </ul>
            
            <h3>Logs de Atividade</h3>
            <ul>
              <li><strong>Login/Logout:</strong> Acessos dos usuários</li>
              <li><strong>Criação de pipelines:</strong> Novos pipelines criados</li>
              <li><strong>Treinamentos:</strong> Modelos treinados</li>
              <li><strong>Downloads:</strong> Scripts baixados</li>
            </ul>
          `
        }
      ]
    };
  }
}
