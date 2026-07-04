/**
 * Converte o nome de um experimento salvo pelo aluno num pedaço de nome de
 * arquivo seguro: minúsculo, sem acentos, espaços viram "_", e só resta
 * [a-z0-9_-]. Usado para nomear os downloads (ex.: "Overfit!" -> "overfit").
 * Retorna '' quando não sobra nada de útil (o chamador decide o fallback).
 */
export function slugificarNome(nome: string | null | undefined): string {
  if (!nome) return '';
  return nome
    .normalize('NFD').replace(/\p{Diacritic}/gu, '') // remove acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_') // qualquer separador/símbolo -> _
    .replace(/^_+|_+$/g, '')     // sem _ nas pontas
    .slice(0, 60);
}
