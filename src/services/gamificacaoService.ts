import { supabase } from "../lib/supabase";
import { dataHojeStr } from "./pacienteService";

function addDiasStr(dataStr: string, dias: number): string {
  const d = new Date(dataStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().split("T")[0];
}

// ── Cumprimento diário do plano alimentar ─────────────
export async function calcularCumprimentoDia(
  pacienteId: string,
  data: string,
): Promise<{ percentual: number; totalPlanejadas: number; feitas: number }> {
  const { data: plano } = await supabase
    .from("refeicoes_plano")
    .select("tipo, opcoes")
    .eq("paciente_id", pacienteId);

  const tiposAtivos = (plano ?? []).filter(
    (r) =>
      Array.isArray(r.opcoes) &&
      r.opcoes.some((op: { itens?: unknown[] }) => (op.itens?.length ?? 0) > 0),
  );
  const totalPlanejadas = tiposAtivos.length;

  if (totalPlanejadas === 0) {
    return { percentual: 0, totalPlanejadas: 0, feitas: 0 };
  }

  const { data: registros } = await supabase
    .from("refeicoes_registradas")
    .select("tipo")
    .eq("paciente_id", pacienteId)
    .eq("data", data);

  const feitas = registros?.length ?? 0;
  // Qualquer registro (completa, parcial ou extra) conta como "fez a refeição"
  const percentual = Math.min(1, feitas / totalPlanejadas);

  return { percentual, totalPlanejadas, feitas };
}

export function corDoDia(
  totalPlanejadas: number,
  percentual: number,
): "verde" | "amarelo" | "vermelho" | "sem-plano" {
  if (totalPlanejadas === 0) return "sem-plano";
  if (percentual >= 1) return "verde";
  if (percentual >= 0.5) return "amarelo";
  return "vermelho";
}

// ── Passe Livre ────────────────────────────────────────
async function consumirPasseLivre(
  pacienteId: string,
  dia: string,
): Promise<boolean> {
  const { data: passe } = await supabase
    .from("passes_livres")
    .select("id")
    .eq("paciente_id", pacienteId)
    .eq("usado", false)
    .order("concedido_em", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!passe) return false;

  await supabase
    .from("passes_livres")
    .update({ usado: true, usado_em: dia })
    .eq("id", passe.id);

  return true;
}

export async function passeLivreDisponivel(
  pacienteId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("passes_livres")
    .select("id")
    .eq("paciente_id", pacienteId)
    .eq("usado", false)
    .maybeSingle();
  return !!data;
}

export async function verificarEConcederPasseLivre(
  pacienteId: string,
): Promise<void> {
  const { data: disponivel } = await supabase
    .from("passes_livres")
    .select("id")
    .eq("paciente_id", pacienteId)
    .eq("usado", false)
    .maybeSingle();

  if (disponivel) return;

  const { data: ultimoUsado } = await supabase
    .from("passes_livres")
    .select("usado_em")
    .eq("paciente_id", pacienteId)
    .eq("usado", true)
    .order("usado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count: totalConcedidos } = await supabase
    .from("passes_livres")
    .select("id", { count: "exact", head: true })
    .eq("paciente_id", pacienteId);

  async function concederComSeguranca() {
    const { error } = await supabase
      .from("passes_livres")
      .insert({ paciente_id: pacienteId });

    // Se outra chamada concorrente já inseriu um passe disponível
    // nesse meio-tempo, o índice único recusa esta — e está tudo bem,
    // o objetivo (ter 1 passe disponível) já foi cumprido pela outra.
    if (error && error.code !== "23505") {
      console.error("Erro ao conceder passe livre:", error);
    }
  }

  if (!ultimoUsado && (totalConcedidos ?? 0) === 0) {
    await concederComSeguranca();
    return;
  }

  if (ultimoUsado?.usado_em) {
    const dias = Math.floor(
      (new Date(dataHojeStr()).getTime() -
        new Date(ultimoUsado.usado_em).getTime()) /
        86400000,
    );
    if (dias >= 15) {
      await concederComSeguranca();
    }
  }
}

export async function contarPassesUsadosNaJornada(
  pacienteId: string,
  jornadaDataInicio: string | null,
): Promise<number> {
  if (!jornadaDataInicio) return 0;
  const { count } = await supabase
    .from("passes_livres")
    .select("id", { count: "exact", head: true })
    .eq("paciente_id", pacienteId)
    .eq("usado", true)
    .gte("usado_em", jornadaDataInicio);
  return count ?? 0;
}

// ── Streak (sequência) ─────────────────────────────────
const MAX_DIAS_RETROSPECTO = 90;

export async function atualizarStreak(pacienteId: string): Promise<{
  streakDias: number;
  streakMaior: number;
  diasProtegidosAgora: string[]; // ← novo
}> {
  const { data: pacienteRow } = await supabase
    .from("pacientes")
    .select("jornada_data_inicio, created_at, streak_maior")
    .eq("id", pacienteId)
    .single();

  if (!pacienteRow) {
    return { streakDias: 0, streakMaior: 0, diasProtegidosAgora: [] };
  }

  const hoje = dataHojeStr();
  const ontem = addDiasStr(hoje, -1);
  const limiteMinimo = addDiasStr(hoje, -MAX_DIAS_RETROSPECTO);

  let limite =
    pacienteRow.jornada_data_inicio ??
    pacienteRow.created_at?.slice(0, 10) ??
    limiteMinimo;
  if (limite < limiteMinimo) limite = limiteMinimo;

  const { data: plano } = await supabase
    .from("refeicoes_plano")
    .select("opcoes")
    .eq("paciente_id", pacienteId);

  const totalPlanejadas = (
    (plano ?? []) as Array<{ opcoes: Array<{ itens?: unknown[] }> }>
  ).filter(
    (r) =>
      Array.isArray(r.opcoes) &&
      r.opcoes.some((op) => (op.itens?.length ?? 0) > 0),
  ).length;

  if (totalPlanejadas === 0) {
    return {
      streakDias: 0,
      streakMaior: pacienteRow.streak_maior ?? 0,
      diasProtegidosAgora: [],
    };
  }

  const { data: registros } = await supabase
    .from("refeicoes_registradas")
    .select("data")
    .eq("paciente_id", pacienteId)
    .gte("data", limite)
    .lte("data", ontem);

  const contagemPorDia = new Map<string, number>();
  for (const r of registros ?? []) {
    contagemPorDia.set(r.data, (contagemPorDia.get(r.data) ?? 0) + 1);
  }

  const { data: passesUsados } = await supabase
    .from("passes_livres")
    .select("usado_em")
    .eq("paciente_id", pacienteId)
    .eq("usado", true);

  const diasProtegidos = new Set(
    (passesUsados ?? []).map((p) => p.usado_em).filter((d): d is string => !!d),
  );

  let streak = 0;
  let cursor = ontem;
  const diasProtegidosAgora: string[] = []; // ← novo

  while (cursor >= limite) {
    const feitas = contagemPorDia.get(cursor) ?? 0;
    const percentual = feitas / totalPlanejadas;

    if (percentual >= 0.5 || diasProtegidos.has(cursor)) {
      streak += 1;
    } else {
      const protegido = await consumirPasseLivre(pacienteId, cursor);
      if (protegido) {
        streak += 1;
        diasProtegidosAgora.push(cursor); // ← novo
      } else {
        break;
      }
    }

    cursor = addDiasStr(cursor, -1);
  }

  const maiorFinal = Math.max(pacienteRow.streak_maior ?? 0, streak);

  await supabase
    .from("pacientes")
    .update({
      streak_dias: streak,
      streak_maior: maiorFinal,
      streak_verificado_em: hoje,
    })
    .eq("id", pacienteId);

  return { streakDias: streak, streakMaior: maiorFinal, diasProtegidosAgora };
}

export async function diasProtegidosPorPasse(
  pacienteId: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("passes_livres")
    .select("usado_em")
    .eq("paciente_id", pacienteId)
    .eq("usado", true);

  return new Set(
    (data ?? []).map((p) => p.usado_em).filter((d): d is string => !!d),
  );
}

// ── Streak de missão  ──
export async function streakDeTipoMissao(
  pacienteId: string,
  tipo: string,
): Promise<number> {
  const { data: registros } = await supabase
    .from("missoes_diarias")
    .select("data")
    .eq("paciente_id", pacienteId)
    .eq("tipo", tipo)
    .eq("concluida", true)
    .order("data", { ascending: false });

  const diasComTipo = new Set((registros ?? []).map((r) => r.data));

  let streak = 0;
  let cursor = dataHojeStr();
  if (!diasComTipo.has(cursor)) cursor = addDiasStr(cursor, -1);

  while (diasComTipo.has(cursor)) {
    streak += 1;
    cursor = addDiasStr(cursor, -1);
  }

  return streak;
}

// ── Hábitos (janela móvel de 7 dias) ───────────────────
export interface Habitos {
  alimentacao: number;
  agua: number;
  exercicio: number;
  sono: number;
}

const JANELA_HABITOS_DIAS = 7;

export async function calcularHabitos(pacienteId: string): Promise<Habitos> {
  const hoje = dataHojeStr();
  const dias: string[] = [];
  for (let i = JANELA_HABITOS_DIAS - 1; i >= 0; i--) {
    dias.push(addDiasStr(hoje, -i));
  }

  let somaAlimentacao = 0;
  for (const dia of dias) {
    const { percentual, totalPlanejadas } = await calcularCumprimentoDia(
      pacienteId,
      dia,
    );
    if (totalPlanejadas > 0) somaAlimentacao += percentual;
  }
  const alimentacao = Math.round((somaAlimentacao / JANELA_HABITOS_DIAS) * 100);

  const { data: registros } = await supabase
    .from("missoes_diarias")
    .select("tipo, data")
    .eq("paciente_id", pacienteId)
    .eq("concluida", true)
    .gte("data", dias[0])
    .lte("data", hoje);

  function percentualTipo(tipo: string): number {
    const diasComTipo = new Set(
      (registros ?? []).filter((r) => r.tipo === tipo).map((r) => r.data),
    );
    return Math.round((diasComTipo.size / JANELA_HABITOS_DIAS) * 100);
  }

  return {
    alimentacao,
    agua: percentualTipo("hidratacao"),
    exercicio: percentualTipo("atividade"),
    sono: percentualTipo("sono"),
  };
}

// ── Conquistas ──────────────────────────────────────────
export interface StatsConquistas {
  totalRefeicoesRegistradas: number;
  diasConsecutivosAgua: number;
  streakDias: number;
  primeiraAtividade: boolean;
  totalMissoesConcluidas: number;
}

export interface StatsConquistas {
  totalRefeicoesRegistradas: number;
  diasConsecutivosAgua: number;
  streakDias: number;
  primeiraAtividade: boolean;
  totalMissoesConcluidas: number;
  passeLivreIntacto: boolean; // ← novo
}

export async function calcularStatsConquistas(
  pacienteId: string,
): Promise<StatsConquistas> {
  const { count: totalRefeicoesRegistradas } = await supabase
    .from("refeicoes_registradas")
    .select("id", { count: "exact", head: true })
    .eq("paciente_id", pacienteId);

  const diasConsecutivosAgua = await streakDeTipoMissao(
    pacienteId,
    "hidratacao",
  );

  const { data: pacienteRow } = await supabase
    .from("pacientes")
    .select("streak_dias, jornada_duracao_dias, jornada_data_inicio")
    .eq("id", pacienteId)
    .single();

  const { count: totalAtividadeConcluidas } = await supabase
    .from("missoes_diarias")
    .select("id", { count: "exact", head: true })
    .eq("paciente_id", pacienteId)
    .eq("tipo", "atividade")
    .eq("concluida", true);

  const { count: totalMissoesConcluidas } = await supabase
    .from("missoes_diarias")
    .select("id", { count: "exact", head: true })
    .eq("paciente_id", pacienteId)
    .eq("concluida", true);

  const jornada = calcularJornada(
    pacienteRow?.jornada_duracao_dias ?? null,
    pacienteRow?.jornada_data_inicio ?? null,
  );

  let passeLivreIntacto = false;
  if (jornada.definida && jornada.progresso >= 1) {
    const usados = await contarPassesUsadosNaJornada(
      pacienteId,
      pacienteRow?.jornada_data_inicio ?? null,
    );
    passeLivreIntacto = usados === 0;
  }

  return {
    totalRefeicoesRegistradas: totalRefeicoesRegistradas ?? 0,
    diasConsecutivosAgua,
    streakDias: pacienteRow?.streak_dias ?? 0,
    primeiraAtividade: (totalAtividadeConcluidas ?? 0) > 0,
    totalMissoesConcluidas: totalMissoesConcluidas ?? 0,
    passeLivreIntacto,
  };
}

export interface ConquistaDef {
  categoria: string;
  icone: string;
  titulo: string;
  campo: keyof StatsConquistas;
  threshold: number | boolean;
}

export const CONQUISTAS_DEFS: ConquistaDef[] = [
  {
    categoria: "Alimentação",
    icone: "🥗",
    titulo: "Primeira refeição registrada",
    campo: "totalRefeicoesRegistradas",
    threshold: 1,
  },
  {
    categoria: "Alimentação",
    icone: "🍽️",
    titulo: "20 refeições",
    campo: "totalRefeicoesRegistradas",
    threshold: 20,
  },
  {
    categoria: "Alimentação",
    icone: "🍛",
    titulo: "100 refeições",
    campo: "totalRefeicoesRegistradas",
    threshold: 100,
  },
  {
    categoria: "Alimentação",
    icone: "🥦",
    titulo: "500 refeições",
    campo: "totalRefeicoesRegistradas",
    threshold: 500,
  },

  {
    categoria: "Água",
    icone: "💧",
    titulo: "3 dias seguidos",
    campo: "diasConsecutivosAgua",
    threshold: 3,
  },
  {
    categoria: "Água",
    icone: "🚰",
    titulo: "7 dias seguidos",
    campo: "diasConsecutivosAgua",
    threshold: 7,
  },
  {
    categoria: "Água",
    icone: "🌊",
    titulo: "30 dias seguidos",
    campo: "diasConsecutivosAgua",
    threshold: 30,
  },

  {
    categoria: "Consistência",
    icone: "🔥",
    titulo: "7 dias de streak",
    campo: "streakDias",
    threshold: 7,
  },
  {
    categoria: "Consistência",
    icone: "🔥🔥",
    titulo: "15 dias de streak",
    campo: "streakDias",
    threshold: 15,
  },
  {
    categoria: "Consistência",
    icone: "🐦‍🔥",
    titulo: "30 dias de streak",
    campo: "streakDias",
    threshold: 30,
  },

  {
    categoria: "Exercício",
    icone: "🏃",
    titulo: "Primeira atividade registrada",
    campo: "primeiraAtividade",
    threshold: true,
  },

  {
    categoria: "Missões",
    icone: "⭐",
    titulo: "20 missões concluídas",
    campo: "totalMissoesConcluidas",
    threshold: 20,
  },
  {
    categoria: "Missões",
    icone: "⭐⭐",
    titulo: "100 missões concluídas",
    campo: "totalMissoesConcluidas",
    threshold: 100,
  },
  {
    categoria: "Missões",
    icone: "💫",
    titulo: "300 missões concluídas",
    campo: "totalMissoesConcluidas",
    threshold: 300,
  },
  {
    categoria: "Consistência",
    icone: "🍀",
    titulo: "Jornada sem imprevistos",
    campo: "passeLivreIntacto",
    threshold: true,
  },
];

export function estaDesbloqueada(
  def: ConquistaDef,
  stats: StatsConquistas,
): boolean {
  const valor = stats[def.campo];
  if (typeof def.threshold === "boolean") return !!valor;
  return typeof valor === "number" && valor >= def.threshold;
}

// ── Jornada nutricional ─────────────────────────────────
export interface JornadaInfo {
  definida: boolean;
  semanaAtual: number;
  totalSemanas: number;
  diasRestantes: number;
  progresso: number;
}

export function calcularJornada(
  duracaoDias: number | null,
  dataInicio: string | null,
): JornadaInfo {
  if (!duracaoDias || !dataInicio) {
    return {
      definida: false,
      semanaAtual: 0,
      totalSemanas: 0,
      diasRestantes: 0,
      progresso: 0,
    };
  }

  const hoje = new Date(dataHojeStr() + "T00:00:00Z");
  const inicio = new Date(dataInicio + "T00:00:00Z");
  const diffDias = Math.floor((hoje.getTime() - inicio.getTime()) / 86400000);

  const totalSemanas = Math.ceil(duracaoDias / 7);
  const semanaAtual = Math.min(Math.floor(diffDias / 7) + 1, totalSemanas);
  const diasRestantes = Math.max(0, duracaoDias - diffDias);
  const progresso = Math.min(1, diffDias / duracaoDias);

  return {
    definida: true,
    semanaAtual,
    totalSemanas,
    diasRestantes,
    progresso,
  };
}
