/**
 * Gera o bloco `conteudo` (schema do catálogo) a partir de src/app/constants/tutor.json,
 * para MODELOS e MÉTRICAS. Saída: JSON { modelos: {valor: conteudo}, metricas: {valor: conteudo} }.
 *
 * Uso (migração não-destrutiva no backend):
 *   node scripts/gerar-conteudo-tutor.js > /tmp/conteudo.json
 *   cat /tmp/conteudo.json | ssh <vm> 'cat > /tmp/conteudo.json'
 *   # no backend: para cada (valor, conteudo) faz upsert em opcoes_modelos/opcoes_metricas
 *   #   APENAS quando o doc ainda não tem `conteudo` (preserva seed/edição do admin).
 *
 * As 3 métricas de agrupamento (silhouette/calinski/davies) não existem no tutor.json;
 * o conteúdo delas foi escrito direto na migração de produção.
 */
const path = require('path');
const t = require(path.join(__dirname, '..', 'src', 'app', 'constants', 'tutor.json'));

const asArr = (x) => (Array.isArray(x) ? x.filter((v) => v != null && v !== '') : (x ? [x] : []));

function modeloConteudo(m) {
  return {
    titulo: m.nome || '',
    descricao: m.descricao || '',
    intuicao: m.intuicao || '',
    conceitos: asArr(m.comoFunciona).map((l) => ({ nome: 'Como funciona', desc: l })),
    quandoUsar: asArr(m.quandoUsar),
    naoUsarQuando: asArr(m.naoUsarQuando),
    vantagens: asArr(m.vantagens),
    desvantagens: asArr(m.desvantagens),
    dicas: asArr(m.passoAPasso),
    link_sklearn: (m.links && m.links.sklearn) || '',
    hiperparametros_doc: Object.values(m.hiperparametros || {}).map((h) => ({
      nome: h.nome, sklearn: h.sklearn, descricao: h.descricao || '',
      default: h.padrao, tipo: h.tipo, faixa: h.faixa,
      efeito: h.implicacoes, quando_ajustar: h.dicaPratica,
    })),
  };
}

function metricaConteudo(me) {
  return {
    titulo: me.nome || '',
    descricao: me.descricao || '',
    intuicao: me.intuicao || '',
    formula: me.formula || '',
    exemplo: me.exemploReal || '',
    quandoUsar: asArr(me.quandoUsar),
    naoUsarQuando: asArr(me.naoUsarQuando),
    desvantagens: asArr(me.limitacoes),
    dicas: asArr(me.interpretacao),
    link_sklearn: (me.links && me.links.sklearn) || '',
  };
}

const out = { modelos: {}, metricas: {} };
for (const [valor, m] of Object.entries(t.modelos || {})) out.modelos[valor] = modeloConteudo(m);
for (const [valor, me] of Object.entries(t.metricas || {})) out.metricas[valor] = metricaConteudo(me);
process.stdout.write(JSON.stringify(out, null, 2));
