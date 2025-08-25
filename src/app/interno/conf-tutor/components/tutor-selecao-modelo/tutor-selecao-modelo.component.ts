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

  tipoAprendizado = 0
  subTipoAprendizado = 0

  formConfTutorSelecaoModelo: FormGroup;


  constructor(private readonly formBuilder: FormBuilder,
    private dashboardService: DashboardService,
    private readonly notificacao: NotificacaoService) {

    this.formConfTutorSelecaoModelo = this.formBuilder.group({
      texto_pipe: [null, [Validators.required]],
      aprendizado_supervisionado: [null, [Validators.required]],
      classficacao: [null, [Validators.required]],
      modelos_classficacao: this.formBuilder.array([]),
      regressao: [null, [Validators.required]],
      modelos_regressao: this.formBuilder.array([]),
      aprendizado_nao_supervisionado: [null, [Validators.required]],
      reducao_dimensionalidade: [null, [Validators.required]],
      modelos_reducao_dimensionalidade: this.formBuilder.array([]),
      agrupamento: [null, [Validators.required]],
      modelos_agrupamento: this.formBuilder.array([]),
    });

  }

  ngOnChanges() {
    if (this.atualizar) {
      this.getTutor();
    }
  }


  getTutor() {
    this.dashboardService.getTutorEditar({ pipe: 'selecao-modelo' }).subscribe({
      next: async (res: any) => {
        console.log("TutorSelecaoModeloComponent =>> ", res)
        this.idTutor = res.id;
        this.formConfTutorSelecaoModelo.patchValue({
          texto_pipe: res?.texto_pipe || '',
          aprendizado_supervisionado: res?.aprendizado_supervisionado || '',
          classficacao: res?.classficacao || '',
          regressao: res?.regressao || '',
          aprendizado_nao_supervisionado: res?.aprendizado_nao_supervisionado || '',
          reducao_dimensionalidade: res?.reducao_dimensionalidade || '',
          agrupamento: res?.agrupamento || ''
        });
        this.erroTutor = false;
      },
      error: (error: any) => {
        this.erroTutor = true;
        this.notificacao.erro('Erro ao buscar dados da seleção do modelo!');
      }
    });

  }

  putTutor() {
    const body = this.bodyTutor();
    this.dashboardService.putTutor(body, this.idTutor).subscribe({
      next: async (res: any) => {
        this.formConfTutorSelecaoModelo.patchValue({
          explicacao: res?.explicacao || ''
        });
        this.notificacao.sucesso('Edição feita com sucesso!');
      },
      error: (error: any) => {
        this.notificacao.erro('Erro ao editar!');
      }
    });
  }

  bodyTutor() {
    const contextoOriginal = this.formConfTutorSelecaoModelo.value;
    const contextoTratado = Object.fromEntries(
      Object.entries(contextoOriginal).map(([key, value]) => {
        return [key, typeof value === 'string' ? value.replace(/&nbsp;/g, ' ') : value];
      })
    );
    return {
      contexto: contextoTratado
    };
  }


  get modelosClassificacao(): FormArray {
    return this.formConfTutorSelecaoModelo.get('modelos_classficacao') as FormArray;
  }

  get modelosRegressao(): FormArray {
    return this.formConfTutorSelecaoModelo.get('modelos_regressao') as FormArray;
  }

  // Métodos para adicionar/remover
  addModeloClassificacao() {
    this.modelosClassificacao.push(this.formBuilder.control('', Validators.required));
  }

  removeModeloClassificacao(index: number) {
    this.modelosClassificacao.removeAt(index);
  }

  addModeloRegressao() {
    this.modelosRegressao.push(this.formBuilder.control('', Validators.required));
  }

  removeModeloRegressao(index: number) {
    this.modelosRegressao.removeAt(index);
  }



}
