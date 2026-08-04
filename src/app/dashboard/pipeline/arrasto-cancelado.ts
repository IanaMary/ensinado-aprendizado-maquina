/** Área de uma raia do pipeline, medida na tela. */
type Area = { left: number; right: number; top: number; bottom: number };

/** Raias visíveis da Área de Trabalho (`execucoes.component.html`). */
function raiasNaTela(): Area[] {
  if (typeof document === 'undefined') { return []; }
  return Array.from(document.querySelectorAll('.column-content'))
    .map(el => el.getBoundingClientRect())
    .filter(r => r.width > 0 && r.height > 0);
}

/**
 * O aluno desistiu do arrasto?
 *
 * O mecanismo não é óbvio. As paletas do pipeline **não** declaram `cdkDropListConnectedTo`, então
 * para o CDK o item nunca sai da paleta: o `dropped` é sempre emitido pela própria paleta, e o
 * handler o tratava como "soltou em algum lugar, então adiciona". Consequência para o aluno: pegar
 * um item, pensar melhor e largar **adicionava o item de todo jeito** — não havia como cancelar um
 * arrasto, no gesto que é justamente o jeito de montar o pipeline.
 *
 * A decisão usa dois sinais, nesta ordem:
 *
 * 1. `isPointerOverContainer`, que sai de `_isOverContainer(x, y)` no CDK (`drag-drop.mjs:1169`) e
 *    compara o ponto de soltura com o rect do container que recebeu o drop — aqui, a própria paleta.
 *    Verdadeiro = soltou de volta sobre a paleta = desistiu.
 * 2. `dropPoint` contra a área das raias. Soltar sobre qualquer outra coisa que não seja uma raia
 *    (o painel do tutor, o cabeçalho, o aviso de atividades) também é desistir. Só o `isPointer…`
 *    não cobria isso, e era o resíduo conhecido da primeira versão desta guarda.
 *
 * **Falha para o lado seguro:** sem `dropPoint`, ou sem nenhuma raia medível na tela, devolve
 * `false` e o item é adicionado como antes. O pior resultado aceitável é voltar ao comportamento
 * antigo; inaceitável seria parar de adicionar e deixar o aluno sem conseguir montar o pipeline.
 *
 * A geometria só é confiável porque as três paletas que ligam `(cdkDropListDropped)` — coleta,
 * modelos e métricas — vivem **apenas** na Área de Trabalho, junto das raias. A de
 * pré-processamento, que também roda dentro do `modal-execucao` (onde raia não existe), não liga o
 * handler: lá o caminho é o clique, que abre o diálogo de configuração.
 */
export function desistiuDoArrasto(
  event: { isPointerOverContainer?: boolean; dropPoint?: { x: number; y: number } } | null | undefined,
  raias: Area[] = raiasNaTela(),
): boolean {
  if (!event) { return false; }
  if (event.isPointerOverContainer === true) { return true; }

  const ponto = event.dropPoint;
  if (!ponto || !raias.length) { return false; }

  return !raias.some(r => ponto.x >= r.left && ponto.x <= r.right
                       && ponto.y >= r.top && ponto.y <= r.bottom);
}
