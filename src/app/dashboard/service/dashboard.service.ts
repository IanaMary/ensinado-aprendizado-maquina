import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ItemPipeline } from '../../models/item-coleta-dado.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private itensColetasDados = new BehaviorSubject<ItemPipeline[]>([
    { icon: 'arquivo.svg', label: 'CSV', movido: false, tipoItem: 'coleta-dado' },
    { icon: 'arquivo.svg', label: 'JSON', movido: false, tipoItem: 'coleta-dado' }
  ]);
  private itemsEmExecucao = new BehaviorSubject<ItemPipeline[]>([]);


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
