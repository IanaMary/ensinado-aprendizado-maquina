/**
 * O aluno desistiu do arrasto?
 *
 * O mecanismo não é óbvio. As paletas do pipeline **não** declaram `cdkDropListConnectedTo`, então
 * para o CDK o item nunca sai da paleta: o `dropped` é sempre emitido pela própria paleta, e o
 * handler o tratava como "soltou em algum lugar, então adiciona". Consequência para o aluno: pegar
 * um item, pensar melhor e largar **adicionava o item de todo jeito** — não havia como cancelar um
 * arrasto, no gesto que é justamente o jeito de montar o pipeline.
 *
 * `isPointerOverContainer` sai de `_isOverContainer(x, y)` no CDK (`drag-drop.mjs`), que compara o
 * ponto de soltura com o rect do container que recebeu o drop — aqui, a própria paleta. Logo:
 * soltou de volta sobre a paleta = `true` = desistiu; soltou fora dela, na raia = `false`.
 *
 * Deliberadamente **não** se decide pela geometria das raias: a paleta de pré-processamento também
 * é usada dentro do `modal-execucao`, onde raia não existe, e medir `.column-content` global
 * cancelaria o arrasto legítimo lá. Resíduo conhecido e aceito: soltar sobre uma área que não é
 * paleta nem raia (o painel do tutor, por exemplo) ainda adiciona — é o comportamento de hoje,
 * preservado para não mexer no caminho que funciona.
 */
export function desistiuDoArrasto(event: { isPointerOverContainer?: boolean } | null | undefined): boolean {
  return event?.isPointerOverContainer === true;
}
