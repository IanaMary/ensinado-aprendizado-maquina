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
const HUB_URL = 'https://ia.ufpel.edu.br';
const HUB_NOME = 'Hub de Inovação em Inteligência Artificial';

/**
 * Gera o relatório PDF "completo" (capa, tabela de métricas, observações e,
 * por gráfico, imagem + discussão + dicas). O jsPDF é carregado de forma LAZY
 * (import dinâmico memoizado) para não pesar no bundle inicial — mesmo padrão
 * do HighlightService. Compartilhado pelo Clássico (metrica-avaliacao) e pela
 * Trilha.
 */
@Injectable({ providedIn: 'root' })
export class RelatorioPdfService {
  private libs?: Promise<{ jsPDF: any }>;

  private load(): Promise<{ jsPDF: any }> {
    if (!this.libs) {
      this.libs = (async () => {
        const jsPDFmod: any = await import('jspdf');
        const jsPDF = jsPDFmod.jsPDF || jsPDFmod.default;
        return { jsPDF };
      })();
    }
    return this.libs;
  }

  // Símbolo branco do Hub (assets) como dataURL, memoizado; null se indisponível
  // (o PDF segue sem logo em vez de quebrar).
  private logoBranco?: Promise<string | null>;
  private carregarLogoBranco(): Promise<string | null> {
    if (!this.logoBranco) {
      this.logoBranco = fetch('assets/brand/simbolo-ia-branco.png')
        .then(r => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
        .then(b => new Promise<string>((res, rej) => {
          const fr = new FileReader();
          fr.onload = () => res(fr.result as string);
          fr.onerror = rej;
          fr.readAsDataURL(b);
        }))
        .catch(() => null);
    }
    return this.logoBranco;
  }

  async gerar(input: RelatorioPdfInput): Promise<void> {
    const { jsPDF } = await this.load();
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

    // Cabeçalho (faixa roxa) — só na 1ª página. Identidade H2IA: símbolo à
    // direita e nome/site do Hub (com link) sob o título.
    doc.setFillColor(...ROXO);
    doc.rect(0, 0, W, 26, 'F');
    const logo = await this.carregarLogoBranco();
    if (logo) {
      try {
        const p = doc.getImageProperties(logo);
        const lh = 14, lw = lh * (p.width / p.height);
        doc.addImage(logo, 'PNG', W - M - lw, 6, lw, lh);
        doc.link(W - M - lw, 6, lw, lh, { url: HUB_URL });
      } catch { /* segue sem logo */ }
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Relatório do experimento', M, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.textWithLink(`${HUB_NOME} — ia.ufpel.edu.br`, M, 21, { url: HUB_URL });
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

    // Tabela de métricas (desenhada à mão — sem depender de jspdf-autotable, cujo
    // interop de import quebrava no bundle: "n is not a function").
    if (input.metricasLinhas.length) {
      garantir(14);
      texto('Resultados', { size: 12, style: 'bold', color: ROXO });
      const nCols = input.metricasHeader.length;
      const colW = CW / nCols;
      const rowH = 7;
      const linha = (cells: string[], fill: [number, number, number] | null, bold: boolean) => {
        if (fill) { doc.setFillColor(...fill); doc.rect(M, y, CW, rowH, 'F'); }
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...(bold ? [255, 255, 255] : [30, 30, 30]));
        cells.forEach((c, i) => {
          const txt = doc.splitTextToSize(String(c ?? ''), colW - 3)[0] || '';
          doc.text(txt, M + i * colW + 1.5, y + 4.8);
        });
        y += rowH;
      };
      linha(input.metricasHeader, ROXO, true);
      input.metricasLinhas.forEach((r, idx) => {
        if (y + rowH > H - M) { doc.addPage(); y = M; linha(input.metricasHeader, ROXO, true); }
        linha(r, idx % 2 === 1 ? [245, 240, 255] : null, false);
      });
      y += 6;
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
    doc.save(slug ? `relatorio_${slug}.pdf` : 'relatorio-experimento-aprendizado-maquina.pdf');
  }

  /** PDF promocional do Hub (uma página, identidade H2IA) — incluído no zip do
   *  "Baixar Pipeline". Retorna Blob para o JSZip. */
  async gerarPromoHub(): Promise<Blob> {
    const { jsPDF } = await this.load();
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    // Fundo roxo integral
    doc.setFillColor(...ROXO);
    doc.rect(0, 0, W, H, 'F');

    // Símbolo centralizado
    const logo = await this.carregarLogoBranco();
    let y = 60;
    if (logo) {
      try {
        const p = doc.getImageProperties(logo);
        const lw = 58, lh = lw * (p.height / p.width);
        doc.addImage(logo, 'PNG', (W - lw) / 2, y, lw, lh);
        doc.link((W - lw) / 2, y, lw, lh, { url: HUB_URL });
        y += lh + 16;
      } catch { y += 16; }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    for (const ln of doc.splitTextToSize(HUB_NOME, W - 50)) {
      doc.text(ln, W / 2, y, { align: 'center' });
      y += 10;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.text('H2IA · Universidade Federal de Pelotas', W / 2, y + 2, { align: 'center' });
    y += 16;

    doc.setFontSize(11);
    const descricao =
      'O H2IA reúne pesquisa, ensino e extensão em Inteligência Artificial na UFPel. ' +
      'O H2IA Tutor — a plataforma que gerou este pipeline — nasceu aqui, para ensinar ' +
      'aprendizado de máquina na prática, da coleta de dados à avaliação de modelos.';
    for (const ln of doc.splitTextToSize(descricao, W - 60)) {
      doc.text(ln, W / 2, y, { align: 'center' });
      y += 6;
    }

    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.textWithLink('Conheça: ia.ufpel.edu.br', W / 2 - 32, y, { url: HUB_URL });

    return doc.output('blob');
  }
}
