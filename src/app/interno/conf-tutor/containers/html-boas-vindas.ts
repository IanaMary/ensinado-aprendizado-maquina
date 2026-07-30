/**
 * Converte o HTML do editor visual para o subconjunto que o painel do tutor realmente renderiza.
 *
 * O texto de boas-vindas é exibido no aluno com `[innerHTML]` sob o sanitizer do Angular, que
 * descarta `style`, `script` e handlers. Sem esta conversão, o admin formataria no editor e parte do
 * resultado **desapareceria silenciosamente** na tela do aluno.
 *
 * O que o arquivo resolve, em ordem de gravidade:
 *
 * 1. **`&nbsp;` em quase todo espaço** — real e verificado: o `getSemanticHTML()` do Quill 2 (o
 *    getter que o `ngx-quill` usa em `format="html"`) troca espaço por espaço inquebrável, e o texto
 *    versionado é quebrado em ~95 colunas. Sem normalizar, o parágrafo deixa de quebrar linha no
 *    painel do aluno e transborda. Coberto por `html-boas-vindas.quill.spec.ts`, que passa pelo
 *    editor de verdade.
 * 2. **lista com marcador como `<ol><li data-list="bullet">`** — é a forma do `root.innerHTML`, e
 *    o `data-list` só desenha o marcador com o CSS do Quill, que o painel do aluno não carrega.
 *    Pelo caminho de hoje (`getSemanticHTML`) **não acontece**: o Quill 2.0.3 já devolve `<ul>`.
 *    A conversão fica como guarda — vale para HTML colado de outra origem, para lista mista e para
 *    o dia em que alguém trocar o getter ou a versão. Não é correção de defeito observado.
 * 3. **`<strong>`/`<em>`** em vez de `<b>`/`<i>` — inofensivo no navegador, mas o texto versionado
 *    do repo usa `<b>`/`<i>`, e a comparação do seed é por hash do texto: normalizar mantém a
 *    edição do admin comparável com o padrão.
 */

/**
 * Barra do editor, limitada ao que o painel do tutor renderiza: oferecer formatação que desaparece
 * na tela do aluno é pior que não oferecer. Mora aqui, junto do conversor, porque é o outro lado do
 * mesmo contrato — e porque o teste de ida-e-volta pelo Quill precisa da configuração REAL da tela,
 * não de uma cópia que pode divergir dela sem ninguém notar.
 */
export const QUILL_MODULOS_BOAS_VINDAS = {
  toolbar: [
    [{ header: [4, false] }],
    ['bold', 'italic'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
};

/** Tags que o painel do tutor renderiza (o resto é desembrulhado, preservando o conteúdo). */
const TAGS_PERMITIDAS = new Set(['H4', 'P', 'B', 'I', 'UL', 'OL', 'LI', 'BR', 'A']);

/** Atributos que sobrevivem. `style`/`class` cairiam no sanitizer do Angular de qualquer forma. */
const ATRIBUTOS_PERMITIDOS: Record<string, string[]> = { A: ['href', 'target', 'rel'] };

const EQUIVALENTES: Record<string, string> = {
  STRONG: 'b',
  EM: 'i',
  H1: 'h4', H2: 'h4', H3: 'h4', H5: 'h4', H6: 'h4',   // o painel só tem um nível de título
};

function trocarTag(el: Element, nova: string): Element {
  const novo = el.ownerDocument.createElement(nova);
  while (el.firstChild) novo.appendChild(el.firstChild);
  el.replaceWith(novo);
  return novo;
}

/** Substitui o elemento pelo seu próprio conteúdo (mantém o texto, perde a marcação). */
function desembrulhar(el: Element): void {
  const pai = el.parentNode;
  if (!pai) return;
  while (el.firstChild) pai.insertBefore(el.firstChild, el);
  pai.removeChild(el);
}

/**
 * Uma `<ol>` do Quill pode misturar itens de marcador e de numeração (`data-list`). Quebra em
 * blocos consecutivos do mesmo tipo, cada um com a sua tag correta.
 */
function corrigirListas(raiz: Element): void {
  raiz.querySelectorAll('ol, ul').forEach((lista) => {
    const itens = Array.from(lista.children).filter((c) => c.tagName === 'LI');
    if (!itens.length) return;
    const tipoDoItem = (li: Element) =>
      li.getAttribute('data-list') === 'bullet' ? 'ul'
        : li.getAttribute('data-list') === 'ordered' ? 'ol'
          : lista.tagName.toLowerCase();

    const blocos: { tipo: string; itens: Element[] }[] = [];
    for (const li of itens) {
      const tipo = tipoDoItem(li);
      const ultimo = blocos[blocos.length - 1];
      if (ultimo && ultimo.tipo === tipo) ultimo.itens.push(li);
      else blocos.push({ tipo, itens: [li] });
    }

    const doc = lista.ownerDocument;
    for (const bloco of blocos) {
      const nova = doc.createElement(bloco.tipo);
      for (const li of bloco.itens) {
        li.removeAttribute('data-list');
        nova.appendChild(li);
      }
      lista.parentNode?.insertBefore(nova, lista);
    }
    lista.remove();
  });
}

/**
 * Devolve espaço normal onde o editor colocou espaço inquebrável.
 *
 * O Quill converte em `&nbsp;` os espaços vizinhos de quebra de linha do HTML de origem — e o texto
 * versionado é quebrado em ~95 colunas, então praticamente TODO espaço voltava como `&nbsp;`. Não é
 * cosmético: com espaço inquebrável, o parágrafo deixa de quebrar linha no painel do aluno e
 * transborda o container.
 */
function normalizarEspacos(raiz: Element): void {
  const doc = raiz.ownerDocument;
  const caminhante = doc.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  const textos: Text[] = [];
  while (caminhante.nextNode()) textos.push(caminhante.currentNode as Text);
  for (const no of textos) {
    // \u00A0 = &nbsp;. Runs de espaço viram um só (o HTML os colapsaria de todo jeito).
    no.textContent = (no.textContent || '').replace(/\u00A0/g, ' ').replace(/[ \t]{2,}/g, ' ');
  }
}


function limparAtributos(el: Element): void {
  const permitidos = ATRIBUTOS_PERMITIDOS[el.tagName] || [];
  for (const attr of Array.from(el.attributes)) {
    if (!permitidos.includes(attr.name)) el.removeAttribute(attr.name);
  }
}

/** HTML do editor → HTML do painel do tutor. Idempotente: aplicar duas vezes dá o mesmo resultado. */
export function htmlParaBoasVindas(html: string): string {
  const bruto = (html || '').trim();
  if (!bruto) return '';

  const doc = new DOMParser().parseFromString(`<div id="raiz">${bruto}</div>`, 'text/html');
  const raiz = doc.getElementById('raiz');
  if (!raiz) return bruto;

  corrigirListas(raiz);
  normalizarEspacos(raiz);

  // Percorre de dentro para fora: desembrulhar um `<span>` não deve esconder o que havia nele.
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const el of Array.from(raiz.querySelectorAll('*'))) {
      const equivalente = EQUIVALENTES[el.tagName];
      if (equivalente) { trocarTag(el, equivalente); mudou = true; continue; }
      if (!TAGS_PERMITIDAS.has(el.tagName)) { desembrulhar(el); mudou = true; continue; }
      limparAtributos(el);
    }
  }

  // O Quill fecha com um parágrafo vazio; ele não acrescenta nada na tela do aluno.
  let saida = raiz.innerHTML.replace(/(<p><br\s*\/?><\/p>\s*)+$/i, '').trim();
  // Uma linha por BLOCO, para o texto ficar legível na aba "código HTML". Quebrar em todo `><`
  // partiria o conteúdo inline (`<p>manter <b>isto</b>` + `\n</p>`).
  saida = saida
    .replace(/(<\/(?:p|h4|ul|ol|li)>)(?=<)/gi, '$1\n')
    .replace(/(<(?:ul|ol)>)(?=<li)/gi, '$1\n')
    .replace(/(<\/li>)(?=<\/(?:ul|ol)>)/gi, '$1\n');
  return saida;
}

/** Compara dois HTML pelo que eles significam, ignorando espaço entre blocos. */
export function mesmoConteudo(a: string, b: string): boolean {
  const normalizar = (h: string) => (h || '').replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
  return normalizar(a) === normalizar(b);
}
