import { Component, Input, OnChanges, OnInit } from '@angular/core';
import tutor from '../../constants/tutor.json';

@Component({
  selector: 'app-tutor',
  templateUrl: './tutor.component.html',
  styleUrls: ['./tutor.component.scss'],
  standalone: false
})
export class TutorComponent implements OnChanges {

  @Input() tutorColeta = false;
  @Input() tutorTreinamento = false;
  @Input() tutorModelo = false;
  @Input() resumo: string[] = [];
  @Input() explicacao: string[] = [];

  tutor = tutor;
  ngOnChanges(): void { }

}
