import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormArray } from '@angular/forms';
import { DashboardService } from '../../../../dashboard/services/dashboard.service';
import { NotificacaoService } from '../../../../service/notificacao.service';

interface ElementoCatalogo {
  id: string;
  label: string;
  valor: string;
  resumo?: string;
  explicacao?: string;
  habilitado: boolean;
  grupo?: string;
  preverCategoria?: boolean;
  dadosRotulados?: boolean;
  import_pacote?: string;
  classe?: string;
  funcao?: string;
  hiperparametros?: any[];
  metricas?: string[];
  parametros?: any[];
  salvando?: boolean;
  [k: string]: any;
}

@Component({
  selector: 'app-tutor-elementos-catalogo',
  templateUrl: './tutor-elementos-catalogo.component.html',
  styleUrls: ['./tutor-elementos-catalogo.component.scss'],
  standalone: false,
})
export class TutorElementosCatalogoComponent implements OnChanges {

  @Input() atualizar = false;
  @Input() tipoCatalogo: 'coleta_dados' | 'modelos' | 'metricas' | 'pre_processamento' = 'coleta_dados';
  @Input() titulo = '';
  @Input() icone = 'folder';

  elementos: ElementoCatalogo[] = [];
  carregando = false;
  busca = '';
  editandoId: string | null = null;
  formEdicao: FormGroup;
  salvando = false;
  criandoNovo = false;

  metricasDisponiveis = [
    { valor: 'accuracy_score', label: 'Acurácia' },
    { valor: 'precision_score', label: 'Precisão' },
    { valor: 'recall_score', label: 'Recall' },
    { valor: 'f1_score', label: 'F1-Score' },
    { valor: 'confusion_matrix', label: 'Matriz de Confusão' },
    { valor: 'r2_score', label: 'R²' },
    { valor: 'mean_squared_error', label: 'MSE' },
    { valor: 'root_mean_squared_error', label: 'RMSE' },
    { valor: 'mean_absolute_error', label: 'MAE' },
    { valor: 'silhouette_score', label: 'Silhouette' },
    { valor: 'calinski_harabasz_score', label: 'Calinski-Harabasz' },
    { valor: 'davies_bouldin_score', label: 'Davies-Bouldin' },
  ];

  tiposHiperparametro = ['number', 'string', 'boolean'];

  constructor(
    private readonly dashboard: DashboardService,
    private readonly notificacao: NotificacaoService,
    private readonly fb: FormBuilder,
  ) {
    this.formEdicao = this.criarFormVazio();
  }

  get labelControl(): FormControl { return this.formEdicao.get('label') as FormControl; }
  get valorControl(): FormControl { return this.formEdicao.get('valor') as FormControl; }
  get resumoControl(): FormControl { return this.formEdicao.get('resumo') as FormControl; }
  get explicacaoControl(): FormControl { return this.formEdicao.get('explicacao') as FormControl; }
  get importPacoteControl(): FormControl { return this.formEdicao.get('import_pacote') as FormControl; }
  get classeControl(): FormControl { return this.formEdicao.get('classe') as FormControl; }
  get funcaoControl(): FormControl { return this.formEdicao.get('funcao') as FormControl; }
  get grupoControl(): FormControl { return this.formEdicao.get('grupo') as FormControl; }
  get preverCategoriaControl(): FormControl { return this.formEdicao.get('prever_categoria') as FormControl; }
  get dadosRotuladosControl(): FormControl { return this.formEdicao.get('dados_rotulados') as FormControl; }
  get hiperparametrosArray(): FormArray { return this.formEdicao.get('hiperparametros') as FormArray; }
  get metricasArray(): FormArray { return this.formEdicao.get('metricas') as FormArray; }

  private criarFormVazio(): FormGroup {
    return this.fb.group({
      label: [''],
      valor: [''],
      resumo: [''],
      explicacao: [''],
      import_pacote: [''],
      classe: [''],
      funcao: [''],
      grupo: [''],
      prever_categoria: [null],
      dados_rotulados: [null],
      hiperparametros: this.fb.array([]),
      metricas: this.fb.array([]),
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['atualizar'] && this.atualizar && !this.elementos.length) {
      this.carregarElementos();
    }
  }

  get elementosFiltrados(): ElementoCatalogo[] {
    const t = (this.busca || '').trim().toLowerCase();
    if (!t) return this.elementos;
    return this.elementos.filter(e =>
      (e.label || '').toLowerCase().includes(t) ||
      (e.valor || '').toLowerCase().includes(t)
    );
  }

  carregarElementos() {
    this.carregando = true;
    if (this.tipoCatalogo === 'pre_processamento') {
      this.carregarPreProcessamento();
    } else {
      this.carregarCatalogo();
    }
  }

  private carregarCatalogo() {
    let req;
    switch (this.tipoCatalogo) {
      case 'coleta_dados': req = this.dashboard.fetchItensColetasDados(); break;
      case 'modelos': req = this.dashboard.fetchItensModelos(); break;
      case 'metricas': req = this.dashboard.fetchItensMetricas(); break;
      default: req = this.dashboard.fetchItensColetasDados();
    }
    req.subscribe({
      next: (itens: any[]) => {
        this.elementos = (itens || []).map(i => ({ ...i, habilitado: i.habilitado !== false }));
        this.carregando = false;
      },
      error: () => {
        this.notificacao.erro('Erro ao carregar elementos.');
        this.carregando = false;
      }
    });
  }

  private carregarPreProcessamento() {
    const catalogo = this.dashboard.getPreProcessamentoCatalogo();
    this.dashboard.fetchPreProcessamentoOverrides().subscribe({
      next: (overrides: any[]) => {
        const map = new Map((overrides || []).map((o: any) => [o.valor, o]));
        this.elementos = catalogo.map((c: any) => {
          const override = map.get(c.valor);
          return {
            id: c.valor,
            label: c.label,
            valor: c.valor,
            grupo: c.grupo,
            resumo: c.resumo,
            import_pacote: c.import_pacote || '',
            classe: c.classe || '',
            parametros: c.parametros || [],
            habilitado: override ? override.habilitado : (c.habilitado !== false),
          };
        });
        this.carregando = false;
      },
      error: () => {
        this.elementos = catalogo.map((c: any) => ({
          id: c.valor,
          label: c.label,
          valor: c.valor,
          grupo: c.grupo,
          resumo: c.resumo,
          import_pacote: c.import_pacote || '',
          classe: c.classe || '',
          parametros: c.parametros || [],
          habilitado: c.habilitado !== false,
        }));
        this.carregando = false;
      }
    });
  }

  iniciarEdicao(item: ElementoCatalogo) {
    this.editandoId = item.id;
    this.criandoNovo = false;

    this.formEdicao = this.criarFormVazio();
    this.formEdicao.patchValue({
      label: item.label || '',
      valor: item.valor || '',
      resumo: item.resumo || '',
      explicacao: item.explicacao || '',
      import_pacote: item.import_pacote || '',
      classe: item.classe || '',
      funcao: item.funcao || '',
      grupo: item.grupo || '',
      prever_categoria: item.preverCategoria ?? item['prever_categoria'] ?? null,
      dados_rotulados: item.dadosRotulados ?? item['dados_rotulados'] ?? null,
    });

    if (this.tipoCatalogo === 'modelos') {
      const hips = item.hiperparametros || [];
      hips.forEach((h: any) => this.adicionarHiperparametro(h.nomeHiperparametro, h.valorPadrao, h.tipo || 'string'));
      const metrics = item.metricas || [];
      this.metricasDisponiveis.forEach(m => {
        const found = metrics.includes(m.valor);
        this.adicionarMetrica(m.valor, found);
      });
    }
  }

  cancelarEdicao() {
    this.editandoId = null;
    this.criandoNovo = false;
    this.formEdicao = this.criarFormVazio();
  }

  salvarEdicao(item: ElementoCatalogo) {
    if (this.salvando) return;
    this.salvando = true;

    const body: any = {};
    for (const [key, val] of Object.entries(this.formEdicao.value)) {
      if (key === 'hiperparametros') {
        body.hiperparametros = (val as any[]).map((h: any) => ({
          nomeHiperparametro: h.nomeHiperparametro,
          valorPadrao: this.parseValorHiperparametro(h.valorPadrao, h.tipo),
          tipo: h.tipo || 'string',
        }));
      } else if (key === 'metricas') {
        body.metricas = (val as any[]).filter((m: any) => m.selecionado).map((m: any) => m.valor);
      } else if (val !== undefined && val !== null && val !== '') {
        body[key] = val;
      }
    }

    if (this.tipoCatalogo === 'pre_processamento') {
      this.dashboard.putPreProcessamentoDoc(item.valor, body).subscribe({
        next: () => {
          Object.assign(item, body);
          item.salvando = false;
          this.salvando = false;
          this.editandoId = null;
          this.notificacao.sucesso('Item atualizado com sucesso.');
        },
        error: () => {
          item.salvando = false;
          this.salvando = false;
          this.notificacao.erro('Erro ao salvar item.');
        }
      });
    } else {
      this.dashboard.putCatalogoItem(this.tipoCatalogo, item.id, body).subscribe({
        next: () => {
          Object.assign(item, body);
          item.salvando = false;
          this.salvando = false;
          this.editandoId = null;
          this.notificacao.sucesso('Item atualizado com sucesso.');
        },
        error: () => {
          item.salvando = false;
          this.salvando = false;
          this.notificacao.erro('Erro ao salvar item.');
        }
      });
    }
  }

  toggleHabilitado(item: ElementoCatalogo) {
    const novoValor = !item.habilitado;
    item.salvando = true;
    this.dashboard.patchHabilitado(this.tipoCatalogo, item.id, novoValor).subscribe({
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

  iniciarCriacao() {
    this.criandoNovo = true;
    this.editandoId = null;
    this.formEdicao = this.criarFormVazio();
    if (this.tipoCatalogo === 'modelos') {
      this.metricasDisponiveis.forEach(m => this.adicionarMetrica(m.valor, false));
    }
  }

  salvarNovo() {
    if (this.salvando) return;
    const label = (this.formEdicao.value.label || '').trim();
    const resumo = (this.formEdicao.value.resumo || '').trim();
    if (!label) {
      this.notificacao.erro('O nome (label) é obrigatório.');
      return;
    }
    const valor = this.formEdicao.value.valor || label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
    this.salvando = true;

    const body: any = { label, valor, resumo };
    for (const [key, val] of Object.entries(this.formEdicao.value)) {
      if (key === 'hiperparametros') {
        body.hiperparametros = (val as any[]).map((h: any) => ({
          nomeHiperparametro: h.nomeHiperparametro,
          valorPadrao: this.parseValorHiperparametro(h.valorPadrao, h.tipo),
          tipo: h.tipo || 'string',
        }));
      } else if (key === 'metricas') {
        body.metricas = (val as any[]).filter((m: any) => m.selecionado).map((m: any) => m.valor);
      } else if (val !== undefined && val !== null && val !== '' && key !== 'label' && key !== 'resumo') {
        body[key] = val;
      }
    }

    this.dashboard.postCatalogoItem(this.tipoCatalogo, body).subscribe({
      next: (res: any) => {
        this.elementos.push({ id: res.id, ...body, habilitado: true } as ElementoCatalogo);
        this.criandoNovo = false;
        this.salvando = false;
        this.formEdicao = this.criarFormVazio();
        this.notificacao.sucesso('Item criado com sucesso.');
      },
      error: () => {
        this.salvando = false;
        this.notificacao.erro('Erro ao criar item. Verifique se o valor já existe.');
      }
    });
  }

  excluir(item: ElementoCatalogo) {
    if (!confirm(`Deseja realmente excluir "${item.label || item.valor}"?`)) return;
    item.salvando = true;
    this.dashboard.deleteCatalogoItem(this.tipoCatalogo, item.id).subscribe({
      next: () => {
        this.elementos = this.elementos.filter(e => e.id !== item.id);
        this.notificacao.sucesso('Item excluído com sucesso.');
      },
      error: () => {
        item.salvando = false;
        this.notificacao.erro('Erro ao excluir item.');
      }
    });
  }

  tipoModelo(item: ElementoCatalogo): string {
    const pc = item.preverCategoria ?? item['prever_categoria'];
    const dr = item.dadosRotulados ?? item['dados_rotulados'];
    if (pc === true) return 'Classificação';
    if (pc === false && dr !== false) return 'Regressão';
    if (dr === false) return 'Agrupamento';
    return '';
  }

  adicionarHiperparametro(nome = '', valor: any = '', tipo = 'string') {
    this.hiperparametrosArray.push(this.fb.group({
      nomeHiperparametro: [nome],
      valorPadrao: [valor ?? ''],
      tipo: [tipo],
    }));
  }

  removerHiperparametro(index: number) {
    this.hiperparametrosArray.removeAt(index);
  }

  adicionarMetrica(valor = '', selecionado = true) {
    this.metricasArray.push(this.fb.group({
      valor: [valor],
      selecionado: [selecionado],
    }));
  }

  toggleMetrica(index: number) {
    const ctrl = this.metricasArray.at(index).get('selecionado');
    ctrl?.setValue(!ctrl.value);
  }

  parseValorHiperparametro(valor: any, tipo: string): any {
    if (tipo === 'number') {
      const n = Number(valor);
      return isNaN(n) ? valor : n;
    }
    if (tipo === 'boolean') {
      if (valor === 'true' || valor === true) return true;
      if (valor === 'false' || valor === false) return false;
    }
    return valor;
  }
}
