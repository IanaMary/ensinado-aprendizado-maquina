import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ItemColetaDado } from '../../models/item-coleta-dado.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private itensColetasDados = new BehaviorSubject<ItemColetaDado[]>([
    { icon: 'arquivo.svg', label: 'CSV', movido: false },
    { icon: 'arquivo.svg', label: 'JSON', movido: false }
  ]);
  private itemsEmExecucao = new BehaviorSubject<ItemColetaDado[]>([]);


  getItensColetasDados() {
    return this.itensColetasDados.asObservable();
  }


  getItemsEmExecucao() {
    return this.itemsEmExecucao.asObservable();
  }


  movendoItemExecucao(item: ItemColetaDado) {
    const currentItemsEmExecucao = [...this.itemsEmExecucao.value, item];
    this.itemsEmExecucao.next(currentItemsEmExecucao);
  }

  jaFoiMovido(item: ItemColetaDado): boolean {
    return this.itemsEmExecucao.value.some(i => i.label === item.label);
  }
}
