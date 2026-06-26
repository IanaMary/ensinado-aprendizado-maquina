import { TutorItemInfo } from './tutor.component';

/**
 * Fonte ÚNICA de mapeamento do bloco `conteudo` (vindo do DB/catálogo) para a
 * estrutura `TutorItemInfo` consumida pelo <app-tutor>.
 *
 * Usado pelo dashboard (execucoes) e pelo modal de avaliação de métricas
 * (gráficos), garantindo que campos como resumo_basico/exemplo_codigo/
 * link_sklearn/link_yellowbrick sejam mapeados de forma consistente.
 */
export function conteudoParaItemInfo(conteudo: any, fallbackLabel = ''): TutorItemInfo {
  conteudo = conteudo || {};

  // hiperparametros_doc (lista) -> mapa esperado pelo card.
  let hiperparametros: any = undefined;
  if (Array.isArray(conteudo.hiperparametros_doc) && conteudo.hiperparametros_doc.length) {
    hiperparametros = {};
    conteudo.hiperparametros_doc.forEach((h: any, i: number) => {
      hiperparametros[h?.nome || i] = {
        nome: h?.nome,
        descricao: h?.descricao,
        padrao: h?.default ?? '',
        tipo: h?.tipo || '',
        faixa: Array.isArray(h?.opcoes) ? h.opcoes.join(' | ') : (h?.faixa || ''),
        implicacoes: [h?.efeito, h?.quando_ajustar].filter(Boolean).join(' — '),
        sklearn: h?.nome,
      };
    });
  }

  return {
    titulo: conteudo.titulo || fallbackLabel,
    descricao: conteudo.descricao || '',
    resumo_basico: conteudo.resumo_basico || '',
    dicas: conteudo.dicas,
    conceitos: conteudo.conceitos,
    quandoUsar: conteudo.quandoUsar,
    naoUsarQuando: conteudo.naoUsarQuando,
    vantagens: conteudo.vantagens,
    desvantagens: conteudo.desvantagens,
    formula: conteudo.formula,
    intuicao: conteudo.intuicao,
    exemplo: conteudo.exemplo,
    exemplo_codigo: conteudo.exemplo_codigo,
    link_sklearn: conteudo.link_sklearn,
    link_yellowbrick: conteudo.link_yellowbrick,
    midia: conteudo.midia,
    referencias: conteudo.referencias,
    hiperparametros,
  };
}
