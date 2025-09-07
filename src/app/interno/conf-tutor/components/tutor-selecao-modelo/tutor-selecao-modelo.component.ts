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
      classficacao: this.formBuilder.array([]),
      regressao: this.formBuilder.array([]),
      agrupamento: this.formBuilder.array([]),
      reducao_dimensionalidade: this.formBuilder.array([])

    });
  }

  ngOnChanges() {
    if (this.atualizar) {
      this.onTipoModelo();
    }
  }


  getTutor(params: any) {
    this.dashboardService.getTutorEditar(params).subscribe({
      next: (res: any) => {
        this.idTutor = res.id;
        this.modelos[this.tipoModeloSelecionado] = res.modelos;
        this.getArrayModelos();
        this.erroTutor = false;
      },
      error: (error: any) => {
        this.erroTutor = true;
        this.notificacao.erro('Erro ao buscar dados dos modelos!');
      }
    });
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

      const aux = new URLSearchParams();
      aux.append('pipe', 'selecao-modelo');
      aux.append('modelos', this.tipoAprendizado);
      aux.append('modelos', this.subTipoAprendizado);

      const params = aux.toString();

      this.getTutor(params);
    }
  }

  getArrayModelos() {
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

  putTutor() {
    const cam = this.modelosMap[this.tipoModeloSelecionado];

    // Cria o body dinamicamente
    const body: any = { contexto: {} };

    // Garante que o tipoAprendizado exista
    if (!body.contexto[this.tipoAprendizado]) {
      body.contexto[this.tipoAprendizado] = {};
    }

    // Adiciona o subTipoAprendizado com os modelos
    body.contexto[this.tipoAprendizado][this.subTipoAprendizado] = {
      modelos: this.formConfTutorSelecaoModelo.value[cam]
    };

    // Monta os parâmetros da query
    const aux = new URLSearchParams();
    aux.append('modelos', this.tipoAprendizado);
    aux.append('modelos', this.subTipoAprendizado);
    const params = aux.toString();

    // Chama o serviço
    this.dashboardService.putTutorParams(body, this.idTutor, params).subscribe({
      next: (res: any) => {
        this.notificacao.sucesso('Edição feita com sucesso!');
      },
      error: (error: any) => {
        this.notificacao.erro('Erro ao editar!');
      }
    });
  }

}
