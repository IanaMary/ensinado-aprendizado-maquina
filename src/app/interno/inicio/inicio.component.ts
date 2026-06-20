import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

interface ModoEntrada {
  id: string;
  emoji: string;
  titulo: string;
  descricao: string;
  rota: string;
  cor: string;
  selo?: string;
}

/**
 * Seletor de entrada (logo após o login do aluno): escolhe entre as três
 * experiências — Treine seu Robô (fundamental/lúdico), Trilha de ML e o
 * dashboard clássico. Coexiste com tudo; nenhuma muda de comportamento.
 */
@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.scss'],
})
export class InicioComponent {
  nome = (() => {
    try {
      const u = JSON.parse(sessionStorage.getItem('usuario') || '{}');
      return u?.usuario?.nome || u?.nome || '';
    } catch {
      return '';
    }
  })();

  modos: ModoEntrada[] = [
    {
      id: 'robo', emoji: '🤖', titulo: 'Treine seu Robô',
      descricao: 'Ensine um robô a reconhecer coisas, numa aventura passo a passo.',
      rota: '/treine-robo', cor: '#7C3AED', selo: 'Para começar',
    },
    {
      id: 'leo', emoji: '📸', titulo: 'Léo no Mundo Real',
      descricao: 'Tire fotos das suas coisas e ensine a IA a reconhecê-las de verdade.',
      rota: '/leo-mundo-real', cor: '#F59E0B', selo: 'Com a câmera',
    },
    {
      id: 'trilha', emoji: '🧭', titulo: 'Trilha de ML',
      descricao: 'Monte seu pipeline de machine learning em uma trilha visual.',
      rota: '/trilha', cor: '#3B82F6',
    },
    {
      id: 'classico', emoji: '🖥️', titulo: 'Modo Clássico',
      descricao: 'O painel completo, com todas as etapas e detalhes do pipeline.',
      rota: '/view-aluno', cor: '#16A34A',
    },
  ];

  constructor(private router: Router) {}

  abrir(m: ModoEntrada): void {
    this.router.navigate([m.rota]);
  }
}
