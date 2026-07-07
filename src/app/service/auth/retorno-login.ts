/**
 * returnUrl de deep-links protegidos (ex.: /view-aluno/entrar?codigo=X do QR de turma).
 *
 * Regras de segurança (revisão de código):
 * - EXPIRAÇÃO curta: um returnUrl abandonado numa aba compartilhada (PC de laboratório)
 *   não pode ser "herdado" por quem logar horas depois.
 * - Consumo SÓ após navegação bem-sucedida: uma falha transitória (chunk lazy que não
 *   carregou no Wi-Fi da escola) não queima o deep-link — a próxima tentativa reusa.
 */
const CHAVE = 'returnUrl';
const CHAVE_TS = 'returnUrlTs';
const VALIDADE_MS = 10 * 60 * 1000; // 10 minutos

export function guardarReturnUrl(destino: string): void {
  sessionStorage.setItem(CHAVE, destino);
  sessionStorage.setItem(CHAVE_TS, String(Date.now()));
}

/** Lê SEM remover; retorna null (e limpa) se ausente ou expirado. */
export function lerReturnUrl(): string | null {
  const url = sessionStorage.getItem(CHAVE);
  if (!url) return null;
  const ts = Number(sessionStorage.getItem(CHAVE_TS) || 0);
  if (!ts || Date.now() - ts > VALIDADE_MS) {
    limparReturnUrl();
    return null;
  }
  return url;
}

export function limparReturnUrl(): void {
  sessionStorage.removeItem(CHAVE);
  sessionStorage.removeItem(CHAVE_TS);
}
