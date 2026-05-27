import { type Missao } from "../types";

type Objetivo = "emagrecer" | "manter" | "ganhar";

export interface PerfilSalvo {
  nome: string;
  peso: string;
  altura: string;
  idade: string;
  objetivo: Objetivo;
}

export interface EstadoSalvo {
  xpTotal: number;
  streakDias: number;
  ultimoAcesso: string;
  missoesConcluidas: string[];
}

// ── Perfil ────────────────────────────────────────────
export function salvarPerfil(perfil: PerfilSalvo): void {
  localStorage.setItem("nq:perfil", JSON.stringify(perfil));
}

export function carregarPerfil(): PerfilSalvo | null {
  const json = localStorage.getItem("nq:perfil");
  return json ? JSON.parse(json) : null;
}

// ── Estado (XP, streak, missões) ──────────────────────
export function salvarEstado(estado: EstadoSalvo): void {
  localStorage.setItem("nq:estado", JSON.stringify(estado));
}

export function carregarEstado(): EstadoSalvo | null {
  const json = localStorage.getItem("nq:estado");
  return json ? JSON.parse(json) : null;
}

// ── Streak ────────────────────────────────────────────
export function calcularStreak(
  ultimoAcesso: string,
  streakAtual: number,
): number {
  const hoje = new Date().toISOString().split("T")[0];
  const ontem = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (ultimoAcesso === hoje) return streakAtual;
  if (ultimoAcesso === ontem) return streakAtual + 1;
  return 1;
}

// ── Missões do dia ────────────────────────────────────
export function salvarMissoesDoDia(missoes: Missao[]): void {
  const hoje = new Date().toISOString().split("T")[0];
  localStorage.setItem("nq:missoes:" + hoje, JSON.stringify(missoes));
}

export function carregarMissoesDoDia(missoesPadrao: Missao[]): Missao[] {
  const hoje = new Date().toISOString().split("T")[0];
  const json = localStorage.getItem("nq:missoes:" + hoje);
  return json ? JSON.parse(json) : missoesPadrao;
}
