import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ItemPipeline } from '../../models/item-coleta-dado.model';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import itensPipeline from '../../../app/constants/itens-coletas-dados.json'



@Injectable({
  providedIn: 'root'
})

export class DashboardService {


  todosItensColetasDados = itensPipeline.itensColetasDados as ItemPipeline[];
  todosItensTreino = itensPipeline.itensTreino as ItemPipeline[];


  private itensColetasDados = new BehaviorSubject<ItemPipeline[]>(this.todosItensColetasDados);
  private itensTreino = new BehaviorSubject<ItemPipeline[]>(this.todosItensTreino);
  private itemsEmExecucao = new BehaviorSubject<ItemPipeline[]>([]);


  url = environment.apiUrl;

  private readonly endpointClassificador: string = 'classificador';


  constructor(private http: HttpClient) {}

  classificadorTreino(body: any) {
    return this.http.post(`${this.url}${this.endpointClassificador}/treinamento`, body);
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


  getItemsEmExecucao() {
    return this.itemsEmExecucao.asObservable();
  }


  movendoItemExecucao(item: ItemPipeline) {
    const currentItemsEmExecucao = [...this.itemsEmExecucao.value, item];
    this.itemsEmExecucao.next(currentItemsEmExecucao);
  }

  jaFoiMovido(item: ItemPipeline): boolean {
    return this.itemsEmExecucao.value.some(i => i.label === item.label);
  }
}
