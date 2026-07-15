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
    opcao?: number;
    itens?: unknown[];
    opcoes?: unknown;
    observacoes?: string;
    frequencia_semanal?: number;
  }>,
): Promise<boolean> {
  // Remove plano anterior
  await supabase.from("refeicoes_plano").delete().eq("paciente_id", pacienteId);

  // Agrupa por tipo — cada tipo vira um registro com todas as opções
  const agrupado: Record<
    string,
    {
      tipo: string;
      horario: string;
      opcoes: unknown[];
      observacoes: string;
      frequencia_semanal?: number;
    }
  > = {};

  for (const r of refeicoes) {
    // Se a refeição não tem itens, não cria no plano
    if (!r.itens || r.itens.length === 0) {
      continue;
    }

    if (!agrupado[r.tipo]) {
      agrupado[r.tipo] = {
        tipo: r.tipo,
        horario: r.horario,
        opcoes: [],
        observacoes: "",
        frequencia_semanal: r.frequencia_semanal,
      };
    }

    agrupado[r.tipo].opcoes.push({
      numero: r.opcao ?? agrupado[r.tipo].opcoes.length + 1,
      itens: r.itens,
      observacoes: r.observacoes ?? "",
    });

    if (agrupado[r.tipo].opcoes.length === 1) {
      agrupado[r.tipo].horario = r.horario;
    }
  }

  const registros = Object.values(agrupado)
    .filter((r) => r.opcoes.length > 0)
    .map((r) => ({
      paciente_id: pacienteId,
      tipo: r.tipo,
      horario: r.horario,
      opcoes: r.opcoes,
      observacoes: r.observacoes,
      frequencia_semanal: r.frequencia_semanal ?? null,
    }));
  const { error } = await supabase.from("refeicoes_plano").insert(registros);

  if (error) {
    console.error("Erro ao salvar plano:", error);
    return false;
  }

  return true;
}
// ── Buscar catálogo de missões ────────────────────────
export async function buscarCatalogoMissoes() {
  const { data, error } = await supabase
    .from("missoes_catalogo")
    .select("*")
    .eq("ativa", true)
    .order("tipo")
    .order("xp_recompensa");

  if (error || !data) return [];
  return data;
}

// ── Salvar missões selecionadas do catálogo ───────────
export async function salvarMissoesDoCatalogo(
  pacienteId: string,
  missaoIds: string[],
): Promise<boolean> {
  // Busca as missões selecionadas do catálogo
  const { data: catalogo, error: erroCatalogo } = await supabase
    .from("missoes_catalogo")
    .select("*")
    .in("id", missaoIds);

  if (erroCatalogo || !catalogo) return false;

  // Insere como missões do paciente
  const { error } = await supabase.from("missoes").insert(
    catalogo.map((m) => ({
      paciente_id: pacienteId,
      titulo: m.titulo,
      descricao: m.descricao,
      tipo: m.tipo,
      icone: m.icone,
      xp_recompensa: m.xp_recompensa,
      prioridade: 5,
      aprovada_nutri: true,
      ativa: true,
    })),
  );

  return !error;
}

export async function atualizarPaciente(
  pacienteId: string,
  dados: Partial<Paciente>,
) {
  const { data, error } = await supabase
    .from("pacientes")
    .update(dados)
    .eq("id", pacienteId)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar paciente:", error);
    return null;
  }

  return data as Paciente;
}

export interface HistoricoItemRefeicao {
  tipo: string;
  label: string;
  horarioPlanejado: string;
  feita: boolean;
  tipoConclusao?: "completa" | "parcial" | "extra";
  opcaoNumero?: number;
  observacaoPaciente?: string;
  pontosGanhos?: number;
  horarioConfirmado?: string;
}

const LABELS_REFEICAO: Record<string, string> = {
  cafe: "Café da manhã",
  almoco: "Almoço",
  lanche: "Lanche",
  jantar: "Jantar",
  sobremesa: "Sobremesa",
  complemento: "Complemento",
};

export async function buscarHistoricoPacienteData(
  pacienteId: string,
  data: string,
): Promise<HistoricoItemRefeicao[]> {
  const [
    { data: plano, error: erroPlano },
    { data: registros, error: erroReg },
  ] = await Promise.all([
    supabase
      .from("refeicoes_plano")
      .select("*")
      .eq("paciente_id", pacienteId)
      .order("horario"),
    supabase
      .from("refeicoes_registradas")
      .select("*")
      .eq("paciente_id", pacienteId)
      .eq("data", data),
  ]);

  if (erroPlano || erroReg) {
    console.error("Erro ao buscar histórico:", erroPlano ?? erroReg);
    return [];
  }

  const registrosPorTipo = new Map((registros ?? []).map((r) => [r.tipo, r]));

  return (plano ?? []).map((p) => {
    const registro = registrosPorTipo.get(p.tipo);
    return {
      tipo: p.tipo,
      label: LABELS_REFEICAO[p.tipo] ?? p.tipo,
      horarioPlanejado: p.horario,
      feita: !!registro,
      tipoConclusao: registro?.tipo_conclusao,
      opcaoNumero: (registro?.alimentos as { opcao?: number } | null)?.opcao,
      observacaoPaciente: registro?.observacao_paciente ?? undefined,
      pontosGanhos: registro?.pontos_ganhos,
      horarioConfirmado: registro?.horario,
    };
  });
}
