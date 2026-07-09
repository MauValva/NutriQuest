import { supabase, type Paciente, type MissaoDB } from "../lib/supabase";
import { calcularTipoConclusao, calcularPontos } from "./pontuacaoService";

// ── Login do paciente ─────────────────────────────────
export async function loginPaciente(
  email: string,
  senha: string,
): Promise<Paciente | null> {
  const { data, error } = await supabase
    .from("pacientes")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .eq("senha_temp", senha)
    .eq("ativa", true)
    .single();

  if (error || !data) return null;
  return data as Paciente;
}

// ── Buscar missões aprovadas do paciente ──────────────
export async function buscarMissoesPaciente(
  pacienteId: string,
): Promise<MissaoDB[]> {
  const { data, error } = await supabase
    .from("missoes")
    .select("*")
    .eq("paciente_id", pacienteId)
    .eq("aprovada_nutri", true)
    .eq("ativa", true)
    .order("prioridade", { ascending: false });

  if (error || !data) return [];
  return data as MissaoDB[];
}

// ── Buscar registros de hoje ──────────────────────────
export async function buscarRegistrosHoje(
  pacienteId: string,
): Promise<Record<string, boolean>> {
  const hoje = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("registros_missoes")
    .select("missao_id, concluida")
    .eq("paciente_id", pacienteId)
    .eq("data", hoje);

  if (error || !data) return {};

  return data.reduce(
    (acc, r) => ({
      ...acc,
      [r.missao_id]: r.concluida,
    }),
    {},
  );
}

// ── Registrar missão concluída ────────────────────────
export async function concluirMissaoDB(
  pacienteId: string,
  missaoId: string,
  xpGanho: number,
): Promise<boolean> {
  const hoje = new Date().toISOString().split("T")[0];

  const { error } = await supabase.from("registros_missoes").upsert(
    {
      paciente_id: pacienteId,
      missao_id: missaoId,
      data: hoje,
      concluida: true,
      xp_ganho: xpGanho,
    },
    {
      onConflict: "paciente_id,missao_id,data",
    },
  );

  return !error;
}

// ── Buscar plano alimentar ────────────────────────────
export async function buscarPlanoAlimentar(pacienteId: string) {
  const { data, error } = await supabase
    .from("refeicoes_plano")
    .select("*")
    .eq("paciente_id", pacienteId)
    .order("horario");

  if (error || !data) return [];
  return data;
}

// ── Confirma uma opção do plano (com ou sem observação) ──
export async function registrarRefeicaoConfirmada(
  pacienteId: string,
  tipo: string,
  opcaoNumero: number,
  pontosBase: number,
  observacao: string = "",
): Promise<boolean> {
  const hoje = new Date().toISOString().split("T")[0];
  const horario = new Date().toTimeString().slice(0, 5);

  const tipoConclusao = calcularTipoConclusao(true, observacao);
  const pontosGanhos = calcularPontos(pontosBase, tipoConclusao);

  const { error } = await supabase.from("refeicoes_registradas").upsert(
    {
      paciente_id: pacienteId,
      tipo,
      data: hoje,
      horario,
      alimentos: { opcao: opcaoNumero },
      tipo_conclusao: tipoConclusao,
      observacao_paciente: observacao.trim() || null,
      pontos_ganhos: pontosGanhos,
      total_calorias: 0,
      macros: {},
    },
    { onConflict: "paciente_id,tipo,data" },
  );

  return !error;
}

// ── Registra que o paciente NÃO seguiu nenhuma opção do plano ──
export async function registrarRefeicaoExtra(
  pacienteId: string,
  tipo: string,
  pontosBase: number,
  textoLivre: string,
): Promise<boolean> {
  const hoje = new Date().toISOString().split("T")[0];
  const horario = new Date().toTimeString().slice(0, 5);

  const pontosGanhos = calcularPontos(pontosBase, "extra");

  const { error } = await supabase.from("refeicoes_registradas").upsert(
    {
      paciente_id: pacienteId,
      tipo,
      data: hoje,
      horario,
      alimentos: null,
      tipo_conclusao: "extra",
      observacao_paciente: textoLivre.trim(),
      pontos_ganhos: pontosGanhos,
      total_calorias: 0,
      macros: {},
    },
    { onConflict: "paciente_id,tipo,data" },
  );

  return !error;
}
// Retorna a semana atual no formato "2026-W22"
function semanaAtual(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7,
  );
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

// Verifica se a sobremesa ainda está disponível esta semana
export async function verificarSobremesaDisponivel(
  pacienteId: string,
): Promise<{ disponivel: boolean; usadas: number; limite: number }> {
  const semana = semanaAtual();

  // Busca o limite do plano
  const { data: plano } = await supabase
    .from("refeicoes_plano")
    .select("frequencia_semanal")
    .eq("paciente_id", pacienteId)
    .eq("tipo", "sobremesa")
    .single();

  const limite = plano?.frequencia_semanal ?? 0;
  if (limite === 0) return { disponivel: false, usadas: 0, limite: 0 };

  // Busca quantas já foram usadas esta semana
  const { data: controle } = await supabase
    .from("refeicoes_controle_semanal")
    .select("quantidade_usada")
    .eq("paciente_id", pacienteId)
    .eq("tipo", "sobremesa")
    .eq("semana", semana)
    .single();

  const usadas = controle?.quantidade_usada ?? 0;
  return { disponivel: usadas < limite, usadas, limite };
}

// Registra uso de sobremesa
export async function registrarUsoSobremesa(pacienteId: string): Promise<void> {
  const semana = semanaAtual();

  await supabase.from("refeicoes_controle_semanal").upsert(
    {
      paciente_id: pacienteId,
      tipo: "sobremesa",
      semana,
      quantidade_usada: 1,
    },
    { onConflict: "paciente_id,tipo,semana" },
  );

  // Se já existe, incrementa
  const { data } = await supabase
    .from("refeicoes_controle_semanal")
    .select("quantidade_usada")
    .eq("paciente_id", pacienteId)
    .eq("tipo", "sobremesa")
    .eq("semana", semana)
    .single();

  if (data && data.quantidade_usada >= 1) {
    await supabase
      .from("refeicoes_controle_semanal")
      .update({ quantidade_usada: data.quantidade_usada + 1 })
      .eq("paciente_id", pacienteId)
      .eq("tipo", "sobremesa")
      .eq("semana", semana);
  }
}
