import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DashboardService } from '../../../dashboard/services/dashboard.service';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: 'aluno' | 'professor' | 'admin';
  status: 'ativo' | 'pendente' | 'inativo';
  dataConvite?: Date;
  dataAtivacao?: Date;
  ultimoAcesso?: Date;
}

@Component({
  selector: 'app-gerenciar-usuarios',
  templateUrl: './gerenciar-usuarios.component.html',
  styleUrls: ['./gerenciar-usuarios.component.scss'],
  standalone: false
})
export class GerenciarUsuariosComponent implements OnInit {
  usuarios: Usuario[] = [];
  carregando = true;
  filtroTipo: string = 'todos';
  filtroStatus: string = 'todos';
  termoBusca: string = '';
  
  // Formulario de criacao
  formUsuario!: FormGroup;
  mostrarFormulario = false;
  enviandoConvite = false;

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dashboardService: DashboardService
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();
    this.carregarUsuarios();
  }

  inicializarFormulario(): void {
    this.formUsuario = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      tipo: ['aluno', Validators.required]
    });
  }

  carregarUsuarios(): void {
    this.carregando = true;
    this.dashboardService.listarUsuarios().subscribe({
      next: (usuarios) => {
        this.usuarios = usuarios.map(u => ({
          id: u.id,
          nome: u.nome,
          email: u.email,
          tipo: u.tipo,
          status: u.status,
          dataConvite: u.data_convite ? new Date(u.data_convite) : undefined,
          dataAtivacao: u.data_ativacao ? new Date(u.data_ativacao) : undefined,
          ultimoAcesso: u.ultimo_acesso ? new Date(u.ultimo_acesso) : undefined
        }));
        this.carregando = false;
      },
      error: (err) => {
        console.error('Erro ao carregar usuários:', err);
        this.snackBar.open('Erro ao carregar usuários', 'Fechar', { duration: 3000 });
        this.carregando = false;
      }
    });
  }

  get usuariosFiltrados(): Usuario[] {
    let filtrados = this.usuarios;
    
    if (this.filtroTipo !== 'todos') {
      filtrados = filtrados.filter(u => u.tipo === this.filtroTipo);
    }
    
    if (this.filtroStatus !== 'todos') {
      filtrados = filtrados.filter(u => u.status === this.filtroStatus);
    }
    
    if (this.termoBusca) {
      const termo = this.termoBusca.toLowerCase();
      filtrados = filtrados.filter(u => 
        u.nome.toLowerCase().includes(termo) || 
        u.email.toLowerCase().includes(termo)
      );
    }
    
    return filtrados;
  }

  abrirFormulario(): void {
    this.mostrarFormulario = true;
    this.formUsuario.reset({ tipo: 'aluno' });
  }

  fecharFormulario(): void {
    this.mostrarFormulario = false;
    this.formUsuario.reset();
  }

  enviarConvite(): void {
    if (this.formUsuario.invalid) {
      this.formUsuario.markAllAsTouched();
      return;
    }

    this.enviandoConvite = true;
    const dados = this.formUsuario.value;

    this.dashboardService.criarConvite({
      nome: dados.nome,
      email: dados.email,
      tipo: dados.tipo
    }).subscribe({
      next: (response) => {
        const novoUsuario: Usuario = {
          id: response.id,
          nome: response.nome,
          email: response.email,
          tipo: response.tipo,
          status: response.status,
          dataConvite: response.data_convite ? new Date(response.data_convite) : new Date()
        };

        this.usuarios.unshift(novoUsuario);
        this.fecharFormulario();
        this.enviandoConvite = false;

        if (response.email_enviado) {
          this.snackBar.open(`Convite enviado para ${dados.email}`, 'Fechar', {
            duration: 5000,
            panelClass: 'snackbar-success'
          });
        } else if (response.link_convite) {
          // Copiar link para clipboard
          navigator.clipboard.writeText(response.link_convite).then(() => {
            this.snackBar.open(
              `Email não configurado. Link copiado para a área de transferência!`,
              'Fechar',
              { duration: 8000, panelClass: 'snackbar-warning' }
            );
          }).catch(() => {
            this.snackBar.open(
              `Link do convite: ${response.link_convite}`,
              'Fechar',
              { duration: 15000, panelClass: 'snackbar-warning' }
            );
          });
        }
      },
      error: (err) => {
        console.error('Erro ao criar convite:', err);
        this.enviandoConvite = false;
        const msg = err.error?.detail || 'Erro ao enviar convite';
        this.snackBar.open(msg, 'Fechar', { duration: 5000 });
      }
    });
  }

  reenviarConvite(usuario: Usuario): void {
    this.dashboardService.reenviarConvite(usuario.id).subscribe({
      next: (response) => {
        const msg = response.email_enviado 
          ? `Convite reenviado para ${usuario.email}` 
          : `Convite recriado (email não configurado)`;
        this.snackBar.open(msg, 'Fechar', { duration: 3000 });
      },
      error: (err) => {
        console.error('Erro ao reenviar convite:', err);
        this.snackBar.open('Erro ao reenviar convite', 'Fechar', { duration: 3000 });
      }
    });
  }

  alterarStatus(usuario: Usuario, novoStatus: 'ativo' | 'inativo'): void {
    this.dashboardService.alterarStatusUsuario(usuario.id, novoStatus).subscribe({
      next: () => {
        usuario.status = novoStatus;
        this.snackBar.open(`Status de ${usuario.nome} alterado para ${novoStatus}`, 'Fechar', {
          duration: 3000
        });
      },
      error: (err) => {
        console.error('Erro ao alterar status:', err);
        this.snackBar.open('Erro ao alterar status', 'Fechar', { duration: 3000 });
      }
    });
  }

  excluirUsuario(usuario: Usuario): void {
    this.dashboardService.excluirUsuario(usuario.id).subscribe({
      next: () => {
        this.usuarios = this.usuarios.filter(u => u.id !== usuario.id);
        this.snackBar.open(`Usuário ${usuario.nome} removido`, 'Fechar', {
          duration: 3000
        });
      },
      error: (err) => {
        console.error('Erro ao excluir usuário:', err);
        this.snackBar.open('Erro ao excluir usuário', 'Fechar', { duration: 3000 });
      }
    });
  }

  getTipoLabel(tipo: string): string {
    const labels: Record<string, string> = {
      'aluno': 'Aluno',
      'professor': 'Professor',
      'admin': 'Administrador'
    };
    return labels[tipo] || tipo;
  }

  getTipoIcon(tipo: string): string {
    const icons: Record<string, string> = {
      'aluno': 'school',
      'professor': 'person',
      'admin': 'admin_panel_settings'
    };
    return icons[tipo] || 'person';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'ativo': 'Ativo',
      'pendente': 'Pendente',
      'inativo': 'Inativo'
    };
    return labels[status] || status;
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'ativo': 'check_circle',
      'pendente': 'pending',
      'inativo': 'block'
    };
    return icons[status] || 'help';
  }

  getDataFormatada(data?: Date): string {
    if (!data) return '-';
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getErroCampo(campo: string): string {
    const control = this.formUsuario.get(campo);
    if (control?.hasError('required')) return 'Campo obrigatório';
    if (control?.hasError('email')) return 'Email inválido';
    if (control?.hasError('minlength')) return 'Mínimo 3 caracteres';
    return '';
  }

  getUsuariosPorStatus(status: string): Usuario[] {
    return this.usuarios.filter(u => u.status === status);
  }

  getUsuariosPorTipo(tipo: string): Usuario[] {
    return this.usuarios.filter(u => u.tipo === tipo);
  }
}
