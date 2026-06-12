import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';

import { ColetaDadoComponent } from './coleta-dado.component';

describe('ColetaDadoComponent', () => {
  let component: ColetaDadoComponent;
  let fixture: ComponentFixture<ColetaDadoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ColetaDadoComponent],
      imports: [HttpClientTestingModule],
      providers: [
        { provide: MatDialog, useValue: { open: jasmine.createSpy('open') } },
      ],
    })
    .overrideComponent(ColetaDadoComponent, { set: { template: '' } })
    .compileComponents();

    fixture = TestBed.createComponent(ColetaDadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should accept all grouped data file formats', () => {
    expect(component.aceitarArquivos).toBe('.csv,.tsv,.json,.xls,.xlsx');
  });

  it('should detect file type by extension', () => {
    expect(component.detectarTipoArquivo('dados.csv')).toBe('csv');
    expect(component.detectarTipoArquivo('dados.tsv')).toBe('tsv');
    expect(component.detectarTipoArquivo('dados.json')).toBe('json');
    expect(component.detectarTipoArquivo('dados.xls')).toBe('excel');
    expect(component.detectarTipoArquivo('dados.xlsx')).toBe('excel');
  });
});
