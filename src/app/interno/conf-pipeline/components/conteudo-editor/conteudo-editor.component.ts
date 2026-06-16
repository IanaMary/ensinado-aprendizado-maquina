import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface Conceito { nome: string; desc: string; }
interface HiperDoc { nome: string; descricao?: string; default?: any; efeito?: string; quando_ajustar?: string; }
interface Referencia { titulo: string; autor?: string; url?: string; tipo?: string; citacao?: string; }
interface Midia { tipo?: string; url?: string; legenda?: string; fonte?: string; }

interface ConteudoDraft {
  titulo: string;
  descricao: string;
  intuicao: string;
  exemplo: string;
  formula: string;
  dicas: string[];
  quandoUsar: string[];
  naoUsarQuando: string[];
  vantagens: string[];
  desvantagens: string[];
  conceitos: Conceito[];
  hiperparametros_doc: HiperDoc[];
  referencias: Referencia[];
  midia: Midia[];
}

/**
 * Editor do bloco `conteudo` educacional (teoria, listas, hiperparâmetros
 * conceituais, referências/fontes e mídia). Reutilizado nas abas de modelos,
 * métricas e pré-processamento do conf-pipeline.
 */
@Component({
  selector: 'app-conteudo-editor',
  templateUrl: './conteudo-editor.component.html',
  styleUrls: ['./conteudo-editor.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
})
export class ConteudoEditorComponent implements OnChanges {
  @Input() conteudo: any = null;
  @Input() salvando = false;
  @Output() salvar = new EventEmitter<any>();
  @Output() cancelar = new EventEmitter<void>();

  draft!: ConteudoDraft;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['conteudo']) {
      this.draft = this.fromConteudo(this.conteudo);
    }
  }

  private fromConteudo(c: any): ConteudoDraft {
    c = c || {};
    return {
      titulo: c.titulo || '',
      descricao: c.descricao || '',
      intuicao: c.intuicao || '',
      exemplo: c.exemplo || '',
      formula: c.formula || '',
      dicas: [...(c.dicas || [])],
      quandoUsar: [...(c.quandoUsar || [])],
      naoUsarQuando: [...(c.naoUsarQuando || [])],
      vantagens: [...(c.vantagens || [])],
      desvantagens: [...(c.desvantagens || [])],
      conceitos: (c.conceitos || []).map((x: any) => ({ nome: x.nome || '', desc: x.desc || '' })),
      hiperparametros_doc: (c.hiperparametros_doc || []).map((x: any) => ({
        nome: x.nome || '', descricao: x.descricao || '', default: x.default,
        efeito: x.efeito || '', quando_ajustar: x.quando_ajustar || '',
      })),
      referencias: (c.referencias || []).map((x: any) => ({
        titulo: x.titulo || '', autor: x.autor || '', url: x.url || '',
        tipo: x.tipo || 'doc', citacao: x.citacao || '',
      })),
      midia: (c.midia || []).map((x: any) => ({
        tipo: x.tipo || 'imagem', url: x.url || '', legenda: x.legenda || '', fonte: x.fonte || '',
      })),
    };
  }

  // ---- helpers de lista ----
  addStr(lista: string[]): void { lista.push(''); }
  trackByIndex(i: number): number { return i; }
  removeAt(lista: any[], i: number): void { lista.splice(i, 1); }
  addConceito(): void { this.draft.conceitos.push({ nome: '', desc: '' }); }
  addHiper(): void { this.draft.hiperparametros_doc.push({ nome: '', descricao: '', default: '', efeito: '', quando_ajustar: '' }); }
  addReferencia(): void { this.draft.referencias.push({ titulo: '', autor: '', url: '', tipo: 'doc', citacao: '' }); }
  addMidia(): void { this.draft.midia.push({ tipo: 'imagem', url: '', legenda: '', fonte: '' }); }

  emitirSalvar(): void {
    const d = this.draft;
    const limparStr = (l: string[]) => l.map(s => (s || '').trim()).filter(Boolean);
    const conteudo: any = {};
    if (d.titulo.trim()) conteudo.titulo = d.titulo.trim();
    if (d.descricao.trim()) conteudo.descricao = d.descricao.trim();
    if (d.intuicao.trim()) conteudo.intuicao = d.intuicao.trim();
    if (d.exemplo.trim()) conteudo.exemplo = d.exemplo.trim();
    if (d.formula.trim()) conteudo.formula = d.formula.trim();
    const dicas = limparStr(d.dicas); if (dicas.length) conteudo.dicas = dicas;
    const qu = limparStr(d.quandoUsar); if (qu.length) conteudo.quandoUsar = qu;
    const nuq = limparStr(d.naoUsarQuando); if (nuq.length) conteudo.naoUsarQuando = nuq;
    const vant = limparStr(d.vantagens); if (vant.length) conteudo.vantagens = vant;
    const desv = limparStr(d.desvantagens); if (desv.length) conteudo.desvantagens = desv;
    const conceitos = d.conceitos.filter(c => (c.nome || '').trim());
    if (conceitos.length) conteudo.conceitos = conceitos;
    const hipers = d.hiperparametros_doc.filter(h => (h.nome || '').trim());
    if (hipers.length) conteudo.hiperparametros_doc = hipers;
    const refs = d.referencias.filter(r => (r.titulo || '').trim());
    if (refs.length) conteudo.referencias = refs;
    const midia = d.midia.filter(m => (m.url || '').trim());
    if (midia.length) conteudo.midia = midia;
    this.salvar.emit(conteudo);
  }
}
