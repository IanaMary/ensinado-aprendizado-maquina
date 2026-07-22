import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../service/auth/auth.service';
import { DashboardService } from '../../../dashboard/services/dashboard.service';
import { NotificacaoService } from '../../../service/notificacao.service';
import { ConteudoEditorComponent } from '../components/conteudo-editor/conteudo-editor.component';
import { SharedModule } from '../../../shared/shared.module';
import { ChatTutorComponent } from '../../../dashboard/chat-tutor/chat-tutor.component';

type Lane = 'coleta_dados' | 'modelos' | 'metricas' | 'pre_processamento';

export interface HiperparamSchema {
  nome: string;
  tipo?: 'int' | 'float' | 'str' | 'bool' | 'enum';
  default?: any;
  min?: number | null;
  max?: number | null;
  opcoesTexto?: string;  // CSV apresentado ao admin; convertido para `opcoes` ao salvar
}

export interface ExecucaoSchema {
  modulo: string;
  classe: string;
  funcao?: string;  // métricas usam funcao (não classe)
  hiperparametros: HiperparamSchema[];
  aplica_em?: 'todas' | 'colunas_escolhidas' | 'target';  // relevante ao pré-processamento
}

interface ItemAdmin {
  id: string;
  label?: string;
  valor?: string;
  habilitado: boolean;
  preverCategoria?: boolean;
  dadosRotulados?: boolean;
  salvando?: boolean;
  // Edicao do bloco `execucao`
  execucao?: any;
  expandido?: boolean;
  execucaoDraft?: ExecucaoSchema;
  salvandoExecucao?: boolean;
  // Edicao do bloco `conteudo` educacional
  conteudo?: any;
  conteudoExpandido?: boolean;
  salvandoConteudo?: boolean;
  // Edicao dos campos do item (resumo/explicacao/grupo/tarefa/métricas)
  itemExpandido?: boolean;
  itemDraft?: ItemCamposDraft;
  salvandoItem?: boolean;
  excluindo?: boolean;
  // Criação de elemento novo (não edição)
  _novo?: boolean;
  categoria?: 'classificacao' | 'regressao' | 'agrupamento';
  [k: string]: any;
}

const TIPOS_HIPERPARAM: HiperparamSchema['tipo'][] = ['int', 'float', 'str', 'bool', 'enum'];

/** Campos do item editáveis fora dos blocos `execucao`/`conteudo` (antes editados
 *  só pelo catálogo do conf-tutor, aposentado na consolidação). */
export interface ItemCamposDraft {
  label: string;
  resumo: string;
  explicacao: string;
  grupo: string;
  categoria: 'classificacao' | 'regressao' | 'agrupamento';
  /** Categoria original do modelo ao abrir o painel — usada para NÃO regravar
   *  prever_categoria/dados_rotulados em modelos legados sem esses campos. */
  categoriaOriginal?: 'classificacao' | 'regressao' | 'agrupamento';
  metricas: Record<string, boolean>;  // valor da métrica -> selecionada
}

@Component({
  selector: 'app-conf-pipeline',
  templateUrl: './conf-pipeline.component.html',
  styleUrls: ['./conf-pipeline.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    MatSlideToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatTooltipModule,
    ConteudoEditorComponent,
    SharedModule,     // app-topbar / app-user-menu
    ChatTutorComponent,  // app-chat-tutor (assistente de preenchimento)
  ]
})
export class ConfPipelineComponent implements OnInit {

  role: string = sessionStorage.getItem('role') || '';

  itensColeta: ItemAdmin[] = [];
  itensModelos: ItemAdmin[] = [];
  itensMetricas: ItemAdmin[] = [];
  itensPreProc: ItemAdmin[] = [];

  carregandoColeta = true;
  carregandoModelos = true;
  carregandoMetricas = true;
  carregandoPreProc = true;

  buscaColeta = '';
  buscaModelos = '';
  buscaMetricas = '';
  buscaPreProc = '';

  get itensColetaFiltrados(): ItemAdmin[] {
    return this.filtrar(this.itensColeta, this.buscaColeta);
  }

  get itensModelosFiltrados(): ItemAdmin[] {
    return this.filtrar(this.itensModelos, this.buscaModelos);
  }

  get itensMetricasFiltradas(): ItemAdmin[] {
    return this.filtrar(this.itensMetricas, this.buscaMetricas);
  }

  get itensPreProcFiltrados(): ItemAdmin[] {
    return this.filtrar(this.itensPreProc, this.buscaPreProc);
  }

  private filtrar(itens: ItemAdmin[], termo: string): ItemAdmin[] {
    const t = (termo || '').trim().toLowerCase();
    if (!t) return itens;
    return itens.filter(i =>
      (i.label || '').toLowerCase().includes(t) ||
      (i.valor || '').toLowerCase().includes(t)
    );
  }

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly auth: AuthService,
    private readonly dashboard: DashboardService,
    private readonly notificacao: NotificacaoService,
  ) { }

  ngOnInit() {
    this.carregarColeta();
    this.carregarModelos();
    this.carregarMetricas();
    this.carregarPreProcessamento();
  }

  private carregarPreProcessamento() {
    this.carregandoPreProc = true;
    const catalogo = this.dashboard.getPreProcessamentoCatalogo();
    const doJson = (c: any): ItemAdmin => ({
      id: c.valor, label: c.label, valor: c.valor, grupo: c.grupo,
      resumo: c.resumo, execucao: c.execucao, conteudo: c.conteudo, habilitado: c.habilitado !== false,
    });
    this.dashboard.fetchPreProcessamento().subscribe({
      next: (docs: any[]) => {
        if (!docs || docs.length === 0) {
          this.itensPreProc = catalogo.map(doJson);
        } else {
          const jsonPorValor = new Map(catalogo.map((c: any) => [c.valor, c]));
          this.itensPreProc = docs.map((d: any) => {
            const base = jsonPorValor.get(d.valor) || {};
            return {
              id: d.valor,
              label: d.label || (base as any).label,
              valor: d.valor,
              grupo: d.grupo || (base as any).grupo,
              resumo: d.resumo || (base as any).resumo,
              execucao: d.execucao || (base as any).execucao,
              conteudo: d.conteudo || (base as any).conteudo,
              habilitado: d.habilitado !== false,
            };
          });
        }
        this.carregandoPreProc = false;
      },
      error: () => {
        this.itensPreProc = catalogo.map(doJson);
        this.carregandoPreProc = false;
        this.notificacao.erro('Não foi possível carregar configurações salvas de pré-processamento.');
      }
    });
  }

  private carregarColeta() {
    this.carregandoColeta = true;
    this.dashboard.fetchItensColetasDados().subscribe({
      next: (itens: any[]) => {
        this.itensColeta = (itens || []).map(i => ({ ...i, habilitado: i.habilitado !== false }));
        this.carregandoColeta = false;
      },
      error: () => {
        this.notificacao.erro('Erro ao carregar itens de coleta.');
        this.carregandoColeta = false;
      }
    });
  }

  private carregarModelos() {
    this.carregandoModelos = true;
    this.dashboard.fetchItensModelos().subscribe({
      next: (itens: any[]) => {
        this.itensModelos = (itens || []).map(i => ({ ...i, habilitado: i.habilitado !== false }));
        this.carregandoModelos = false;
      },
      error: () => {
        this.notificacao.erro('Erro ao carregar modelos.');
        this.carregandoModelos = false;
      }
    });
  }

  private carregarMetricas() {
    this.carregandoMetricas = true;
    this.dashboard.fetchItensMetricas().subscribe({
      next: (itens: any[]) => {
        this.itensMetricas = (itens || []).map(i => ({ ...i, habilitado: i.habilitado !== false }));
        this.carregandoMetricas = false;
      },
      error: () => {
        this.notificacao.erro('Erro ao carregar métricas.');
        this.carregandoMetricas = false;
      }
    });
  }

  toggle(tipo: Lane, item: ItemAdmin) {
    const novoValor = !item.habilitado;
    item.salvando = true;
    this.dashboard.patchHabilitado(tipo, item.id, novoValor).subscribe({
      next: () => {
        item.habilitado = novoValor;
        item.salvando = false;
        this.notificacao.sucesso(`${item.label || item.valor}: ${novoValor ? 'habilitado' : 'desabilitado'}.`);
      },
      error: () => {
        item.salvando = false;
        this.notificacao.erro('Não foi possível atualizar este item.');
      }
    });
  }

  tipoModelo(item: ItemAdmin): string {
    if (item.preverCategoria === true) return 'Classificação';
    if (item.preverCategoria === false && item.dadosRotulados !== false) return 'Regressão';
    if (item.dadosRotulados === false) return 'Agrupamento';
    return '';
  }

  navegar(bool: boolean) {
    if (bool) {
      this.router.navigate(['../'], { relativeTo: this.route });
    } else {
      this.auth.limparSessionStorage();
      this.router.navigate(['/autenticacao/login']);
    }
  }

  // ---------- Edição do bloco `execucao` (admin > Modelos) ----------

  tiposHiperparam = TIPOS_HIPERPARAM;

  alternarExecucao(item: ItemAdmin): void {
    if (item.expandido) {
      item.expandido = false;
      item.execucaoDraft = undefined;
      return;
    }
    item.execucaoDraft = this.execucaoParaDraft(item.execucao, item);
    item.expandido = true;
  }

  private execucaoParaDraft(execucao: any, item: ItemAdmin): ExecucaoSchema {
    const hiperparametros: HiperparamSchema[] = Array.isArray(execucao?.hiperparametros)
      ? execucao.hiperparametros.map((h: any) => ({
          nome: h.nome || h.nomeHiperparametro || '',
          tipo: h.tipo,
          default: h.default ?? h.valorPadrao,
          min: h.min ?? null,
          max: h.max ?? null,
          opcoesTexto: Array.isArray(h.opcoes) ? h.opcoes.join(', ') : (h.opcoesTexto || ''),
        }))
      : (Array.isArray(item['hiperparametros'])
          ? item['hiperparametros'].map((h: any) => ({
              nome: h.nomeHiperparametro || h.nome || '',
              default: h.valorPadrao ?? h.default,
              opcoesTexto: '',
            }))
          : []);
    return {
      modulo: execucao?.modulo || '',
      classe: execucao?.classe || '',
      funcao: execucao?.funcao || '',
      hiperparametros,
      aplica_em: execucao?.aplica_em || 'todas',
    };
  }

  addHiperparam(item: ItemAdmin): void {
    item.execucaoDraft?.hiperparametros.push({ nome: '', tipo: 'str', default: '', opcoesTexto: '' });
  }

  removerHiperparam(item: ItemAdmin, idx: number): void {
    item.execucaoDraft?.hiperparametros.splice(idx, 1);
  }

  // ---------- Criação de elemento novo (unificada no conf-pipeline) ----------

  /** Inicia a criação de um elemento novo na lane: cria um item-rascunho no topo
   *  da lista com o editor de execução já aberto. */
  novoItem(tipo: Lane): void {
    const draft: ExecucaoSchema = {
      modulo: tipo === 'metricas' ? 'sklearn.metrics' : '',
      classe: '',
      funcao: '',
      hiperparametros: [],
      aplica_em: 'todas',
    };
    const novo: ItemAdmin = {
      id: '', valor: '', label: '', habilitado: true,
      _novo: true, expandido: true, execucaoDraft: draft,
      categoria: 'classificacao',
    };
    const lista = this.listaPorTipo(tipo);
    lista.unshift(novo);
  }

  /** Cancela o editor de execução: remove o rascunho (se novo) ou fecha a edição. */
  cancelarExecucao(item: ItemAdmin): void {
    if (item._novo) {
      for (const lista of [this.itensColeta, this.itensModelos, this.itensMetricas, this.itensPreProc]) {
        const i = lista.indexOf(item);
        if (i >= 0) { lista.splice(i, 1); return; }
      }
    } else {
      this.alternarExecucao(item);
    }
  }

  private listaPorTipo(tipo: Lane): ItemAdmin[] {
    if (tipo === 'modelos') return this.itensModelos;
    if (tipo === 'metricas') return this.itensMetricas;
    if (tipo === 'pre_processamento') return this.itensPreProc;
    return this.itensColeta;
  }

  private mapHiperparametros(draft: ExecucaoSchema): any[] {
    return draft.hiperparametros
      .filter(h => (h.nome || '').trim() !== '')
      .map(h => {
        const out: any = { nome: h.nome.trim() };
        if (h.tipo) out.tipo = h.tipo;
        if (h.default !== undefined && h.default !== '') out.default = h.default;
        if (h.min !== null && h.min !== undefined) out.min = h.min;
        if (h.max !== null && h.max !== undefined) out.max = h.max;
        if (h.tipo === 'enum' && h.opcoesTexto) {
          out.opcoes = h.opcoesTexto.split(',').map(s => s.trim()).filter(Boolean);
        }
        return out;
      });
  }

  salvarExecucao(tipo: Lane, item: ItemAdmin): void {
    if (!item.execucaoDraft) return;
    const draft = item.execucaoDraft;
    const usaFuncao = tipo === 'metricas';
    const alvo = usaFuncao ? (draft.funcao || '') : draft.classe;
    if (!draft.modulo.trim() || !alvo.trim()) {
      this.notificacao.erro(usaFuncao ? 'Módulo e função são obrigatórios.' : 'Módulo e classe são obrigatórios.');
      return;
    }
    const execucao: any = { modulo: draft.modulo.trim(), hiperparametros: this.mapHiperparametros(draft) };
    if (usaFuncao) execucao.funcao = (draft.funcao || '').trim();
    else execucao.classe = draft.classe.trim();
    if (tipo === 'pre_processamento') {
      execucao.aplica_em = draft.aplica_em || 'todas';
      execucao.escopo = item.execucao?.escopo || 'transform_X';
      if (item.execucao?.trata_ausentes) execucao.trata_ausentes = true;
    }

    // ----- Criação de elemento novo -----
    if (item._novo) {
      const valor = (item.valor || '').trim();
      const label = (item.label || '').trim();
      if (!valor || !label) {
        this.notificacao.erro('Informe valor e nome do elemento.');
        return;
      }
      const doc: any = { valor, label, execucao };
      if (tipo === 'modelos') {
        // Mapeamento alinhado a determinarTipoModelo (dashboard.service):
        // agrupamento => dados_rotulados=false; classificacao => (true,true); regressao => (false,true)
        const cat = item.categoria || 'classificacao';
        doc.dados_rotulados = cat !== 'agrupamento';
        doc.prever_categoria = cat === 'classificacao';
        doc.tipoItem = 'treino-validacao-teste';
      } else if (tipo === 'metricas') {
        doc.grupo = item['grupo'] || 'classificacao';
        doc.tipoItem = 'metrica';
      } else if (tipo === 'pre_processamento') {
        doc.tipoItem = 'pre-processamento';
        if (item['grupo']) doc.grupo = item['grupo'];
      }
      item.salvandoExecucao = true;
      const reqNovo = tipo === 'pre_processamento'
        ? this.dashboard.putPreProcessamentoDoc(valor, doc)
        : this.dashboard.postCatalogoItem(tipo, doc);
      reqNovo.subscribe({
        next: () => {
          this.notificacao.sucesso(`Elemento criado: ${label}`);
          this.recarregar(tipo);
        },
        error: (err) => {
          item.salvandoExecucao = false;
          this.notificacao.erro(err?.error?.detail || 'Falha ao criar elemento.');
        }
      });
      return;
    }

    // ----- Edição de existente -----
    const req = tipo === 'pre_processamento'
      ? this.dashboard.putPreProcessamentoDoc(item.valor as string, { execucao })
      : this.dashboard.putCatalogoItem(tipo, item.id, { execucao });
    item.salvandoExecucao = true;
    req.subscribe({
      next: () => {
        item.execucao = execucao;
        item.salvandoExecucao = false;
        item.expandido = false;
        item.execucaoDraft = undefined;
        this.notificacao.sucesso(`Configuração de execução salva: ${item.label || item.valor}`);
      },
      error: (err) => {
        item.salvandoExecucao = false;
        const msg = err?.error?.detail || 'Falha ao salvar configuração de execução.';
        this.notificacao.erro(msg);
      }
    });
  }

  private recarregar(tipo: Lane): void {
    if (tipo === 'modelos') this.carregarModelos();
    else if (tipo === 'metricas') this.carregarMetricas();
    else if (tipo === 'pre_processamento') this.carregarPreProcessamento();
    else this.carregarColeta();
  }

  // ---------- FAB-menu (criar na lane atual + assistente do admin) ----------

  private static readonly LANES_POR_ABA: Lane[] = ['coleta_dados', 'pre_processamento', 'modelos', 'metricas'];
  private static readonly ROTULO_CRIAR: Record<string, string> = {
    pre_processamento: 'Novo pré-processador',
    modelos: 'Novo modelo',
    metricas: 'Nova métrica',
  };

  fabAberto = false;
  laneAtualIdx = 0;

  onTabChange(e: any): void {
    this.laneAtualIdx = e.index;
    this.fabAberto = false;
  }

  get laneAtual(): Lane {
    return ConfPipelineComponent.LANES_POR_ABA[this.laneAtualIdx] || 'coleta_dados';
  }

  /** Coleta não tem criação de elementos. */
  get podeCriarNaLane(): boolean {
    return this.laneAtual !== 'coleta_dados';
  }

  get rotuloCriar(): string {
    return ConfPipelineComponent.ROTULO_CRIAR[this.laneAtual] || 'Novo elemento';
  }

  criarNaLane(): void {
    if (!this.podeCriarNaLane) return;
    this.fabAberto = false;
    this.novoItem(this.laneAtual);
  }

  // ---------- Assistente de preenchimento (chat do admin) ----------

  chatAdminAberto = false;
  private kbAdmin = '';
  contextoChatAdmin: any = null;
  sugestoesAdmin = [
    'Como preencho o bloco execução de um modelo novo?',
    'Como declaro um hiperparâmetro do tipo enum?',
    'Para que serve o campo grupo da métrica?',
    'Quando marco métricas compatíveis no modelo?',
    'O que vai em cada campo do conteúdo educacional?',
  ];

  abrirChatAdmin(): void {
    this.fabAberto = false;
    this.chatAdminAberto = true;
    if (this.kbAdmin) return;
    this.montarContextoChatAdmin();
    // Guia de preenchimento (db.tutor, pipe 'conf-pipeline'; fallback versionado no backend)
    this.dashboard.getTutor('pipe=conf-pipeline').subscribe({
      next: (res: any) => {
        this.kbAdmin = res?.descricao || '';
        this.montarContextoChatAdmin();
      },
      error: () => this.montarContextoChatAdmin(),
    });
  }

  private montarContextoChatAdmin(): void {
    this.contextoChatAdmin = {
      tela: 'Configuração do Pipeline (administração do catálogo)',
      papel_do_usuario: 'admin/professor preenchendo os campos do catálogo',
      guia_preenchimento: this.kbAdmin || 'Guia indisponível no momento.',
    };
  }

  // ---------- Edição dos campos do item + exclusão ----------
  // (absorvido do catálogo do conf-tutor, aposentado na consolidação)

  gruposPreProc = ['scalers', 'encoders', 'imputers', 'transformers'];

  /** Inverso do mapeamento usado na criação (dados_rotulados/prever_categoria -> categoria). */
  private categoriaDoModelo(item: ItemAdmin): 'classificacao' | 'regressao' | 'agrupamento' {
    const pc = item.preverCategoria ?? item['prever_categoria'];
    const dr = item.dadosRotulados ?? item['dados_rotulados'];
    if (dr === false) return 'agrupamento';
    if (pc === true) return 'classificacao';
    return 'regressao';
  }

  alternarItemCampos(tipo: Lane, item: ItemAdmin): void {
    if (item.itemExpandido) {
      item.itemExpandido = false;
      item.itemDraft = undefined;
      return;
    }
    const metricas: Record<string, boolean> = {};
    (item['metricas'] || []).forEach((v: string) => { metricas[v] = true; });
    const cat = this.categoriaDoModelo(item);
    item.itemDraft = {
      label: item['label'] || '',
      resumo: item['resumo'] || '',
      explicacao: item['explicacao'] || '',
      grupo: item['grupo'] || (tipo === 'metricas' ? 'classificacao' : ''),
      categoria: cat,
      categoriaOriginal: cat,
      metricas,
    };
    item.itemExpandido = true;
  }

  /** Todas as métricas do catálogo — a seleção não é mais filtrada por grupo.
   *  Métricas de grupo divergente são exibidas com o grupo indicado para o admin
   *  decidir. (Fix #5) */
  metricasCompativeis(item: ItemAdmin): ItemAdmin[] {
    return this.itensMetricas;
  }
  /** Métrica compatível com a categoria do modelo em edição (para destaque visual). */
  metricaCompativel(item: ItemAdmin, metrica: ItemAdmin): boolean {
    const cat = item.itemDraft?.categoria || 'classificacao';
    return (metrica['grupo'] || 'classificacao') === cat;
  }

  salvarItemCampos(tipo: Lane, item: ItemAdmin): void {
    const d = item.itemDraft;
    if (!d) return;
    const body: any = {};
    // Label (renomear item existente — Fix #3)
    if (d.label && d.label.trim() && d.label.trim() !== (item['label'] || '')) {
      body.label = d.label.trim();
    }
    body.resumo = (d.resumo || '').trim();
    if (tipo === 'modelos') {
      body.explicacao = (d.explicacao || '').trim();
      // Fix #4: só regrava prever_categoria/dados_rotulados se o admin trocou a tarefa
      if (d.categoria !== d.categoriaOriginal) {
        body.dados_rotulados = d.categoria !== 'agrupamento';
        body.prever_categoria = d.categoria === 'classificacao';
      }
      body.metricas = Object.keys(d.metricas).filter(v => d.metricas[v]);
    } else if (tipo === 'metricas') {
      body.explicacao = (d.explicacao || '').trim();
      body.grupo = d.grupo || 'classificacao';
    } else if (tipo === 'pre_processamento') {
      if (d.grupo) body.grupo = d.grupo;
    }
    if (Object.keys(body).length === 0) {
      this.notificacao.erro('Nenhum campo alterado.');
      return;
    }
    item.salvandoItem = true;
    const req = tipo === 'pre_processamento'
      ? this.dashboard.putPreProcessamentoDoc(item.valor as string, body)
      : this.dashboard.putCatalogoItem(tipo, item.id, body);
    req.subscribe({
      next: () => {
        if (body.label !== undefined) item['label'] = body.label;
        item['resumo'] = body.resumo;
        if (body.explicacao !== undefined) item['explicacao'] = body.explicacao;
        if (body.grupo !== undefined) item['grupo'] = body.grupo;
        if (tipo === 'modelos') {
          if (body.prever_categoria !== undefined) item.preverCategoria = body.prever_categoria;
          if (body.dados_rotulados !== undefined) item.dadosRotulados = body.dados_rotulados;
          item['metricas'] = body.metricas;
        }
        item.salvandoItem = false;
        item.itemExpandido = false;
        item.itemDraft = undefined;
        this.notificacao.sucesso(`Campos do item salvos: ${item.label || item.valor}`);
      },
      error: (err) => {
        item.salvandoItem = false;
        this.notificacao.erro(err?.error?.detail || 'Falha ao salvar os campos do item.');
      }
    });
  }

  excluirItem(tipo: Lane, item: ItemAdmin): void {
    const nome = item.label || item.valor || 'este item';
    if (!confirm(`Excluir "${nome}" do catálogo? Esta ação não pode ser desfeita.`)) return;
    item.excluindo = true;
    const req = tipo === 'pre_processamento'
      ? this.dashboard.deletePreProcessamentoDoc(item.valor as string)
      : this.dashboard.deleteCatalogoItem(tipo, item.id);
    req.subscribe({
      next: () => {
        this.notificacao.sucesso(`Item excluído: ${nome}`);
        this.recarregar(tipo);
      },
      error: (err) => {
        item.excluindo = false;
        this.notificacao.erro(err?.error?.detail || 'Falha ao excluir o item.');
      }
    });
  }

  // ---------- Edição do conteúdo educacional ----------

  alternarConteudo(item: ItemAdmin): void {
    item.conteudoExpandido = !item.conteudoExpandido;
  }

  salvarConteudo(tipo: Lane, item: ItemAdmin, conteudo: any): void {
    const req = tipo === 'pre_processamento'
      ? this.dashboard.putPreProcessamentoDoc(item.valor as string, { conteudo })
      : this.dashboard.putCatalogoItem(tipo, item.id, { conteudo });
    item.salvandoConteudo = true;
    req.subscribe({
      next: () => {
        item.conteudo = conteudo;
        item.salvandoConteudo = false;
        item.conteudoExpandido = false;
        this.notificacao.sucesso(`Conteúdo educacional salvo: ${item.label || item.valor}`);
      },
      error: (err) => {
        item.salvandoConteudo = false;
        const msg = err?.error?.detail || 'Falha ao salvar conteúdo educacional.';
        this.notificacao.erro(msg);
      }
    });
  }

}
