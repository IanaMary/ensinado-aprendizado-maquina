import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ItemPipeline, TipoTarget } from '../../models/item-coleta-dado.model';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import itensPipeline from '../../../app/constants/itens-coletas-dados.json'


@Injectable({
  providedIn: 'root'
})

export class DashboardService {


  todosItensColetasDados = itensPipeline.itensColetasDados as ItemPipeline[];
  todosItensTreino = itensPipeline.itensTreino as ItemPipeline[];
  todosItensMetricas = itensPipeline.itensMetricas  as any[];


  private itensColetasDados = new BehaviorSubject<ItemPipeline[]>(this.todosItensColetasDados);
  private itensTreino = new BehaviorSubject<ItemPipeline[]>(this.todosItensTreino);
  private itensMetricas = new BehaviorSubject<ItemPipeline[]>(this.todosItensMetricas);
  private itemsEmExecucao = new BehaviorSubject<ItemPipeline[]>([]);


  url = environment.apiUrl;

  private readonly endpointClassificador: string = 'classificador';


  constructor(private http: HttpClient) { }

  classificadorTreino(tipoClassficador: string, body: any) {
    return this.http.post(`${this.url}${this.endpointClassificador}/treinamento/${tipoClassficador}`, body);
  }

  classificadorPrever(body: any) {
    return this.http.post(`${this.url}${this.endpointClassificador}/prever`, body);
  }


  getItensColetasDados() {
    return this.itensColetasDados.asObservable();
  }

  getItensTreino() {
    return this.itensTreino.asObservable();
  }

  getItensMetricas() {
    return this.itensMetricas.asObservable();
  }


  getItemsEmExecucao() {
    return this.itemsEmExecucao.asObservable();
  }


  movendoItemExecucao(item: ItemPipeline) {
    this.itemsEmExecucao.next([
      ...this.itemsEmExecucao.value,
      item
    ]);

    const itensAtualizados = this.itensColetasDados.value.map(i => ({
      ...i,
      habilitado: false
    }));
    this.itensColetasDados.next(itensAtualizados);

    const itensTreinoAtualizados = this.itensTreino.value.map(i => ({
      ...i,
      habilitado: false
    }));
    this.itensTreino.next(itensTreinoAtualizados);
  }

  moverItensEmExecucao() {
    const itensMovidos = [
      ...this.itensColetasDados.value.filter(item => item.movido),
      ...this.itensTreino.value.filter(item => item.movido)
    ];

    this.itemsEmExecucao.next(itensMovidos);
  }



  jaFoiMovido(item: ItemPipeline): boolean {
    return this.itemsEmExecucao.value.some(i => i.label === item.label);
  }


  atualizarItensTreinoPorTipo(tipoTargetSelecionado: TipoTarget, habilitado: boolean) {
    const itensAtualizados = this.todosItensTreino.map(item => ({
      ...item,
      habilitado: item.tipo === tipoTargetSelecionado ? habilitado : false
    }));

    this.itensTreino.next(itensAtualizados);
  }

  atualizarModeloSelecionado(valorModelo: string | undefined, tipo: TipoTarget) {
    const itensAtualizados = this.todosItensTreino.map(item => ({
      ...item,
      habilitado: false,
      movido: item.tipo === tipo && item.valor === valorModelo
    }));

    this.itensTreino.next(itensAtualizados);
  }
}
