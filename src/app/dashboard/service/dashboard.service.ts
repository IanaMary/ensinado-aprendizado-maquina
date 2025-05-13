import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ItemColetaDado } from '../../models/item-coleta-dado.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private itensColetasDados = new BehaviorSubject<ItemColetaDado[]>([
    { icon: 'arquivo.svg', label: 'CSV', movido: false }
  ]);
  private itemsEmExecucao  = new BehaviorSubject<ItemColetaDado[]>([]);


  getItensColetasDados() {
    return this.itensColetasDados.asObservable();
  }


  getItemsEmExecucao() {
    return this.itemsEmExecucao.asObservable();
  }

  
  movendoItemExecucao(item: ItemColetaDado) {
    const currentItensColetasDados = this.itensColetasDados.value.filter(i => i.label !== item.label);
    const currentItemsEmExecucao = [...this.itemsEmExecucao .value, item];
    this.itemsEmExecucao .next(currentItemsEmExecucao);
  }


}
