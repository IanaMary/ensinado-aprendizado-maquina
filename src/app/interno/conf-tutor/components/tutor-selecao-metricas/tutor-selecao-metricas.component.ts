import { Component, Input, OnChanges } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DashboardService } from '../../../../dashboard/services/dashboard.service';
import modulesJson from '../../modules.json';
import { NotificacaoService } from '../../../../service/notificacao.service';

@Component({
  selector: 'app-tutor-selecao-metricas',
  templateUrl: './tutor-selecao-metricas.component.html',
  styleUrls: ['./tutor-selecao-metricas.component.scss'],
  standalone: false,
})
export class TutorSelecaoMetricasComponent implements OnChanges {

  @Input() atualizar = false;

  role: string = sessionStorage.getItem('role') || '';
  modules = modulesJson.modules;

  erroTutor = false;
  idTutor = '';
  opcaoSelecionada = 0;

  formConfTutorSelecaoMetricas: FormGroup;

  constructor(
    private readonly formBuilder: FormBuilder,
    private dashboardService: DashboardService,
    private readonly notificacao: NotificacaoService
  ) {
    this.formConfTutorSelecaoMetricas = this.formBuilder.group({
      texto_pipe: [null, [Validators.required]],
      explicacao: [null, []],
      tipos: this.formBuilder.array([]),
    });
  }

  ngOnChanges() {
    if (this.atualizar) {
      this.getTutor();
    }
  }

  getTutor() {
    this.dashboardService.getTutorEditar({ pipe: 'selecao-metricas' }).subscribe({
      next: (res: any) => {
        this.idTutor = res.id;

        // Atualiza os campos principais
        this.formConfTutorSelecaoMetricas.patchValue({
          texto_pipe: res?.texto_pipe || '',
          explicacao: res?.explicacao || ''
        });

        // Preenche o FormArray com as métricas recebidas
        const metricasArray = this.formConfTutorSelecaoMetricas.get('tipos') as FormArray;
        metricasArray.clear();
        (res.tipos || []).forEach((m: any) => {
          metricasArray.push(this.formBuilder.group({
            label: [m.label, Validators.required],
            explicacao: [m.explicacao, Validators.required],
            valor: [m.valor, Validators.required],
          }));
        });
      },
      error: () => {
        this.erroTutor = true;
        this.notificacao.erro('Erro ao buscar dados do início!');
      }
    });
  }

  putTutor() {
    const body = this.bodyTutor();
    this.dashboardService.putTutor(body, this.idTutor).subscribe({
      next: () => this.notificacao.sucesso('Edição feita com sucesso!'),
      error: () => {
        this.erroTutor = true;
        this.notificacao.erro('Erro ao editar!');
      }
    });
  }

  bodyTutor() {
    const contextoOriginal = this.formConfTutorSelecaoMetricas.value;
    const contextoTratado = Object.fromEntries(
      Object.entries(contextoOriginal).map(([key, value]) => [
        key,
        typeof value === 'string' ? value.replace(/&nbsp;/g, ' ') : value
      ])
    );
    return { contexto: contextoTratado };
  }

  get tipos(): FormArray {
    return this.formConfTutorSelecaoMetricas.get('tipos') as FormArray;
  }

}
