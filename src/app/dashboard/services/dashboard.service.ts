import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ItemPipeline, TipoTarget } from '../../models/item-coleta-dado.model';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import itensPipeline from '../../../app/constants/itens-coletas-dados.json'

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  todosItensColetasDados = itensPipeline.itensColetasDados as ItemPipeline[];
  todosModelos = itensPipeline.itensTreino as ItemPipeline[];
  todosItensMetricas = itensPipeline.itensMetricas as any[];

  private itensColetasDados = new BehaviorSubject<ItemPipeline[]>([]);
  private itensModelos = new BehaviorSubject<ItemPipeline[]>([]);
  private itensMetricas = new BehaviorSubject<ItemPipeline[]>([]);



  private itemsEmExecucao = new BehaviorSubject<ItemPipeline[]>([]);

  url = environment.apiUrl;
  private readonly endpointConfPipeline: string = 'conf_pipeline/';
  private readonly endpointColeta: string = 'coleta_dados/';
  private readonly endpointModelo: string = 'modelos/';
  private readonly endpointMetricas: string = 'metricas/';
  private readonly endpointConfiguraca: string = 'configurar_treinamento';
  private readonly endpointClassificador: string = 'classificador';


  constructor(private http: HttpClient) {
    this.carregarItensColetasDados();
    this.carregarItensModelos();
    this.carregarItensMetricas();
  }


  // SERVIÇOS COM LIGAÇÃO COM BANCO 

  postColetaArquivo(tipo: string, body: any) {
    return this.http.post(`${this.url}${this.endpointColeta}salvar_${tipo}`, body);
  }

  getColetaInfo(tipo: string, idConfigurcacaoTreinamento: string) {
    return this.http.get(`${this.url}${this.endpointConfiguraca}/${tipo}/${idConfigurcacaoTreinamento}`);
  }

  putColetaConfig(tipo: string, idColeta: string, body: any) {
    return this.http.put(`${this.url}${this.endpointConfiguraca}/${tipo}/${idColeta}`, body);
  }


  getColetaDadosTreino(idColeta: string, limite: number) {
    return this.http.get(`${this.url}${this.endpointColeta}/unique?id_coleta=${idColeta}&limit=${limite}`);
  }

  classificadorTreino(tipoClassficador: string, body: any) {
    return this.http.post(`${this.url}${this.endpointClassificador}/treinamento/${tipoClassficador}`, body);
  }

  postMetricas(body: any) {
    return this.http.post(`${this.url}${this.endpointClassificador}/avaliar-multiplos`, body);
  }

  classificadorPrever(body: any) {
    return this.http.post(`${this.url}${this.endpointClassificador}/prever`, body);
  }


  fetchItensColetasDados() {
    return this.http.get<ItemPipeline[]>(`${this.url}${this.endpointConfPipeline}${this.endpointColeta}todos`);
  }

  fetchItensModelos() {
    return this.http.get<ItemPipeline[]>(`${this.url}${this.endpointConfPipeline}${this.endpointModelo}todos`);
  }


  fetchItensMetricas() {
    return this.http.get<ItemPipeline[]>(`${this.url}${this.endpointConfPipeline}${this.endpointMetricas}todos`);
  }

  // SERVIÇOS SEM LIGAÇÃO COM BANCO

  carregarItensColetasDados() {
    this.fetchItensColetasDados()
      .subscribe({
        next: dados => this.itensColetasDados.next(dados),
        error: err => {
          console.error('Erro ao carregar itens coleta dados:', err);
        }
      });
  }

  getItensColetasDados(): Observable<ItemPipeline[]> {
    return this.itensColetasDados.asObservable();
  }

  carregarItensModelos() {
    this.fetchItensModelos()
      .subscribe({
        next: dados => this.itensModelos.next(dados),
        error: err => {
          console.error('Erro ao carregar itens coleta dados:', err);
        }
      });
  }

  getModelos() {
    return this.itensModelos.asObservable();
  }

  carregarItensMetricas() {
    this.fetchItensMetricas()
      .subscribe({
        next: dados => this.itensMetricas.next(dados),
        error: err => {
          console.error('Erro ao carregar itens coleta dados:', err);
        }
      });
  }

  getItensMetricas() {
    return this.itensMetricas.asObservable();
  }


  getItemsEmExecucao() {
    return this.itemsEmExecucao.asObservable();
  }


  getModelosPorTipo(tipo: string | null): ItemPipeline[] {
    return this.itensModelos.value.filter(item => item.tipo === tipo);
  }


  getMetricasPorModelo(modelo: string, considerarMovido: boolean = false): string[] {
    const itemTreino = this.itensModelos.value.find(item => item.valor === modelo);

    // Se não encontrar ou não tiver métricas, retorna array vazio
    const metricasDoModelo = itemTreino?.metricas ?? [];

    if (considerarMovido) {
      // Filtra métricas movidas que pertençam ao modelo
      const metricasMovidas = this.itensMetricas.value
        .filter(item => item.movido && metricasDoModelo.includes(item.valor))
        .map(item => item.valor);

      if (metricasMovidas.length) {
        return metricasMovidas;
      }

      return [];
    }

    return metricasDoModelo;
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

    const modelosAtualizados = this.itensModelos.value.map(i => ({
      ...i,
      // habilitado: false
    }));

    this.itensModelos.next(modelosAtualizados);

    const itenssMetricaAtualizados = this.itensMetricas.value.map(i => ({
      ...i,
      // habilitado: false
    }));
    this.itensMetricas.next(itenssMetricaAtualizados);
  }

  moverItensEmExecucao() {

    const itensMovidos = [
      ...this.itensColetasDados.value.filter(item => item.movido),
      ...this.itensModelos.value.filter(item => item.movido),
      ...this.itensMetricas.value.filter(item => item.movido)
    ];

    this.itemsEmExecucao.next(itensMovidos);
  }

  jaFoiMovido(item: ItemPipeline): boolean {
    return this.itemsEmExecucao.value.some(i => i.label === item.label);
  }

  habilitadarModelos(tipoTargetSelecionado: TipoTarget, habilitado: boolean) {
    const itensAtualizados = this.itensModelos.value.map(item => ({
      ...item,
      habilitado: item.tipo === tipoTargetSelecionado
    }));
    this.itensModelos.next(itensAtualizados);
  }

  selecionarModelo(modeloSelecionado: any) {
    const itensAtualizados = this.itensModelos.value.map(item => ({
      ...item,
      habilitado: item.habilitado,
      movido: item.valor === modeloSelecionado.valor ? true : item.movido
    }));
    this.itensModelos.next(itensAtualizados);
  }

  habilitadarMetricas(metricasDisponiveis: any[]) {

    const itensAtualizados = this.itensMetricas.value.map(item => ({
      ...item,
      habilitado: metricasDisponiveis.some(
        sel => sel.valor === item.valor && sel.tipoItem === item.tipoItem
      )
    }));

    this.itensMetricas.next(itensAtualizados);
  }

  selecionarMetricas(metricaSelecionada: ItemPipeline) {

    const itensAtualizados = this.itensMetricas.value.map(item => {
      const isSelecionado = item.valor === metricaSelecionada.valor && item.tipoItem === metricaSelecionada.tipoItem;

      return {
        ...item,
        movido: isSelecionado ? metricaSelecionada.movido : item.movido,
        habilitado: item.habilitado
      };
    });

    this.itensMetricas.next(itensAtualizados);
  }

}
