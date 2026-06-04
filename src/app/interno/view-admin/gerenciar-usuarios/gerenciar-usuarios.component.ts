import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

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
    private snackBar: MatSnackBar
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
    // TODO: Carregar do backend
    // Por enquanto, dados mockados
    this.usuarios = [
      {
        id: '1',
        nome: 'Maria Silva',
        email: 'maria.silva@email.com',
        tipo: 'professor',
        status: 'ativo',
        dataAtivacao: new Date('2024-01-15'),
        ultimoAcesso: new Date('2024-06-01')
      },
      {
        id: '2',
        nome: 'João Santos',
        email: 'joao.santos@email.com',
        tipo: 'aluno',
        status: 'ativo',
        dataAtivacao: new Date('2024-02-20'),
        ultimoAcesso: new Date('2024-05-28')
      },
      {
        id: '3',
        nome: 'Ana Costa',
        email: 'ana.costa@email.com',
        tipo: 'aluno',
        status: 'pendente',
        dataConvite: new Date('2024-05-25')
      },
      {
        id: '4',
        nome: 'Pedro Oliveira',
        email: 'pedro.oliveira@email.com',
        tipo: 'professor',
        status: 'inativo',
        dataAtivacao: new Date('2024-01-10')
      }
    ];
    this.carregando = false;
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

    // TODO: Enviar para o backend
    // Simular envio
    setTimeout(() => {
      const novoUsuario: Usuario = {
        id: Date.now().toString(),
        nome: dados.nome,
        email: dados.email,
        tipo: dados.tipo,
        status: 'pendente',
        dataConvite: new Date()
      };

      this.usuarios.unshift(novoUsuario);
      this.fecharFormulario();
      this.enviandoConvite = false;

      this.snackBar.open(`Convite enviado para ${dados.email}`, 'Fechar', {
        duration: 5000,
        panelClass: 'snackbar-success'
      });
    }, 1500);
  }

  reenviarConvite(usuario: Usuario): void {
    // TODO: Enviar para o backend
    this.snackBar.open(`Convite reenviado para ${usuario.email}`, 'Fechar', {
      duration: 3000,
      panelClass: 'snackbar-success'
    });
  }

  alterarStatus(usuario: Usuario, novoStatus: 'ativo' | 'inativo'): void {
    // TODO: Enviar para o backend
    usuario.status = novoStatus;
    this.snackBar.open(`Status de ${usuario.nome} alterado para ${novoStatus}`, 'Fechar', {
      duration: 3000
    });
  }

  excluirUsuario(usuario: Usuario): void {
    // TODO: Enviar para o backend
    this.usuarios = this.usuarios.filter(u => u.id !== usuario.id);
    this.snackBar.open(`Usuário ${usuario.nome} removido`, 'Fechar', {
      duration: 3000
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
