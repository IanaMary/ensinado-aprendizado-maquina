import { Injectable } from '@angular/core';
import { slugificarNome } from './slug.util';

/** Um gráfico do relatório: imagem (dataURL) + discussão + dicas didáticas. */
export interface RelatorioGraficoPdf {
  titulo: string;
  modelo: string;
  dataUrl: string;          // data:image/png;base64,...
  discussao?: string;
  dicas?: string[];
}

/** Entrada estruturada do relatório — montada pelo Clássico e pela Trilha. */
export interface RelatorioPdfInput {
  nomeExperimento?: string | null;
  dataset: string;
  pergunta?: string;
  modelos: string[];
  melhorModelo?: string | null;
  metricasHeader: string[];     // ['Métrica', ...modelos]
  metricasLinhas: string[][];   // [[metrica, v1, v2...], ...]
  observacoes: string[];
  graficos: RelatorioGraficoPdf[];
}

const ROXO: [number, number, number] = [76, 29, 149];

/**
 * Gera o relatório PDF "completo" (capa, tabela de métricas, observações e,
 * por gráfico, imagem + discussão + dicas). O jsPDF é carregado de forma LAZY
 * (import dinâmico memoizado) para não pesar no bundle inicial — mesmo padrão
 * do HighlightService. Compartilhado pelo Clássico (metrica-avaliacao) e pela
 * Trilha.
 */
@Injectable({ providedIn: 'root' })
export class RelatorioPdfService {
  private libs?: Promise<{ jsPDF: any; autoTable: any }>;

  private load(): Promise<{ jsPDF: any; autoTable: any }> {
    if (!this.libs) {
      this.libs = (async () => {
        const jsPDFmod: any = await import('jspdf');
        const jsPDF = jsPDFmod.jsPDF || jsPDFmod.default;
        const autoTableMod: any = await import('jspdf-autotable');
        const autoTable = autoTableMod.default || autoTableMod;
        return { jsPDF, autoTable };
      })();
    }
    return this.libs;
  }

  async gerar(input: RelatorioPdfInput): Promise<void> {
    const { jsPDF, autoTable } = await this.load();
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const M = 15;
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const CW = W - 2 * M;
    let y = M;

    const novaPagina = () => { doc.addPage(); y = M; };
    const garantir = (h: number) => { if (y + h > H - M) novaPagina(); };

    const texto = (
      t: string,
      opts: { size?: number; style?: string; color?: [number, number, number]; gap?: number } = {},
    ) => {
      const size = opts.size ?? 11;
      const lh = size * 0.42 + 1; // altura de linha aprox. (mm)
      doc.setFont('helvetica', opts.style ?? 'normal');
      doc.setFontSize(size);
      doc.setTextColor(...(opts.color ?? [30, 30, 30]));
      for (const ln of doc.splitTextToSize(t || '', CW)) {
        garantir(lh);
        doc.text(ln, M, y);
        y += lh;
      }
      y += opts.gap ?? 0;
    };

    // Cabeçalho (faixa roxa) — só na 1ª página.
    doc.setFillColor(...ROXO);
    doc.rect(0, 0, W, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Relatório do experimento', M, 16);
    y = 34;

    if (input.nomeExperimento) texto(`Experimento: ${input.nomeExperimento}`, { size: 13, style: 'bold', color: ROXO });
    texto(`Dataset: ${input.dataset}`, { size: 11, gap: 1 });
    if (input.pergunta) {
      texto('Pergunta', { size: 12, style: 'bold', color: ROXO });
      texto(input.pergunta, { gap: 2 });
    }
    texto('Modelos avaliados', { size: 12, style: 'bold', color: ROXO });
    texto(input.modelos.map(m => `• ${m}`).join('\n'));
    if (input.melhorModelo) texto(`Melhor modelo (mais métricas ganhas): ${input.melhorModelo}`, { style: 'bold', gap: 2 });

    // Tabela de métricas.
    if (input.metricasLinhas.length) {
      garantir(14);
      texto('Resultados', { size: 12, style: 'bold', color: ROXO });
      autoTable(doc, {
        head: [input.metricasHeader],
        body: input.metricasLinhas,
        startY: y,
        margin: { left: M, right: M },
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: ROXO, textColor: 255 },
        alternateRowStyles: { fillColor: [245, 240, 255] },
      });
      y = ((doc as any).lastAutoTable?.finalY ?? y) + 6;
    }

    // Observações ("O que observar").
    if (input.observacoes.length) {
      garantir(12);
      texto('O que observar', { size: 12, style: 'bold', color: ROXO });
      texto(input.observacoes.map(o => `• ${o}`).join('\n'), { gap: 2 });
    }

    // Gráficos: imagem + discussão + dicas.
    if (input.graficos.length) {
      garantir(12);
      texto('Visualizações', { size: 13, style: 'bold', color: ROXO, gap: 1 });
      for (const g of input.graficos) {
        garantir(12);
        texto(`${g.titulo} — ${g.modelo}`, { size: 11, style: 'bold', color: ROXO });
        try {
          const props = doc.getImageProperties(g.dataUrl);
          const ratio = props.height / props.width;
          let w = CW, h = w * ratio;
          const maxH = 110;
          if (h > maxH) { h = maxH; w = h / ratio; }
          garantir(h + 4);
          doc.addImage(g.dataUrl, 'PNG', M, y, w, h);
          y += h + 4;
        } catch { /* imagem inválida: segue sem quebrar o relatório */ }
        if (g.discussao) texto(g.discussao, { size: 10 });
        if (g.dicas?.length) {
          texto('Dicas', { size: 10, style: 'bold', color: ROXO });
          texto(g.dicas.map(d => `• ${d}`).join('\n'), { size: 10 });
        }
        y += 4;
      }
    }

    const slug = slugificarNome(input.nomeExperimento);
    doc.save(slug ? `relatorio_${slug}.pdf` : 'relatorio-experimento-ml.pdf');
  }
}
