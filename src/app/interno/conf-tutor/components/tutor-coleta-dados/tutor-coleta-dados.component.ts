import { Component, Input, OnChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DashboardService } from '../../../../dashboard/services/dashboard.service';
import modulesJson from '../../modules.json';

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
    private dashboardService: DashboardService) {

    this.formConfTutorColetaDados = this.formBuilder.group({
      texto_pipe: [null, [Validators.required]],
      planilha_treino: [null, [Validators.required]],
      planilha_teste: [null, [Validators.required]],
      divisao_treino_teste: [null, [Validators.required]],
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
          planilha_treino: res?.planilha_treino || '',
          planilha_teste: res?.planilha_teste || '',
          target: res?.target || '',
          atributos: res?.atributos || '',
          divisao_treino_teste: res?.divisao_treino_teste || ''
        });

      },
      error: (error: any) => {
        this.erroTutor = true;
      }
    });

  }

  putTutor() {
    const body = this.bodyTutor();
    this.dashboardService.putTutor(body, this.idTutor).subscribe({
      next: async (res: any) => {
        this.idTutor = res.id;
        this.formConfTutorColetaDados.patchValue({
          explicacao: res?.explicacao || ''
        });
      },
      error: (error: any) => {
        this.erroTutor = true;
      }
    });
  }


  bodyTutor() {
    const contextoOriginal = this.formConfTutorColetaDados.value;
    const contextoTratado = Object.fromEntries(
      Object.entries(contextoOriginal).map(([key, value]) => {
        return [key, typeof value === 'string' ? value.replace(/&nbsp;/g, ' ') : value];
      })
    );
    return {
      contexto: contextoTratado
    };
  }


}
