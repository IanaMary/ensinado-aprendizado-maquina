/**
 * Descrição didática de cada visualização Yellowbrick, por título. Fonte única
 * usada pelo relatório PDF da Trilha (e disponível para o modal Clássico).
 */
export function descricaoVisualizacao(titulo: string): string {
  const chave = (titulo || '').toLowerCase();
  if (chave.includes('matriz de confusão'))
    return 'Mostra quantas respostas o modelo acertou e onde confundiu as classes. A diagonal principal indica acertos; valores fora da diagonal são erros (uma classe real prevista como outra).';
  if (chave.includes('relatório de classificação'))
    return 'Resume precision, recall, F1-score e suporte por classe. Use para ver se o modelo trata todas as classes bem ou vai melhor em algumas.';
  if (chave.includes('erros de predição'))
    return 'Mostra, para cada classe real, como as previsões se distribuíram. Útil para descobrir quais classes são mais confundidas pelo modelo.';
  if (chave.includes('balanceamento'))
    return 'Mostra a quantidade de exemplos em cada classe. Quando uma classe tem muito mais exemplos, o modelo pode favorecê-la.';
  if (chave.includes('silhouette'))
    return 'Score de silhueta por cluster. Barras longas e uniformes indicam clusters bem definidos; valores próximos de 1 são bons, negativos indicam pontos no cluster errado.';
  if (chave.includes('distância entre clusters') || chave.includes('intercluster'))
    return 'Visualiza a distância relativa e o tamanho de cada cluster. Mais separação = clusters mais distintos; sobreposição indica clusters próximos ou misturados.';
  if (chave.includes('cotovelo') || chave.includes('elbow'))
    return 'Mostra como a inércia varia com o número de clusters (K). O "cotovelo" indica o K ideal; sem cotovelo claro, os dados podem não ter estrutura de clusters.';
  if (chave.includes('prediction error') || chave.includes('previsto'))
    return 'Valores reais no eixo X e previstos no eixo Y. A linha tracejada é a previsão perfeita; quanto mais os pontos se alinham a ela, melhor o modelo.';
  if (chave.includes('residuals') || chave.includes('resíduos'))
    return 'Resíduos (real menos previsto) em função do previsto. O ideal é espalhamento aleatório em torno do zero; padrões indicam que o modelo não capturou algo dos dados.';
  return 'Visualização de avaliação do Yellowbrick. Observe padrões, diferenças entre classes e sinais de erro para discutir o comportamento do modelo.';
}
