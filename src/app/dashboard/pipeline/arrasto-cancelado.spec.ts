import { desistiuDoArrasto } from './arrasto-cancelado';

/** As três paletas que ligam `(cdkDropListDropped)` — coleta, modelos e métricas — decidem por esta
 *  função se um drop conta. Ela é a correção do defeito de que não havia como desistir de um
 *  arrasto: a paleta não declara `cdkDropListConnectedTo`, então todo drop volta para ela mesma e o
 *  handler adicionava o item onde quer que o ponteiro terminasse. */
describe('desistiuDoArrasto', () => {
  /** Uma raia de 200×400 começando em (300, 100). */
  const raia = [{ left: 300, right: 500, top: 100, bottom: 500 }];

  describe('soltou de volta sobre a própria paleta', () => {
    it('desistiu, e nem precisa olhar a geometria', () => {
      expect(desistiuDoArrasto({ isPointerOverContainer: true }, [])).toBeTrue();
      expect(desistiuDoArrasto({ isPointerOverContainer: true, dropPoint: { x: 400, y: 300 } }, raia)).toBeTrue();
    });
  });

  describe('soltou fora da paleta', () => {
    it('dentro de uma raia: entra', () => {
      expect(desistiuDoArrasto({ isPointerOverContainer: false, dropPoint: { x: 400, y: 300 } }, raia)).toBeFalse();
    });

    it('na borda exata da raia: entra (a borda pertence à raia)', () => {
      expect(desistiuDoArrasto({ isPointerOverContainer: false, dropPoint: { x: 300, y: 100 } }, raia)).toBeFalse();
      expect(desistiuDoArrasto({ isPointerOverContainer: false, dropPoint: { x: 500, y: 500 } }, raia)).toBeFalse();
    });

    it('em cima de nenhuma raia — o painel do tutor, o cabeçalho: desistiu', () => {
      // Este era o resíduo conhecido da primeira versão da guarda: só `isPointerOverContainer` não
      // cobria soltar numa terceira área, e o item entrava mesmo assim.
      expect(desistiuDoArrasto({ isPointerOverContainer: false, dropPoint: { x: 900, y: 300 } }, raia)).toBeTrue();
      expect(desistiuDoArrasto({ isPointerOverContainer: false, dropPoint: { x: 400, y: 20 } }, raia)).toBeTrue();
    });

    it('com várias raias, basta cair em uma', () => {
      const quatro = [
        { left: 0, right: 100, top: 0, bottom: 100 },
        { left: 200, right: 300, top: 0, bottom: 100 },
        ...raia,
      ];
      expect(desistiuDoArrasto({ isPointerOverContainer: false, dropPoint: { x: 250, y: 50 } }, quatro)).toBeFalse();
      expect(desistiuDoArrasto({ isPointerOverContainer: false, dropPoint: { x: 150, y: 50 } }, quatro)).toBeTrue();
    });
  });

  describe('falha para o lado seguro', () => {
    // O pior resultado aceitável é voltar a adicionar sempre. Inaceitável seria parar de adicionar,
    // que deixaria o aluno sem conseguir montar o pipeline.
    it('sem dropPoint, adiciona como antes', () => {
      expect(desistiuDoArrasto({ isPointerOverContainer: false }, raia)).toBeFalse();
    });

    it('sem nenhuma raia medível na tela, adiciona como antes', () => {
      expect(desistiuDoArrasto({ isPointerOverContainer: false, dropPoint: { x: 900, y: 300 } }, [])).toBeFalse();
    });

    it('sem evento, adiciona como antes', () => {
      expect(desistiuDoArrasto(null, raia)).toBeFalse();
      expect(desistiuDoArrasto(undefined, raia)).toBeFalse();
    });

    it('só o booleano verdadeiro cancela — outro valor "truthy" não conta', () => {
      expect(desistiuDoArrasto({ isPointerOverContainer: 'sim' as any }, raia)).toBeFalse();
    });
  });

  describe('medindo as raias da própria tela', () => {
    afterEach(() => document.querySelectorAll('.column-content').forEach(el => el.remove()));

    it('lê `.column-content` do documento quando o chamador não passa as áreas', () => {
      const el = document.createElement('div');
      el.className = 'column-content';
      el.style.cssText = 'position:fixed;left:300px;top:100px;width:200px;height:400px';
      document.body.appendChild(el);

      expect(desistiuDoArrasto({ isPointerOverContainer: false, dropPoint: { x: 400, y: 300 } })).toBeFalse();
      expect(desistiuDoArrasto({ isPointerOverContainer: false, dropPoint: { x: 900, y: 300 } })).toBeTrue();
    });

    it('ignora raia de tamanho zero (coluna fechada) e cai no lado seguro', () => {
      const el = document.createElement('div');
      el.className = 'column-content';
      el.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0';
      document.body.appendChild(el);

      expect(desistiuDoArrasto({ isPointerOverContainer: false, dropPoint: { x: 900, y: 300 } })).toBeFalse();
    });
  });
});
