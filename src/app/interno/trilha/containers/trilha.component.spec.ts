import { TrilhaComponent } from './trilha.component';

/** `toNotebook` é uma função pura de (título, script) — não toca em `this`, então dá para
 *  exercitá-la pelo protótipo, sem montar o TestBed do componente inteiro (que arrasta
 *  DashboardService, MatDialog, ActivatedRoute e o resto). */
const toNotebook = (titulo: string, script: string): any =>
  JSON.parse((TrilhaComponent.prototype as any).toNotebook.call({}, titulo, script));

describe('TrilhaComponent.toNotebook', () => {
  const script = 'import pandas as pd\nprint("oi")\n';

  it('gera JSON válido de notebook, com uma célula de markdown e uma de código', () => {
    const nb = toNotebook('k-NN', script);

    expect(nb.nbformat).toBe(4);
    expect(nb.cells.map((c: any) => c.cell_type)).toEqual(['markdown', 'code']);
    expect(nb.metadata.kernelspec.name).toBe('python3');
  });

  // O nbformat 4.5 EXIGE `id` por célula. Sem ele o `nbformat.validate` acusa
  // "'id' is a required property"; hoje o Jupyter conserta na leitura e só avisa
  // (MissingIDFieldWarning), mas o aviso diz que vai virar erro — e aí o notebook não abriria.
  it('toda célula tem `id`, como o nbformat_minor declarado exige', () => {
    const nb = toNotebook('k-NN', script);

    expect(nb.nbformat_minor).toBe(5);
    for (const celula of nb.cells) {
      expect(typeof celula.id).toBe('string');
      expect(celula.id.length).toBeGreaterThan(0);
      // o schema restringe o id a [a-zA-Z0-9-_] com no máximo 64 caracteres
      expect(celula.id).toMatch(/^[a-zA-Z0-9-_]{1,64}$/);
    }
    expect(new Set(nb.cells.map((c: any) => c.id)).size).toBe(nb.cells.length);
  });

  it('preserva o script linha a linha, com \\n no fim de cada linha menos a última', () => {
    const nb = toNotebook('k-NN', script);
    const codigo = nb.cells[1].source;

    expect(codigo.join('')).toBe(script);
    expect(codigo[0]).toBe('import pandas as pd\n');
  });

  it('o título do ramo vira o cabeçalho markdown', () => {
    const nb = toNotebook('Árvore de Decisão', script);

    expect(nb.cells[0].source[0]).toBe('# Árvore de Decisão\n');
  });
});
