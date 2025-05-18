import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ItemPipeline } from '../../models/item-coleta-dado.model';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private itensColetasDados = new BehaviorSubject<ItemPipeline[]>([
    { icon: 'arquivo.svg', label: 'CSV', movido: false, tipoItem: 'coleta-dado' },
    { icon: 'arquivo.svg', label: 'JSON', movido: false, tipoItem: 'coleta-dado' }
  ]);
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
