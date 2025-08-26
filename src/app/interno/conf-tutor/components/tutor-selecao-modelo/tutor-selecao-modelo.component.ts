import { Component, Input, OnChanges } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
  modelosMap: any[] = ['classficacao', 'regressao', 'reducao_dimensionalidade', 'agrupamento'];

  formConfTutorSelecaoModelo: FormGroup;

  constructor(
    private readonly formBuilder: FormBuilder,
    private dashboardService: DashboardService,
    private readonly notificacao: NotificacaoService
  ) {
    this.formConfTutorSelecaoModelo = this.formBuilder.group({
      classficacao: this.formBuilder.array([]),
      regressao: this.formBuilder.array([]),
      reducao_dimensionalidade: this.formBuilder.array([]),
      agrupamento: this.formBuilder.array([])
    });
  }

  ngOnChanges() {
    if (this.atualizar) {
      this.onTipoModelo();
    }
  }


  onTipoModelo() {
    if (!this.modelos[this.tipoModeloSelecionado].length) {
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
      const aux = {
        prever_categoria: prever_categoria,
        dados_rotulados: dados_rotulados
      }
      const params = new URLSearchParams(aux as any).toString();
      this.getModelos(params);
    }
  }



  getModelos(params: any) {
    this.dashboardService.getModelosParams(params).subscribe({
      next: (res: any) => {
        this.modelos[this.tipoModeloSelecionado] = res;
        this.getArrayModelos();
        this.getTutor();
      },
      error: (error: any) => {
        this.erroTutor = true;
        this.notificacao.erro('Erro ao buscar dados da seleção do modelo!');
      }
    });
  }


  getTutor() {
    const params = {
      pipe: 'selecao-modelo',
      tipos: {
        tipoAprendizado: this.tipoAprendizado,
        subTipoAprendizado: this.subTipoAprendizado,
      }
    }
    this.dashboardService.getTutorEditar(params).subscribe({
      next: (res: any) => {
        this.idTutor = res.id;

        console.log("getTutor =>> ", res)

        this.erroTutor = false;
      },
      error: (error: any) => {
        this.erroTutor = true;
        this.notificacao.erro('Erro ao buscar dados da seleção do modelo!');
      }
    });
  }

  getArrayModelos() {
    console.log('getArrayModelos ', this.modelos[this.tipoModeloSelecionado])
    const mod = this.modelos[this.tipoModeloSelecionado];
    const chave = this.modelosMap[this.tipoModeloSelecionado];
    const metricasArray = this.formConfTutorSelecaoModelo.get(chave) as FormArray;
    metricasArray.clear(); // agora funciona
    (mod || []).forEach((m: any) => {
      metricasArray.push(this.formBuilder.group({
        explicacao: [m.explicacao, Validators.required],
      }));
    });
  }



  putTutor() {
    const body = {
      contexto: this.formConfTutorSelecaoModelo.value
    }
    console.log("body => ", body)
    this.dashboardService.putTutor(body, this.idTutor).subscribe({
      next: (res: any) => {
        this.notificacao.sucesso('Edição feita com sucesso!');
      },
      error: (error: any) => {
        this.notificacao.erro('Erro ao editar!');
      }
    });
  }

  get classficacaoArray(): FormArray {
    return this.formConfTutorSelecaoModelo.get('classficacao') as FormArray;
  }

  get painelArray() {
    if (this.tipoModeloSelecionado === 0) {
      return this.modelos[0].map((painel: any, index: number) => ({
        label: painel.label,
        formGroup: (this.formConfTutorSelecaoModelo.get('classficacao') as FormArray).at(index)
      }));
    }
    return this.modelos[this.tipoModeloSelecionado];
  }



  removerNbspEditor(event: any, caminho: string) {
    const control = this.formConfTutorSelecaoModelo.get(caminho);
    if (!control) return;

    // substitui &nbsp; por espaço normal
    const valorLimpo = (event.html || '').replace(/&nbsp;/g, ' ').trim();

    // só atualiza se o valor realmente mudou
    if (valorLimpo !== control.value) {
      control.setValue(valorLimpo, { emitEvent: false }); // evita disparar outro onContentChanged
    }
  }

}
