import { htmlParaBoasVindas, mesmoConteudo } from './html-boas-vindas';

/**
 * O editor visual só vale se o que o admin formata é o que o aluno vê. O painel do aluno renderiza
 * com `[innerHTML]` sob o sanitizer do Angular e sem o CSS do Quill — então tudo que o editor emite
 * fora do subconjunto suportado precisa ser convertido aqui, não descoberto depois na tela.
 */
describe('htmlParaBoasVindas', () => {
  it('converte lista com marcador do Quill 2 (que sai como <ol data-list>) em <ul>', () => {
    // É a armadilha principal: sem isto, a lista com bolinha aparece NUMERADA para o aluno.
    const quill = '<ol><li data-list="bullet">Turmas</li><li data-list="bullet">Projetos</li></ol>';
    const saida = htmlParaBoasVindas(quill);
    expect(saida).toContain('<ul>');
    expect(saida).not.toContain('<ol>');
    expect(saida).not.toContain('data-list');
    expect(saida).toContain('Turmas');
  });

  it('mantém lista numerada como <ol>', () => {
    const saida = htmlParaBoasVindas('<ol><li data-list="ordered">Coleta</li></ol>');
    expect(saida).toContain('<ol>');
    expect(saida).not.toContain('data-list');
  });

  it('divide uma lista que mistura marcador e numeração', () => {
    const misturada = '<ol>'
      + '<li data-list="ordered">um</li>'
      + '<li data-list="bullet">dois</li>'
      + '<li data-list="bullet">três</li>'
      + '</ol>';
    const saida = htmlParaBoasVindas(misturada);
    expect(saida.indexOf('<ol>')).toBeLessThan(saida.indexOf('<ul>'));
    expect((saida.match(/<li>/g) || []).length).toBe(3);
  });

  it('normaliza <strong>/<em> para <b>/<i> (o texto versionado usa a forma curta)', () => {
    const saida = htmlParaBoasVindas('<p><strong>Coleta:</strong> traga um <em>arquivo</em></p>');
    expect(saida).toContain('<b>Coleta:</b>');
    expect(saida).toContain('<i>arquivo</i>');
  });

  it('rebaixa qualquer título para <h4> (o painel tem um nível só)', () => {
    expect(htmlParaBoasVindas('<h1>Olá</h1>')).toContain('<h4>Olá</h4>');
    expect(htmlParaBoasVindas('<h2>Olá</h2>')).toContain('<h4>Olá</h4>');
  });

  it('descarta style e class, que o sanitizer do Angular removeria de todo jeito', () => {
    const saida = htmlParaBoasVindas('<p class="ql-align-center" style="color:red">oi</p>');
    expect(saida).toBe('<p>oi</p>');
  });

  it('desembrulha tags não suportadas preservando o texto', () => {
    const saida = htmlParaBoasVindas('<p><span class="x">manter <b>isto</b></span></p>');
    expect(saida).toBe('<p>manter <b>isto</b></p>');
  });

  it('remove o parágrafo vazio que o Quill deixa no fim', () => {
    expect(htmlParaBoasVindas('<p>texto</p><p><br></p>')).toBe('<p>texto</p>');
  });

  it('preserva link com href (e o rel/target)', () => {
    const saida = htmlParaBoasVindas('<p><a href="/manual" target="_blank" rel="noopener">Manual</a></p>');
    expect(saida).toContain('href="/manual"');
    expect(saida).toContain('Manual');
  });

  it('não deixa passar script nem handler', () => {
    const saida = htmlParaBoasVindas('<p onclick="roubar()">oi</p><script>alert(1)</script>');
    expect(saida).not.toContain('onclick');
    expect(saida).not.toContain('<script');
    expect(saida).toContain('oi');
  });

  it('devolve espaço normal onde o Quill pôs &nbsp; (senão o parágrafo não quebra linha)', () => {
    // Caso REAL, visto na tela: o texto versionado é quebrado em ~95 colunas no fonte, e o Quill
    // converte os espaços vizinhos de quebra em `&nbsp;` — praticamente todos. Com espaço
    // inquebrável o parágrafo transborda o painel do aluno em vez de quebrar.
    const doQuill = '<h4>Olá!\u00A0Eu\u00A0sou\u00A0o\u00A0seu\u00A0tutor.</h4>'
      + '<p>Nesta\u00A0tela\u00A0você\u00A0monta\u00A0um\u00A0<b>pipeline</b>\u00A0completo.</p>';
    const saida = htmlParaBoasVindas(doQuill);
    expect(saida).not.toContain('\u00A0');
    expect(saida).toContain('<h4>Olá! Eu sou o seu tutor.</h4>');
    expect(saida).toContain('monta um <b>pipeline</b> completo.');
  });

  it('colapsa espaços repetidos, que o HTML colapsaria de todo jeito', () => {
    expect(htmlParaBoasVindas('<p>a    b</p>')).toBe('<p>a b</p>');
  });

  it('é idempotente: aplicar de novo não muda mais nada', () => {
    const uma = htmlParaBoasVindas('<ol><li data-list="bullet">a</li></ol><p><strong>b</strong></p>');
    expect(htmlParaBoasVindas(uma)).toBe(uma);
  });

  it('texto vazio continua vazio', () => {
    expect(htmlParaBoasVindas('')).toBe('');
    expect(htmlParaBoasVindas('   ')).toBe('');
  });
});

describe('mesmoConteudo', () => {
  it('ignora espaço entre blocos', () => {
    expect(mesmoConteudo('<p>a</p>\n<p>b</p>', '<p>a</p><p>b</p>')).toBeTrue();
  });

  it('acusa diferença real', () => {
    expect(mesmoConteudo('<p>a</p>', '<p>b</p>')).toBeFalse();
  });
});
