import { Component, Input, OnChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DashboardService } from '../../../../dashboard/services/dashboard.service';
import modulesJson from '../../modules.json';
import { NotificacaoService } from '../../../../service/notificacao.service';

@Component({
  selector: 'app-tutor-coleta-dados',
  templateUrl: './tutor-coleta-dados.component.html',
  styleUrls: ['./tutor-coleta-dados.component.scss'],
  standalone: false,
})
export class TutorColetaDadosComponent implements OnChanges {


  @Input() atualizar = false;

  role: string = sessionStorage.getItem('role') || '';
  modules = modulesJson.modules;

  erroTutor = false;
  idTutor = '';
  opcaoSelecionada = 0;

  formConfTutorColetaDados: FormGroup;

  constructor(private readonly formBuilder: FormBuilder,
    private readonly dashboardService: DashboardService,
    private readonly notificacao: NotificacaoService) {

    this.formConfTutorColetaDados = this.formBuilder.group({
      texto_pipe: [null, [Validators.required]],
      planilha_treino: [null, [Validators.required]],
      planilha_teste: [null, [Validators.required]],
      divisao_entre_treino_teste: [null, [Validators.required]],
      target: [null, [Validators.required]],
      atributos: [null, [Validators.required]]
    });

  }


  ngOnChanges() {
    if (this.atualizar) {
      this.getTutor();
    }
  }


  getTutor() {
    this.dashboardService.getTutorEditar({ pipe: 'coleta-dado' }).subscribe({
      next: async (res: any) => {
        this.idTutor = res.id;
        this.formConfTutorColetaDados.patchValue({
          texto_pipe: res?.texto_pipe || '',
          planilha_treino: res?.planilha_treino || '',
          planilha_teste: res?.planilha_teste || '',
          divisao_entre_treino_teste: res?.divisao_entre_treino_teste || '',
          target: res?.target || '',
          atributos: res?.atributos || ''
        });
        this.erroTutor = false;
      },
      error: (error: any) => {
        this.erroTutor = true;
        this.notificacao.erro('Erro ao buscar dados da coleta de dados!');
      }
    });

  }

  putTutor() {
    const body = {
      contexto: this.formConfTutorColetaDados.value
    }
    this.dashboardService.putTutor(body, this.idTutor).subscribe({
      next: async (res: any) => {
        this.notificacao.sucesso('Edição feita com sucesso!');
      },
      error: (error: any) => {
        this.notificacao.erro('Erro ao editar!');
      }
    });
  }


}
