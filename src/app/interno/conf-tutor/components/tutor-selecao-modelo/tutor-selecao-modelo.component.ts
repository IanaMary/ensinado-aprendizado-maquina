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
  subTipoAprendizado = 'classificacao';

  modelos: any[] = [[], [], [], []];
  modelosMap: any[] = ['classificacao', 'regressao', 'agrupamento', 'reducao_dimensionalidade'];

  tabs = [false, false, false, false];

  formConfTutorSelecaoModelo: FormGroup;

  classificacao = [];
  regressao = [];
  reducao_dimensionalidade = [];
  agrupamento = [];

  constructor(
    private readonly formBuilder: FormBuilder,
    private dashboardService: DashboardService,
    private readonly notificacao: NotificacaoService
  ) {
    this.formConfTutorSelecaoModelo = this.formBuilder.group({
      classificacao: this.formBuilder.array([]),
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
    switch (this.tipoModeloSelecionado) {
      case 0: // Classificação
        this.tipoAprendizado = 'supervisionado';
        this.subTipoAprendizado = 'classificacao';
        break;
      case 1: // Regressão
        this.tipoAprendizado = 'supervisionado';
        this.subTipoAprendizado = 'regressao';
        break;
      case 2: // Agrupamento
        this.tipoAprendizado = 'nao_supervisionado';
        this.subTipoAprendizado = 'agrupamento';
        break;
      case 3: // Redução de dimensionalidade
        this.tipoAprendizado = 'nao_supervisionado';
        this.subTipoAprendizado = 'reducao_dimensionalidade';
        break;
    }
    this.atualizarForms();
  }

  atualizarForms() {
    if (!this.modelos[this.tipoModeloSelecionado].length) {


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
    const body = {
      contexto: {
        supervisionado: {
          classificacao: {
            modelos: this.formConfTutorSelecaoModelo.value.classificacao
          },
          regressao: {
            modelos: this.formConfTutorSelecaoModelo.value.regressao
          }
        },
        nao_supervisionado: {
          reducao_dimensionalidade: {
            modelos: this.formConfTutorSelecaoModelo.value.reducao_dimensionalidade
          },
          agrupamento: {
            modelos: this.formConfTutorSelecaoModelo.value.agrupamento
          }
        }
      }
    }

    // Chama o serviço
    this.dashboardService.putTutorModelo(body, this.idTutor).subscribe({
      next: (res: any) => {
        this.notificacao.sucesso(`Modelos de editados com sucesso!`);
      },
      error: (error: any) => {
        this.notificacao.erro(`Erro ao editar modelos!`);
      }
    });
  }

}
