import { Injectable } from '@angular/core';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';

/**
 * Visão do "Léo no Mundo Real": transfer learning 100% no navegador.
 * MobileNet extrai um embedding de cada imagem e um KNN classifica a partir
 * dos poucos exemplos que a criança fornece. Sem backend.
 *
 * Memória: os embeddings são guardados como Float32Array (não como tf.Tensor)
 * no componente; aqui os tensores são sempre de vida curta (criados e descartados
 * na mesma chamada). O dataset interno do KNN é liberado em `limpar()`.
 */
@Injectable()
export class LeoVisaoService {
  private modelo: mobilenet.MobileNet | null = null;
  private carregando: Promise<void> | null = null;
  private knn = knnClassifier.create();

  /** Carrega o MobileNet (uma vez). Reentrante: chamadas concorrentes esperam a mesma promise. */
  carregar(): Promise<void> {
    if (this.modelo) return Promise.resolve();
    if (!this.carregando) {
      this.carregando = mobilenet
        .load({ version: 2, alpha: 0.5 })
        .then((m) => { this.modelo = m; })
        .catch((e) => { this.carregando = null; throw e; });
    }
    return this.carregando;
  }

  get pronto(): boolean { return !!this.modelo; }

  /** Embedding (vetor de features) de uma imagem/canvas. Devolve Float32Array; não retém tensores. */
  async embed(el: HTMLImageElement | HTMLCanvasElement): Promise<Float32Array> {
    await this.carregar();
    const emb = this.modelo!.infer(el, true) as tf.Tensor;
    const data = (await emb.data()) as Float32Array;
    emb.dispose();
    return data;
  }

  addExemplo(feat: Float32Array, classe: number): void {
    const t = tf.tensor(feat, [1, feat.length]);
    this.knn.addExample(t, classe);
    t.dispose();
  }

  /** Total de exemplos no KNN (soma de todas as classes). */
  get totalExemplos(): number {
    const counts = this.knn.getClassExampleCount();
    return Object.values(counts).reduce((a, b) => a + b, 0);
  }

  /** Classifica um embedding. Devolve { classe, confidences } ou null se o KNN está vazio. */
  async classificar(feat: Float32Array, k = 5): Promise<{ classe: number; confidences: { [label: string]: number } } | null> {
    const total = this.totalExemplos;
    if (total === 0) return null;
    const t = tf.tensor(feat, [1, feat.length]);
    const res = await this.knn.predictClass(t, Math.min(k, total));
    t.dispose();
    return { classe: Number(res.label), confidences: res.confidences };
  }

  /** Esvazia o que o Léo aprendeu (libera o dataset do KNN). */
  limpar(): void {
    this.knn.clearAllClasses();
  }
}
