import { supabase, type Paciente, type MissaoDB } from "../lib/supabase";

// ── Login da nutricionista ────────────────────────────
export async function loginNutricionista(email: string, senha: string) {
  const { data, error } = await supabase
    .from("nutricionistas")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (error || !data) return null;
  // Por enquanto senha fixa — depois migra para Supabase Auth
  if (senha !== "nutri@2025") return null;
  return data;
}

// ── Listar pacientes da nutricionista ─────────────────
export async function listarPacientes(nutricionistaId: string) {
  const { data, error } = await supabase
    .from("pacientes")
    .select("*")
    .eq("nutricionista_id", nutricionistaId)
    .eq("ativa", true)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as Paciente[];
}

// ── Cadastrar novo paciente ───────────────────────────
export async function cadastrarPaciente(
  nutricionistaId: string,
  dados: Omit<Paciente, "id" | "nutricionista_id" | "ativa">,
): Promise<Paciente | null> {
  const { data, error } = await supabase
    .from("pacientes")
    .insert({
      ...dados,
      nutricionista_id: nutricionistaId,
      email: dados.email.toLowerCase().trim(),
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Erro ao cadastrar paciente:", error);
    return null;
  }
  return data as Paciente;
}

// ── Salvar missões sugeridas ──────────────────────────
export async function salvarMissoes(
  missoes: Omit<MissaoDB, "id">[],
): Promise<boolean> {
  const { error } = await supabase.from("missoes").insert(missoes);

  return !error;
}

// ── Aprovar ou rejeitar missão ────────────────────────
export async function atualizarMissao(
  missaoId: string,
  dados: Partial<MissaoDB>,
): Promise<boolean> {
  const { error } = await supabase
    .from("missoes")
    .update(dados)
    .eq("id", missaoId);

  return !error;
}

// ── Deletar missão ────────────────────────────────────
export async function deletarMissao(missaoId: string): Promise<boolean> {
  const { error } = await supabase.from("missoes").delete().eq("id", missaoId);

  return !error;
}

// ── Salvar plano alimentar ────────────────────────────
export async function salvarPlanoAlimentar(
  pacienteId: string,
  refeicoes: Array<{
    tipo: string;
    horario: string;
    opcoes: object;
    observacoes: string;
  }>,
): Promise<boolean> {
  // Remove plano anterior
  await supabase.from("refeicoes_plano").delete().eq("paciente_id", pacienteId);

  const { error } = await supabase
    .from("refeicoes_plano")
    .insert(refeicoes.map((r) => ({ ...r, paciente_id: pacienteId })));

  return !error;
}
