import {
  supabase,
  type Paciente,
  type MissaoDB,
  type Nutricionista,
} from "../lib/supabase";

// ── Login da nutricionista ────────────────────────────
export async function loginNutricionista(email: string, senha: string) {
  const { data, error } = await supabase
    .from("nutricionistas")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .eq("senha", senha)
    .single();

  if (error || !data) return null;
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

export async function cadastrarNutricionista(dados: {
  nome: string;
  email: string;
  crn: string;
  whatsapp: string;
  senha: string;
}): Promise<{ nutri: Nutricionista | null; erro: string | null }> {
  const { data, error } = await supabase
    .from("nutricionistas")
    .insert({
      nome: dados.nome,
      email: dados.email.toLowerCase().trim(),
      crn: dados.crn,
      whatsapp: dados.whatsapp,
      senha: dados.senha,
      plano: "gratis",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { nutri: null, erro: "Este email já está cadastrado." };
    }
    console.error("Erro ao cadastrar nutricionista:", error);
    return { nutri: null, erro: "Erro ao cadastrar. Tente novamente." };
  }

  return { nutri: data as Nutricionista, erro: null };
}

export async function listarPacientesTodos(
  nutricionistaId: string,
): Promise<Paciente[]> {
  const { data, error } = await supabase
    .from("pacientes")
    .select("*")
    .eq("nutricionista_id", nutricionistaId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as Paciente[];
}

export async function atualizarNutricionista(
  nutricionistaId: string,
  dados: Partial<Pick<Nutricionista, "nome" | "email" | "crn" | "whatsapp">>,
): Promise<Nutricionista | null> {
  const { data, error } = await supabase
    .from("nutricionistas")
    .update(dados)
    .eq("id", nutricionistaId)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar nutricionista:", error);
    return null;
  }
  return data as Nutricionista;
}

export async function excluirNutricionista(
  nutricionistaId: string,
): Promise<{ sucesso: boolean; erro?: string }> {
  const { count } = await supabase
    .from("pacientes")
    .select("id", { count: "exact", head: true })
    .eq("nutricionista_id", nutricionistaId);

  if ((count ?? 0) > 0) {
    return {
      sucesso: false,
      erro: "Você ainda tem pacientes cadastrados. Exclua-os antes de encerrar sua conta.",
    };
  }

  const { error } = await supabase
    .from("nutricionistas")
    .delete()
    .eq("id", nutricionistaId);

  if (error) {
    console.error("Erro ao excluir nutricionista:", error);
    return { sucesso: false, erro: "Erro ao excluir conta." };
  }

  return { sucesso: true };
}

export interface ResumoAdesao {
  refeicoesEsperadas: number;
  completas: number;
  parciais: number;
  extras: number;
  naoRegistradas: number;
  percentualAdesao: number;
  streakAtual: number;
  ultimaRefeicaoData: string | null;
}

export async function buscarResumoAdesao(
  paciente: Paciente,
): Promise<ResumoAdesao> {
  const { data: plano } = await supabase
    .from("refeicoes_plano")
    .select("opcoes")
    .eq("paciente_id", paciente.id);

  const refeicoesAtivas = (
    (plano ?? []) as Array<{ opcoes: Array<{ itens?: unknown[] }> }>
  ).filter(
    (r) =>
      Array.isArray(r.opcoes) &&
      r.opcoes.some((op) => (op.itens?.length ?? 0) > 0),
  ).length;

  const dataInicio =
    paciente.jornada_data_inicio ?? paciente.created_at?.slice(0, 10) ?? null;

  let diasDecorridos = 0;
  if (dataInicio) {
    const hoje = new Date();
    const inicio = new Date(dataInicio + "T00:00:00");
    diasDecorridos =
      Math.max(0, Math.floor((hoje.getTime() - inicio.getTime()) / 86400000)) +
      1;
    if (paciente.jornada_duracao_dias) {
      diasDecorridos = Math.min(diasDecorridos, paciente.jornada_duracao_dias);
    }
  }

  const refeicoesEsperadas = refeicoesAtivas * diasDecorridos;

  const { data: registros } = await supabase
    .from("refeicoes_registradas")
    .select("tipo_conclusao, data")
    .eq("paciente_id", paciente.id)
    .order("data", { ascending: false });

  const completas = (registros ?? []).filter(
    (r) => r.tipo_conclusao === "completa",
  ).length;
  const parciais = (registros ?? []).filter(
    (r) => r.tipo_conclusao === "parcial",
  ).length;
  const extras = (registros ?? []).filter(
    (r) => r.tipo_conclusao === "extra",
  ).length;

  const registradas = completas + parciais + extras;
  const naoRegistradas = Math.max(0, refeicoesEsperadas - registradas);

  const pesoTotal = completas * 1 + parciais * 0.5 + extras * 0.2;
  const percentualAdesao =
    refeicoesEsperadas > 0
      ? Math.round((pesoTotal / refeicoesEsperadas) * 100)
      : 0;

  return {
    refeicoesEsperadas,
    completas,
    parciais,
    extras,
    naoRegistradas,
    percentualAdesao,
    streakAtual: paciente.streak_dias ?? 0,
    ultimaRefeicaoData: registros?.[0]?.data ?? null,
  };
}

// ── Cadastrar novo paciente ───────────────────────────
export async function cadastrarPaciente(
  nutricionistaId: string,
  dados: Omit<Paciente, "id" | "nutricionista_id" | "ativa">,
): Promise<
  { paciente: Paciente; emailFoiAjustado: boolean } | { erro: string } | null
> {
  const { data: nutri } = await supabase
    .from("nutricionistas")
    .select("plano")
    .eq("id", nutricionistaId)
    .single();

  if (nutri?.plano === "gratis") {
    const { count } = await supabase
      .from("pacientes")
      .select("id", { count: "exact", head: true })
      .eq("nutricionista_id", nutricionistaId)
      .eq("ativa", true);

    if ((count ?? 0) >= 1) {
      return {
        erro: "Seu plano grátis permite apenas 1 paciente. Assine o serviço ou remova o paciente atual para cadastrar um novo.",
      };
    }
  }

  const emailBase = dados.email.toLowerCase().trim();
  let emailTentativa = emailBase;
  let emailFoiAjustado = false;

  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const { data, error } = await supabase
      .from("pacientes")
      .insert({
        ...dados,
        nutricionista_id: nutricionistaId,
        email: emailTentativa,
      })
      .select()
      .single();

    if (!error) {
      return { paciente: data as Paciente, emailFoiAjustado };
    }

    if (error.code === "23505") {
      const sufixo = Math.floor(100 + Math.random() * 900);
      const [usuario, dominio] = emailBase.split("@");
      emailTentativa = `${usuario}${sufixo}@${dominio}`;
      emailFoiAjustado = true;
      continue;
    }

    console.error("Erro ao cadastrar paciente:", error);
    return null;
  }

  return null; // esgotou tentativas — extremamente improvável
}

// ── Verifica se um email já está em uso por outro paciente ──
export async function emailPacienteDisponivel(
  email: string,
  excluirPacienteId?: string,
): Promise<boolean> {
  let query = supabase
    .from("pacientes")
    .select("id")
    .eq("email", email.toLowerCase().trim());

  if (excluirPacienteId) {
    query = query.neq("id", excluirPacienteId);
  }

  const { data } = await query.maybeSingle();
  return !data;
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
