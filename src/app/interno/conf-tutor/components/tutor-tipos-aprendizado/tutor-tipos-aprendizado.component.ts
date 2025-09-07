import { Component, Input, OnChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import modulesJson from '../../modules.json';
import { DashboardService } from '../../../../dashboard/services/dashboard.service';
import { NotificacaoService } from '../../../../service/notificacao.service';

@Component({
  selector: 'app-tutor-tipos-aprendizado',
  templateUrl: './tutor-tipos-aprendizado.component.html',
  styleUrls: ['./tutor-tipos-aprendizado.component.scss'],
  standalone: false,
})
export class TtutorTiposAprendizadoComponent implements OnChanges {

  @Input() atualizar = false;

  role: string = sessionStorage.getItem('role') || '';
  modules = modulesJson.modules;

  idTutor = '';
  erroTutor = false;

  tipoAprendizado = 0;
  subTipoAprendizado = 0;

  formConfTutorSelecaoModelo: FormGroup;

  constructor(
    private readonly formBuilder: FormBuilder,
    private dashboardService: DashboardService,
    private readonly notificacao: NotificacaoService
  ) {
    this.formConfTutorSelecaoModelo = this.formBuilder.group({
      texto_pipe: [''],
      supervisionado: this.formBuilder.group({
        explicacao: [''],
        classficacao: this.formBuilder.group({ explicacao: [''] }),
        regressao: this.formBuilder.group({ explicacao: [''] })
      }),
      nao_supervisionado: this.formBuilder.group({
        explicacao: [''],
        reducao_dimensionalidade: this.formBuilder.group({ explicacao: [''] }),
        agrupamento: this.formBuilder.group({ explicacao: [''] })
      })
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

        // Atualiza o texto principal
        this.formConfTutorSelecaoModelo.patchValue({
          texto_pipe: res?.texto_pipe || ''
        });

        // Atualiza supervisionado
        const supervisionadoData = res?.supervisionado;
        if (supervisionadoData) {
          const supervisionadoForm = this.formConfTutorSelecaoModelo.get('supervisionado') as FormGroup;

          if (supervisionadoData.explicacao !== undefined) {
            supervisionadoForm.patchValue({ explicacao: supervisionadoData.explicacao });
          }

          // Atualiza subgrupos de supervisionado
          ['classficacao', 'regressao'].forEach(sub => {
            const subData = supervisionadoData[sub];
            if (!subData) return;

            const subForm = supervisionadoForm.get(sub) as FormGroup;
            if (!subForm) return;

            if (subData.explicacao !== undefined) {
              subForm.patchValue({ explicacao: subData.explicacao });
            }
          });
        }

        // Atualiza nao_supervisionado
        const naoSupervisionadoData = res?.nao_supervisionado;
        if (naoSupervisionadoData) {
          const naoSupervisionadoForm = this.formConfTutorSelecaoModelo.get('nao_supervisionado') as FormGroup;

          if (naoSupervisionadoData.explicacao !== undefined) {
            naoSupervisionadoForm.patchValue({ explicacao: naoSupervisionadoData.explicacao });
          }

          // Atualiza subgrupos de nao_supervisionado
          ['reducao_dimensionalidade', 'agrupamento'].forEach(sub => {
            const subData = naoSupervisionadoData[sub];
            if (!subData) return;

            const subForm = naoSupervisionadoForm.get(sub) as FormGroup;
            if (!subForm) return;

            if (subData.explicacao !== undefined) {
              subForm.patchValue({ explicacao: subData.explicacao });
            }
          });
        }

        this.erroTutor = false;
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
    this.dashboardService.putTutorTipoAprendizado(body, this.idTutor).subscribe({
      next: (res: any) => {
        this.notificacao.sucesso('Edição feita com sucesso!');
      },
      error: (error: any) => {
        this.notificacao.erro('Erro ao editar!');
      }
    });
  }

}
