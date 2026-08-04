import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { ColetaDeDadosComponent } from './coleta-de-dados.component';
import { DashboardService } from '../../services/dashboard.service';
import { ItemPipeline } from '../../../models/item-coleta-dado.model';

/** O arrastar da paleta para a raia é COMO O ALUNO monta o pipeline, e não tinha teste algum —
 *  nem aqui nem nos outros três componentes de paleta, todos com o mesmo `onItemDropped`.
 *
 *  Mecanismo, que não é óbvio: a paleta NÃO declara `cdkDropListConnectedTo`, então soltar o item
 *  sobre uma raia não é um drop válido para o CDK — o `dropped` volta a ser emitido pela PRÓPRIA
 *  paleta, e é esse evento que o handler usa para empurrar o item à raia pelo serviço. Funciona,
 *  mas por efeito colateral de um drop inválido. Estes testes fixam o comportamento observável
 *  para que uma futura refatoração do drag-and-drop não o quebre em silêncio. */
describe('ColetaDeDadosComponent', () => {
  let component: ColetaDeDadosComponent;
  let fixture: ComponentFixture<ColetaDeDadosComponent>;
  let dashboardService: jasmine.SpyObj<DashboardService>;

  const item = (over: Partial<ItemPipeline> = {}): ItemPipeline => ({
    label: 'Importar Planilha', valor: 'importar_planilha', tipoItem: 'coleta-dado',
    movido: false, habilitado: true, icon: 'upload_file', id: 'c1', ...over,
  }) as ItemPipeline;

  /** Evento do CDK como o handler o consome. `sobreORecipiente` reproduz um drop VÁLIDO
   *  (ponteiro terminou dentro da lista); `false` é o caso real de soltar fora dela. */
  const eventoDrop = (dados: ItemPipeline, sobreORecipiente = false) => ({
    item: { data: dados },
    isPointerOverContainer: sobreORecipiente,
    previousIndex: 0,
    currentIndex: 0,
  }) as any;

  beforeEach(async () => {
    dashboardService = jasmine.createSpyObj('DashboardService', [
      'getItensColetasDados', 'movendoItemExecucao', 'emitInfoItemClicked',
    ]);
    dashboardService.getItensColetasDados.and.returnValue(of([item()]));

    await TestBed.configureTestingModule({
      declarations: [ColetaDeDadosComponent],
      imports: [HttpClientTestingModule],
      providers: [{ provide: DashboardService, useValue: dashboardService }],
    })
      .overrideComponent(ColetaDeDadosComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(ColetaDeDadosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('carrega a paleta do catálogo no init', () => {
    expect(component.itens.length).toBe(1);
    expect(component.itens[0].valor).toBe('importar_planilha');
  });

  it('ao soltar, marca o item como movido e o entrega à área de trabalho', () => {
    const arrastado = item();

    component.onItemDropped(eventoDrop(arrastado));

    expect(arrastado.movido).toBeTrue();
    expect(dashboardService.movendoItemExecucao).toHaveBeenCalledWith(arrastado);
  });

  it('adiciona o item mesmo quando o drop NÃO termina sobre a raia', () => {
    // Comportamento atual, fixado de propósito: o handler não olha `isPointerOverContainer` nem o
    // container de destino. Consequência para o aluno: começar a arrastar e desistir no meio do
    // caminho ADICIONA o item — não há como cancelar um arrasto. Se algum dia isso passar a
    // depender de onde o ponteiro terminou, este teste falha e o comportamento novo fica explícito.
    component.onItemDropped(eventoDrop(item(), false));

    expect(dashboardService.movendoItemExecucao).toHaveBeenCalledTimes(1);
  });

  it('o ⓘ pede a ficha do item ao tutor sem disparar o clique do card', () => {
    const evento = jasmine.createSpyObj('Event', ['stopPropagation', 'preventDefault']);
    const alvo = item();

    component.onInfoClick(alvo, evento);

    expect(dashboardService.emitInfoItemClicked).toHaveBeenCalledWith(alvo);
    expect(evento.stopPropagation).toHaveBeenCalled();
    expect(evento.preventDefault).toHaveBeenCalled();
  });
});
