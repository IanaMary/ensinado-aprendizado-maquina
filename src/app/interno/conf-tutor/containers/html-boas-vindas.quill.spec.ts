import Quill from 'quill';
import { htmlParaBoasVindas, QUILL_MODULOS_BOAS_VINDAS } from './html-boas-vindas';

/**
 * O editor REAL, no caminho REAL.
 *
 * Os casos de `html-boas-vindas.spec.ts` alimentam o conversor com HTML que **eu** escrevi à mão.
 * Eles provam que a conversão funciona, mas só cobrem as armadilhas que eu já conhecia — e por isso
 * não pegaram o `&nbsp;`: o defeito foi encontrado na tela, com o texto de produção, depois de a
 * suíte passar verde. Um teste que descreve o que a dependência faz nunca descobre o que ela faz.
 *
 * Aqui o HTML de entrada do conversor é produzido pelo **Quill**, pelo mesmo caminho que o
 * `ngx-quill` usa em `format="html"`:
 *
 *   - escrita: `clipboard.convert({ html })` + `setContents` (o `valueSetter` do ngx-quill 27);
 *   - leitura: `getSemanticHTML()` (o `valueGetter`) — é ELE que troca espaço por `&nbsp;`.
 *
 * Se uma versão nova do Quill mudar a serialização, é este arquivo que quebra, e não a tela do
 * aluno depois do deploy.
 */

/** Trecho fiel do texto versionado de produção: quebrado em ~95 colunas, com h4, ol, ul e inline. */
const TEXTO_DE_PRODUCAO = `
<h4>Olá! Eu sou o seu tutor. 👋</h4>
<p>Nesta tela você monta um <b>pipeline de Aprendizado de Máquina</b> completo — dos dados
até a avaliação — e eu explico cada passo. Você treina modelos de verdade
(scikit-learn), compara resultados e pode levar embora o código Python.</p>
<ol>
<li><b>Coleta:</b> clique no item da coluna <i>Coleta</i> para trazer os dados — um arquivo
(CSV, Excel, JSON) ou um <i>dataset de exemplo</i>.</li>
<li><b>Métricas:</b> escolha as métricas e veja como o modelo se saiu.</li>
</ol>
<p><b>Onde ficam as outras coisas:</b></p>
<ul>
<li><b>Turmas e desafios</b> (menu do seu avatar): as atividades da sua turma, incluindo os
<b>desafios de montagem</b>.</li>
</ul>
`.trim();

/** Instancia o editor com a configuração da tela e devolve o que o ngx-quill leria dele. */
function pelaIdaEVoltaDoEditor(html: string, editar?: (q: Quill) => void): string {
  const hospedeiro = document.createElement('div');
  document.body.appendChild(hospedeiro);
  try {
    const editor = new Quill(hospedeiro, { theme: 'snow', modules: QUILL_MODULOS_BOAS_VINDAS });
    if (html) editor.setContents(editor.clipboard.convert({ html }));
    if (editar) editar(editor);
    return editor.getSemanticHTML();
  } finally {
    hospedeiro.remove();
  }
}

/** O texto que o aluno leria, sem marcação e com espaço normalizado. */
function textoVisivel(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || '').replace(/\s+/g, ' ').trim();
}

describe('boas-vindas: ida e volta pelo editor Quill de verdade', () => {
  it('o texto de produção volta do editor sem espaço inquebrável depois da conversão', () => {
    // O DEFEITO que escapou à suíte e só apareceu na tela. Verificado: sem `normalizarEspacos`,
    // este caso falha com `<h4>Olá!&nbsp;Eu&nbsp;sou&nbsp;o&nbsp;seu&nbsp;tutor.` — o
    // `getSemanticHTML()` do Quill 2 troca por `&nbsp;` quase todo espaço, e o texto versionado é
    // quebrado em ~95 colunas. Com espaço inquebrável o parágrafo não quebra linha e transborda.
    const doEditor = pelaIdaEVoltaDoEditor(TEXTO_DE_PRODUCAO);
    const paraOAluno = htmlParaBoasVindas(doEditor);

    expect(paraOAluno).not.toContain(' ');
    expect(paraOAluno).not.toContain('&nbsp;');
    // e o parágrafo continua sendo um parágrafo com as palavras separáveis
    expect(paraOAluno).toContain('monta um <b>pipeline de Aprendizado de Máquina</b> completo');
  });

  it('a lista com marcador criada pelos botões da barra continua com marcador', () => {
    // CANÁRIO, não regressão: escrevi o `corrigirListas` supondo que o editor devolveria
    // `<ol><li data-list="bullet">` (a forma do `root.innerHTML`). Este teste mostra que pelo getter
    // que o ngx-quill usa — `getSemanticHTML()` — o Quill 2.0.3 já devolve `<ul>`, então aquela
    // conversão é guarda e não correção. Se uma versão nova passar a emitir `data-list` por aqui, o
    // caso continua verde porque a guarda existe; se passar a emitir algo que a guarda NÃO cobre,
    // este é o teste que acende.
    const doEditor = pelaIdaEVoltaDoEditor('', (q) => {
      q.setText('primeiro\nsegundo\n');
      q.formatLine(0, 'segundo'.length + 'primeiro'.length + 2, 'list', 'bullet');
    });
    const paraOAluno = htmlParaBoasVindas(doEditor);

    expect(paraOAluno).toContain('<ul>');
    expect(paraOAluno).not.toContain('<ol>');
    expect(paraOAluno).not.toContain('data-list');
    expect(textoVisivel(paraOAluno)).toBe('primeiro segundo');
  });

  it('a lista numerada criada pelos botões continua numerada', () => {
    const doEditor = pelaIdaEVoltaDoEditor('', (q) => {
      q.setText('um\ndois\n');
      q.formatLine(0, 8, 'list', 'ordered');
    });
    const paraOAluno = htmlParaBoasVindas(doEditor);
    expect(paraOAluno).toContain('<ol>');
    expect(paraOAluno).not.toContain('<ul>');
  });

  it('nada do que o aluno leria é perdido na ida e volta', () => {
    // Rede contra a classe inteira: qualquer serialização nova do Quill que o conversor não
    // reconheça tende a cair no `desembrulhar`, e é aqui que a perda apareceria.
    const paraOAluno = htmlParaBoasVindas(pelaIdaEVoltaDoEditor(TEXTO_DE_PRODUCAO));
    expect(textoVisivel(paraOAluno)).toBe(textoVisivel(TEXTO_DE_PRODUCAO));
  });

  it('só sobrevivem as tags que o painel do tutor renderiza', () => {
    const paraOAluno = htmlParaBoasVindas(pelaIdaEVoltaDoEditor(TEXTO_DE_PRODUCAO));
    const div = document.createElement('div');
    div.innerHTML = paraOAluno;
    const permitidas = ['H4', 'P', 'B', 'I', 'UL', 'OL', 'LI', 'BR', 'A'];
    const usadas = Array.from(new Set(Array.from(div.querySelectorAll('*')).map((e) => e.tagName)));
    expect(usadas.filter((t) => !permitidas.includes(t))).toEqual([]);
    expect(usadas).toContain('UL');   // o texto tem as duas listas
    expect(usadas).toContain('OL');
  });

  it('reabrir a aba não muda o texto (senão um Salvar sem intenção o marca como "do admin")', () => {
    // Abrir a aba joga o texto no editor e o editor reserializa. Se a segunda volta diferisse da
    // primeira, o botão Salvar habilitaria sozinho e o admin marcaria o texto como editado — o que
    // o faz parar de receber as atualizações dos deploys (mecanismo de 29/07b).
    const primeira = htmlParaBoasVindas(pelaIdaEVoltaDoEditor(TEXTO_DE_PRODUCAO));
    const segunda = htmlParaBoasVindas(pelaIdaEVoltaDoEditor(primeira));
    expect(segunda).toBe(primeira);
  });
});
