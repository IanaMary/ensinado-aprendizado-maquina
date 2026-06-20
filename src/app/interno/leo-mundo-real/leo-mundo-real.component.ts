import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { LeoVisaoService } from './leo-visao.service';

type Fase = 'setup' | 'training' | 'ready' | 'testing';
type Mood = 'idle' | 'happy' | 'thinking' | 'celebrate' | 'oops';

interface Foto { thumb: string; feat: Float32Array; }
interface Categoria { nome: string; cor: string; fotos: Foto[]; }
interface Barra { nome: string; cor: string; pct: number; }
interface Teste { thumb: string; guessNome: string; conf: number; bars: Barra[]; }

/**
 * "Léo no Mundo Real" — a criança ensina o Léo a reconhecer as próprias coisas
 * com fotos. Transfer learning real no navegador (MobileNet + KNN, ver
 * LeoVisaoService). Sem backend. Câmera no celular via <input capture>.
 */
@Component({
  selector: 'app-leo-mundo-real',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  providers: [LeoVisaoService],
  templateUrl: './leo-mundo-real.component.html',
  styleUrls: ['./leo-mundo-real.component.scss'],
})
export class LeoMundoRealComponent implements OnInit, OnDestroy {
  robotName = 'Léo';
  acc = '#7C3AED';

  readonly MAX_CATS = 4;
  readonly MAX_FOTOS = 8;
  readonly PALETTE = ['#EC4899', '#38BDF8', '#22C55E', '#F59E0B', '#A855F7', '#EF4444'];
  // exemplos de cores (nome, cor da UI, [r,g,b]) — início rápido sem fotos
  readonly DEMO: [string, string, number[]][] = [
    ['Vermelho', '#EF4444', [225, 55, 55]],
    ['Azul', '#3B82F6', [55, 95, 225]],
    ['Verde', '#22C55E', [55, 190, 95]],
  ];

  fase: Fase = 'setup';
  carregandoModelo = false;
  erroModelo = '';
  busy = false;
  erro = '';

  cats: Categoria[] = [
    { nome: '', cor: this.PALETTE[0], fotos: [] },
    { nome: '', cor: this.PALETTE[1], fotos: [] },
  ];
  test: Teste | null = null;
  veredicto: 'right' | 'wrong' | null = null;
  score = { right: 0, total: 0 };

  constructor(private leoVisao: LeoVisaoService, private router: Router) {}

  ngOnInit(): void { this.carregarModelo(); }
  ngOnDestroy(): void { this.leoVisao.limpar(); }

  voltarInicio(): void { this.router.navigate(['/inicio']); }

  private carregarModelo(): void {
    this.carregandoModelo = true; this.erroModelo = '';
    this.leoVisao.carregar()
      .then(() => (this.carregandoModelo = false))
      .catch(() => { this.carregandoModelo = false; this.erroModelo = 'Não consegui acordar o Léo. Confira a internet e recarregue. 🙈'; });
  }

  // ---------- setup: categorias ----------
  get podeAddCategoria(): boolean { return this.cats.length < this.MAX_CATS; }
  addCategoria(): void {
    if (!this.podeAddCategoria) return;
    this.cats.push({ nome: '', cor: this.PALETTE[this.cats.length % this.PALETTE.length], fotos: [] });
  }
  removerCategoria(i: number): void { if (this.cats.length > 1) this.cats.splice(i, 1); }
  nomeCat(i: number): string { return this.cats[i]?.nome?.trim() || ('Categoria ' + (i + 1)); }

  async onArquivos(i: number, ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    if (!files.length || this.busy) return;
    if (!this.leoVisao.pronto) { this.erro = 'O Léo ainda está acordando, tenta de novo em 1 segundinho. ⏳'; return; }
    this.busy = true; this.erro = '';
    try {
      for (const f of files) {
        if (this.cats[i].fotos.length >= this.MAX_FOTOS) break;
        if (!f.type.startsWith('image/')) continue;
        const foto = await this.lerArquivo(f);
        this.cats[i].fotos.push(foto);
      }
    } catch {
      this.erro = 'Não consegui ler uma das fotos. Tenta outra? 🙈';
    } finally { this.busy = false; }
  }
  removerFoto(i: number, j: number): void { this.cats[i].fotos.splice(j, 1); }

  get podeTreinar(): boolean {
    const validas = this.cats.filter(c => c.fotos.length >= 2).length;
    return validas >= 2 && !this.busy;
  }
  get statusTreino(): string {
    if (this.busy) return 'Guardando as fotos… ⏳';
    const validas = this.cats.filter(c => c.fotos.length >= 2).length;
    const fotos = this.cats.reduce((a, c) => a + c.fotos.length, 0);
    return this.podeTreinar
      ? `Tudo pronto: ${validas} categorias, ${fotos} fotos! 🎉`
      : 'Você precisa de 2 categorias com 2+ fotos cada 📸';
  }

  treinar(): void {
    if (!this.podeTreinar) return;
    this.leoVisao.limpar();
    this.cats.forEach((c, i) => c.fotos.forEach(f => this.leoVisao.addExemplo(f.feat, i)));
    this.fase = 'training'; this.test = null; this.veredicto = null; this.erro = '';
    setTimeout(() => { this.fase = 'ready'; }, 1500);
  }

  async carregarDemo(): Promise<void> {
    if (this.busy || !this.leoVisao.pronto) { this.erro = 'O Léo ainda está acordando, só um segundinho. ⏳'; return; }
    this.busy = true; this.erro = '';
    try {
      const cats: Categoria[] = [];
      for (const [nome, cor, rgb] of this.DEMO) {
        const fotos: Foto[] = [];
        for (let k = 0; k < 5; k++) fotos.push(await this.tileCor(rgb));
        cats.push({ nome, cor, fotos });
      }
      this.cats = cats;
    } catch { this.erro = 'Não consegui montar os exemplos. 🙈'; }
    finally { this.busy = false; }
  }

  // ---------- ready / testing ----------
  ensinarMais(): void { this.fase = 'setup'; this.test = null; this.veredicto = null; }

  async onTeste(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const f = (input.files || [])[0]; input.value = '';
    if (!f || this.busy || !f.type.startsWith('image/')) return;
    this.busy = true; this.erro = '';
    try {
      const foto = await this.lerArquivo(f);
      await this.prever(foto);
    } catch { this.erro = 'Não consegui ver essa foto. Tenta outra? 🙈'; }
    finally { this.busy = false; }
  }

  async surpresa(): Promise<void> {
    if (this.busy || !this.leoVisao.pronto) return;
    this.busy = true; this.erro = '';
    try {
      const rgb = [Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)];
      const foto = await this.tileCor(rgb);
      await this.prever(foto);
    } catch { this.erro = 'Deu ruim na surpresa. 🙈'; }
    finally { this.busy = false; }
  }

  private async prever(foto: Foto): Promise<void> {
    const res = await this.leoVisao.classificar(foto.feat, 5);
    if (!res) { this.erro = 'O Léo ainda não aprendeu nada. 🙈'; return; }
    const bars: Barra[] = this.cats
      .map((c, i) => ({ nome: this.nomeCat(i), cor: c.cor, pct: Math.round((res.confidences[i] ?? 0) * 100) }))
      .sort((a, b) => b.pct - a.pct);
    this.test = { thumb: foto.thumb, guessNome: bars[0].nome, conf: bars[0].pct, bars };
    this.veredicto = null;
    this.fase = 'testing';
  }

  responder(acertou: boolean): void {
    if (this.veredicto) return;
    this.veredicto = acertou ? 'right' : 'wrong';
    this.score.total++;
    if (acertou) this.score.right++;
  }
  proxima(): void { this.test = null; this.veredicto = null; this.fase = 'ready'; }

  recomecar(): void {
    this.leoVisao.limpar();
    this.cats = [
      { nome: '', cor: this.PALETTE[0], fotos: [] },
      { nome: '', cor: this.PALETTE[1], fotos: [] },
    ];
    this.fase = 'setup'; this.test = null; this.veredicto = null;
    this.score = { right: 0, total: 0 }; this.erro = '';
  }

  // ---------- imagem → thumb + embedding ----------
  private lerArquivo(file: File): Promise<Foto> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject();
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject();
        img.onload = async () => {
          try {
            const thumb = this.miniatura(img);
            const feat = await this.leoVisao.embed(img);
            resolve({ thumb, feat });
          } catch (e) { reject(e); }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  private miniatura(src: HTMLImageElement | HTMLCanvasElement, T = 84): string {
    const w = (src as HTMLImageElement).naturalWidth || src.width;
    const h = (src as HTMLImageElement).naturalHeight || src.height;
    const m = Math.min(w, h), ox = (w - m) / 2, oy = (h - m) / 2;
    const cv = document.createElement('canvas'); cv.width = T; cv.height = T;
    const ctx = cv.getContext('2d')!;
    ctx.drawImage(src, ox, oy, m, m, 0, 0, T, T);
    return cv.toDataURL('image/jpeg', 0.6);
  }

  private async tileCor(rgb: number[]): Promise<Foto> {
    const T = 96;
    const cv = document.createElement('canvas'); cv.width = T; cv.height = T;
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`; ctx.fillRect(0, 0, T, T);
    for (let i = 0; i < 120; i++) {
      const j = (Math.random() - 0.5) * 70;
      ctx.fillStyle = `rgba(${rgb[0] + j | 0},${rgb[1] + j | 0},${rgb[2] + j | 0},0.5)`;
      ctx.fillRect(Math.random() * T, Math.random() * T, 10, 10);
    }
    const feat = await this.leoVisao.embed(cv);
    return { thumb: cv.toDataURL('image/jpeg', 0.7), feat };
  }

  // ---------- mascote / falas ----------
  get mood(): Mood {
    if (this.carregandoModelo || this.fase === 'training' || this.busy) return 'thinking';
    if (this.fase === 'testing') return this.veredicto === 'wrong' ? 'oops' : this.veredicto === 'right' ? 'celebrate' : 'thinking';
    if (this.fase === 'ready') return 'celebrate';
    if (this.cats.some(c => c.fotos.length)) return 'happy';
    return 'idle';
  }
  get chestGlyph(): string { return this.mood === 'celebrate' ? '⭐' : this.mood === 'thinking' ? '⚙️' : this.mood === 'oops' ? '💧' : '💜'; }
  starPts(cx: number, cy: number, outer = 9, inner = 4): string {
    let p = '';
    for (let i = 0; i < 10; i++) { const ang = Math.PI / 5 * i - Math.PI / 2; const r = i % 2 === 0 ? outer : inner; p += (cx + r * Math.cos(ang)).toFixed(1) + ',' + (cy + r * Math.sin(ang)).toFixed(1) + ' '; }
    return p.trim();
  }

  get sayText(): string {
    const n = this.robotName;
    if (this.erroModelo) return this.erroModelo;
    if (this.carregandoModelo) return `O ${n} está acordando… 🤖`;
    if (this.busy) return 'Olhando as fotinhas… 👀';
    if (this.erro) return this.erro;
    if (this.fase === 'training') return 'Tô estudando cada foto com carinho… 🧠';
    if (this.fase === 'ready') return `Pronto! Agora me mostra uma coisa e eu adivinho! 🎉`;
    if (this.fase === 'testing') {
      if (!this.veredicto) return 'Hmm… deixa eu ver! 🔍';
      return this.veredicto === 'right' ? 'Boa! Eu acertei! 🎉' : 'Ah, eu confundi! Me ensina mais? 😅';
    }
    return `Oi! Me ensine a reconhecer as suas coisas! 📸`;
  }
  get hintText(): string {
    if (this.fase === 'setup' && !this.erro && !this.carregandoModelo) return 'Crie categorias e tire fotos de cada uma — quanto mais exemplos, melhor eu aprendo!';
    return '';
  }

  get nStars(): number { return 5; }
  get stars(): string[] { return [0, 1, 2, 3, 4].map(() => '⭐'); }
  confTexto(pct: number): string {
    return pct >= 70 ? `tenho bastante certeza (${pct}%)` : pct >= 45 ? `mais ou menos certo (${pct}%)` : `tô em dúvida (${pct}%)`;
  }
  get totalFotos(): number { return this.cats.reduce((a, c) => a + c.fotos.length, 0); }
  get catsComFotos(): number { return this.cats.filter(c => c.fotos.length > 0).length; }
}
