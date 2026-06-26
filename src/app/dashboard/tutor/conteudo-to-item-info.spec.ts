import { conteudoParaItemInfo } from './conteudo-to-item-info';

describe('conteudoParaItemInfo', () => {
  it('mapeia os campos básicos/avançados e os links', () => {
    const info = conteudoParaItemInfo({
      titulo: 'KNN',
      descricao: 'desc avançada',
      resumo_basico: 'simples',
      exemplo_codigo: 'print(1)',
      formula: 'd = ...',
      link_sklearn: 'http://sk',
      link_yellowbrick: 'http://yb',
    });
    expect(info.titulo).toBe('KNN');
    expect(info.descricao).toBe('desc avançada');
    expect(info.resumo_basico).toBe('simples');
    expect(info.exemplo_codigo).toBe('print(1)');
    expect(info.link_sklearn).toBe('http://sk');
    expect(info.link_yellowbrick).toBe('http://yb');
  });

  it('usa o fallbackLabel quando não há título', () => {
    expect(conteudoParaItemInfo({}, 'Rótulo').titulo).toBe('Rótulo');
    expect(conteudoParaItemInfo(null, 'X').titulo).toBe('X');
  });

  it('converte hiperparametros_doc em mapa', () => {
    const info = conteudoParaItemInfo({
      hiperparametros_doc: [
        { nome: 'k', descricao: 'vizinhos', default: 5, efeito: 'e', quando_ajustar: 'q' },
      ],
    });
    expect(info.hiperparametros['k'].padrao).toBe(5);
    expect(info.hiperparametros['k'].implicacoes).toBe('e — q');
  });
});
