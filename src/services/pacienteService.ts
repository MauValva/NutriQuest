import { supabase, type Paciente, type MissaoDB } from "../lib/supabase";

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
