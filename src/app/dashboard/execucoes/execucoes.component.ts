import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DashboardService } from '../services/dashboard.service';
import { ItemPipeline, ResultadoColetaDado } from '../../models/item-coleta-dado.model';
import { ModalColetaDadoComponent } from './modals/modal-coleta-dado/modal-coleta-dado.component';

@Component({
  selector: 'app-execucoes',
  templateUrl: './execucoes.component.html',
  styleUrls: ['./execucoes.component.scss'],
  standalone: false,
})
export class ExecucoesComponent implements OnInit {

  dados: any[] = [];
  colunas: string[] = [];
  tipos: { [key: string]: string } = {};
  atributos: { [key: string]: boolean } = {};
  target: string = '';

  dadosTeste: any[] = [];
  colunasTeste: string[] = [];
  dadosPrever: any[] = [];

  erroTeste?: string;

  nomeArquivoTreino?: string;  
  nomeArquivoTeste?: string; 

  itens: ItemPipeline[] = [];

  constructor(
    private dashboardService: DashboardService,
    public dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.dashboardService.getItemsEmExecucao().subscribe(itens => {
      this.itens = [...itens];
    });
  }

  onDrop(event: CdkDragDrop<ItemPipeline[]>): void {
    // lógica futura
  }

  abrirExecucao(item: ItemPipeline): void {
    const dialogRef = this.dialog.open(ModalColetaDadoComponent, {
      data: {
        dados: this.dados,
        colunas: this.colunas,
        tipos: this.tipos,
        target: this.target,
        atributos: this.atributos,
        dadosTeste: this.dadosTeste,
        colunasTeste: this.colunasTeste,
        erroTeste: this.erroTeste,           // passa pro modal
        nomeArquivoTreino: this.nomeArquivoTreino,
        nomeArquivoTeste: this.nomeArquivoTeste,
      }
    });

    dialogRef.afterClosed().subscribe((resultado: ResultadoColetaDado | undefined) => {
      if (resultado) {
        if (resultado.dados?.length) {
          this.dados = resultado.dados;
          this.colunas = resultado.colunas;
          this.tipos = resultado.tipos;
          this.atributos = resultado.atributos;
          this.target = resultado.target;
          this.dadosTeste = resultado.dadosTeste;
          this.colunasTeste = resultado.colunasTeste;
        }

        this.erroTeste = resultado.erroTeste;               // atualiza aqui
        this.nomeArquivoTreino = resultado.nomeArquivoTreino;
        this.nomeArquivoTeste = resultado.nomeArquivoTeste;

        this.classificadorTreino();
      }
    });
  }


  classificadorTreino() {
    const body = {
      dados_treino: this.dados,
      dados_teste: this.dadosTeste,
      target: this.target,
      atributos: Object.keys(this.atributos).filter(chave => this.atributos[chave])
    }
    this.dashboardService.classificadorTreino(body).subscribe(
      (res: any) => {
        console.log('Modelo treinado - classificador')
      },
      (error: any) => {
         console.log('Erro ao treinar o modelo - classificador')
       }
    );
  }

  classificadorPrever() {
    const dadosSemTarget = this.dadosPrever.map(item => {
      const novoItem = { ...item };
      delete novoItem[this.target];  // Remove a propriedade target
      return novoItem;
    });

    const body = {
      dados: dadosSemTarget
    };
    
    this.dashboardService.classificadorPrever(body).subscribe(
      (res: any) => {
        console.log("Prever ", res);
      },
      (error: any) => {
        console.error(error);
      }
    );
  }

}
