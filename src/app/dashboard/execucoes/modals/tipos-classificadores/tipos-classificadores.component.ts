import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Modelo, TipoTarget } from '../../../../models/item-coleta-dado.model';



@Component({
  selector: 'app-tipos-classificadores',
  templateUrl: './tipos-classificadores.component.html',
  styleUrls: ['./tipos-classificadores.component.scss'],
  standalone: false
})
export class TiposClassificadoresComponent implements OnChanges {

  @Input() tipoTarget: TipoTarget = undefined;
  @Input() modeloSelecionado: Modelo | undefined;
  @Output() selecaoModelo = new EventEmitter<Modelo>();


  todosModelos: Modelo[] = [
    { nome: 'K-Nearest Neighbors (k-NN)', valor: 'knn', resumo: 'k-NN é um classificador baseado em instâncias que classifica um dado novo com base na maioria dos k vizinhos mais próximos.', tipo: 'string' },
    { nome: 'Árvore de Decisão', valor: 'arvore-decisao', resumo: 'Árvore de Decisão cria um modelo em forma de árvore para tomar decisões baseadas em características dos dados.', tipo: 'string' },
    { nome: 'Support Vector Machine (SVM)', valor: 'svm', resumo: 'SVM busca um hiperplano que separa as classes com a maior margem possível no espaço de características.', tipo: 'string' },
    { nome: 'Regressão Linear', valor: 'regressao-linear', resumo: 'Regressão Linear ajusta uma reta que minimiza o erro quadrático médio entre as previsões e os valores reais.', tipo: 'number' },
    { nome: 'Regressão Logística', valor: 'regressao-logistica', resumo: 'Regressão Logística modela a probabilidade de uma classe binária usando a função logística.', tipo: 'number' },
    { nome: 'Support Vector Regression (SVR)', valor: 'svr', resumo: 'SVR aplica o conceito de SVM para regressão, procurando um tubo onde a maioria dos pontos caiba.', tipo: 'number' }
  ];

  modelosDisponiveis: Modelo[] = [];
  modelo!: Modelo | undefined;
  modeloValor: string | undefined;

  target: TipoTarget = undefined;

  ngOnChanges(changes: SimpleChanges): void {
 
    if (changes['tipoTarget']?.currentValue) {
      this.target = changes['tipoTarget'].currentValue
    } else {
      this.target = this.modeloSelecionado ? this.modeloSelecionado.tipo : this.tipoTarget;
    }
    this.modelosDisponiveis = this.todosModelos.filter(m => m.tipo === this.target);
    this.modeloValor = this.modeloSelecionado ? this.modeloSelecionado.valor : this.modelosDisponiveis[0].valor;
    setTimeout(() => this.emitSelecaoModelo());
  }

  emitSelecaoModelo() {
    this.modelo = this.modelosDisponiveis.find(m => m.valor === this.modeloValor);
    this.selecaoModelo.emit(this.modelo);
  }


}
