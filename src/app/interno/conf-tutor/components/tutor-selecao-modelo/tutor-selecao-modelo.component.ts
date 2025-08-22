import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DashboardService } from '../../../../dashboard/services/dashboard.service';
import { BodyTutor } from '../../../../models/item-coleta-dado.model';
import { AuthService } from '../../../../service/auth/auth.service';
import modules from '../../modules.json';

@Component({
  selector: 'app-tutor-selecao-modelo',
  templateUrl: './tutor-selecao-modelo.component.html',
  styleUrls: ['./tutor-selecao-modelo.component.scss'],
  standalone: false,
})
export class TutorSelecaoModeloComponent implements OnChanges {

  role: string = sessionStorage.getItem('role') || '';
  @Input() formGroup!: FormGroup;

  conteudo = '';
  modules = modules

  erroTutor = false;



  tipoAprendizado = 0
  subTipoAprendizado = 0



  constructor(private readonly formBuilder: FormBuilder) { }


  ngOnChanges() { }


  get modelosClassificacao(): FormArray {
    return this.formGroup.get('modelos_classficacao') as FormArray;
  }

  get modelosRegressao(): FormArray {
    return this.formGroup.get('modelos_regressao') as FormArray;
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
