// src/app/serviços/planilha.service.ts

import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root',
})
export class PlanilhaService {
  constructor() {}

  /**
   * Lê um arquivo Excel (.xlsx) e retorna uma Promise com os dados
   * @param file Arquivo .xlsx enviado pelo usuário
   * @param headerAsFirstRow Define se deve usar a primeira linha como cabeçalho (true) ou retornar array de arrays (false)
   */
  lerPlanilha(file: File, headerAsFirstRow: boolean = true): Promise<any[] | any[][]> {
    return new Promise((resolve, reject) => {
      const reader: FileReader = new FileReader();

      reader.onload = (e: any) => {
        try {
          const bstr: string = e.target.result;
          const workbook: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });
          const primeiraAba = workbook.SheetNames[0];
          const aba = workbook.Sheets[primeiraAba];

          let dados: any;

          if (headerAsFirstRow) {
            dados = XLSX.utils.sheet_to_json(aba); // array de objetos
          } else {
            dados = XLSX.utils.sheet_to_json(aba, { header: 1 }); // array de arrays
          }

          resolve(dados);
        } catch (erro) {
          reject(`Erro ao ler planilha: ${erro}`);
        }
      };

      reader.onerror = (erro) => reject(`Erro ao carregar arquivo: ${erro}`);

      reader.readAsBinaryString(file);
    });
  }
}
