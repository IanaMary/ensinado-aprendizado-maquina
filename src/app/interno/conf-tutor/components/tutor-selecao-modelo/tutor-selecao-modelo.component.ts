import { Component, Input, OnChanges } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import modulesJson from '../../modules.json';
import { DashboardService } from '../../../../dashboard/services/dashboard.service';
import { NotificacaoService } from '../../../../service/notificacao.service';

@Component({
  selector: 'app-tutor-selecao-modelo',
  templateUrl: './tutor-selecao-modelo.component.html',
  styleUrls: ['./tutor-selecao-modelo.component.scss'],
  standalone: false,
})
export class TutorSelecaoModeloComponent implements OnChanges {

  @Input() atualizar = false;

  role: string = sessionStorage.getItem('role') || '';
  modules = modulesJson.modules;

  idTutor = '';
  erroTutor = false;

  tipoModeloSelecionado = 0;
  tipoAprendizado = 'supervisionado';
  subTipoAprendizado = 'classficacao';

  modelos: any[] = [[], [], [], []];
  modelosMap: any[] = ['classficacao', 'regressao', 'agrupamento', 'reducao_dimensionalidade'];
  tabs = [false, false, false, false];

  formConfTutorSelecaoModelo: FormGroup;

  classficacao = [];
  regressao = [];
  reducao_dimensionalidade = [];
  agrupamento = [];

  constructor(
    private readonly formBuilder: FormBuilder,
    private dashboardService: DashboardService,
    private readonly notificacao: NotificacaoService
  ) {
    this.formConfTutorSelecaoModelo = this.formBuilder.group({
      classficacao: this.formBuilder.array([], Validators.required),
      regressao: this.formBuilder.array([], Validators.required),
      reducao_dimensionalidade: this.formBuilder.array([], Validators.required),
      agrupamento: this.formBuilder.array([], Validators.required)
    });
  }

  ngOnChanges() {
    if (this.atualizar) {
      this.getTutor();
    }
  }


  getTutor() {
    this.dashboardService.getTutorEditar({ pipe: 'selecao-modelo' }).subscribe({
      next: (res: any) => {
        this.idTutor = res.id;
        this.modelos[0] = res.supervisionado.classficacao.modelos;
        this.modelos[1] = res.supervisionado.regressao.modelos;
        this.modelos[2] = res.nao_supervisionado.agrupamento.modelos;
        this.modelos[3] = res.nao_supervisionado.reducao_dimensionalidade.modelos;
        this.onTipoModelo();
        this.erroTutor = false;
      },
      error: (error: any) => {
        this.erroTutor = true;
        this.notificacao.erro('Erro ao buscar dados dos modelos!');
      }
    });
  }


  onTipoModelo() {
    // if (!this.modelos[this.tipoModeloSelecionado].length) {
    if (!this.tabs[this.tipoModeloSelecionado]) {
      let prever_categoria = false;
      let dados_rotulados = false;

      switch (this.tipoModeloSelecionado) {
        case 0: // Classificação
          prever_categoria = true;
          dados_rotulados = true;
          this.tipoAprendizado = 'supervisionado';
          this.subTipoAprendizado = 'classficacao';
          break;
        case 1: // Regressão
          prever_categoria = false;
          dados_rotulados = true;
          this.tipoAprendizado = 'supervisionado';
          this.subTipoAprendizado = 'regressao';
          break;
        case 2: // Agrupamento
          prever_categoria = true;
          dados_rotulados = false;
          this.tipoAprendizado = 'nao_supervisionado';
          this.subTipoAprendizado = 'agrupamento';
          break;
        case 3: // Redução de dimensionalidade
          prever_categoria = false;
          dados_rotulados = false;
          this.tipoAprendizado = 'nao_supervisionado';
          this.subTipoAprendizado = 'reducao_dimensionalidade';
          break;
      }
      // const aux = {
      //   prever_categoria: prever_categoria,
      //   dados_rotulados: dados_rotulados
      // }
      // const params = new URLSearchParams(aux as any).toString();
      // this.getModelos(params);
      this.getArrayModelos();
    }
  }

  getArrayModelos() {
    this.tabs[this.tipoModeloSelecionado] = true;
    const mod = this.modelos[this.tipoModeloSelecionado];
    const chave = this.modelosMap[this.tipoModeloSelecionado];
    const metricasArray = this.formConfTutorSelecaoModelo.get(chave) as FormArray;
    metricasArray.clear(); // agora funciona
    (mod || []).forEach((m: any) => {
      metricasArray.push(this.formBuilder.group({
        explicacao: [m.explicacao, Validators.required],
        label: [m.label, Validators.required],
        valor: [m.valor, Validators.required],
      }));
    });

  }

  getModelos(params: any) {
    this.dashboardService.getModelosParams(params).subscribe({
      next: (res: any) => {
        this.modelos[this.tipoModeloSelecionado] = res;
        this.getArrayModelos();
        // this.getTutor();
      },
      error: (error: any) => {
        this.erroTutor = true;
        this.notificacao.erro('Erro ao buscar dados da seleção do modelo!');
      }
    });
  }


  putTutor() {
    const body = {
      contexto: this.formConfTutorSelecaoModelo.value
    }
    this.dashboardService.putTutor(body, this.idTutor).subscribe({
      next: (res: any) => {
        this.notificacao.sucesso('Edição feita com sucesso!');
      },
      error: (error: any) => {
        this.notificacao.erro('Erro ao editar!');
      }
    });
  }


  removerNbspEditor(event: any, caminho: string) {
    const control = this.formConfTutorSelecaoModelo.get(caminho);
    if (!control) return;

    const valorLimpo = (event.html || '').replace(/&nbsp;/g, ' ').trim();

    if (control instanceof FormControl) {
      if (valorLimpo !== control.value) {
        control.setValue(valorLimpo, { emitEvent: false });
      }
    }
  }


}
