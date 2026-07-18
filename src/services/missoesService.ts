import { supabase } from "../lib/supabase";
import { dataHojeStr } from "./pacienteService";

export type TipoMissao = "hidratacao" | "atividade" | "sono";

const TIPOS_MISSAO: TipoMissao[] = ["hidratacao", "atividade", "sono"];

export interface MissaoDiaria {
  id: string;
  tipo: TipoMissao;
  titulo: string;
  descricao: string;
  icone: string;
  concluida: boolean;
}

// Garante que já existe uma missão sorteada para cada tipo, no dia informado
export async function garantirMissoesDoDia(
  pacienteId: string,
  data: string = dataHojeStr(),
): Promise<void> {
  const { data: existentes } = await supabase
    .from("missoes_diarias")
    .select("tipo")
    .eq("paciente_id", pacienteId)
    .eq("data", data);

  const tiposExistentes = new Set((existentes ?? []).map((m) => m.tipo));
  const tiposFaltando = TIPOS_MISSAO.filter((t) => !tiposExistentes.has(t));

  for (const tipo of tiposFaltando) {
    await sortearMissaoDoTipo(pacienteId, tipo, data);
  }
}

async function sortearMissaoDoTipo(
  pacienteId: string,
  tipo: TipoMissao,
  data: string,
): Promise<void> {
  const { data: catalogo } = await supabase
    .from("missoes_catalogo")
    .select("*")
    .eq("tipo", tipo)
    .eq("ativa", true);

  if (!catalogo || catalogo.length === 0) return;

  const { data: ciclo } = await supabase
    .from("missoes_ciclo_sorteio")
    .select("ids_usados")
    .eq("paciente_id", pacienteId)
    .eq("tipo", tipo)
    .maybeSingle();

  let idsUsados: string[] = ciclo?.ids_usados ?? [];
  let candidatos = catalogo.filter((m) => !idsUsados.includes(m.id));

  // Ciclo esgotado — reseta e sorteia de novo com o catálogo inteiro
  if (candidatos.length === 0) {
    idsUsados = [];
    candidatos = catalogo;
  }

  const sorteada = candidatos[Math.floor(Math.random() * candidatos.length)];

  await supabase.from("missoes_diarias").upsert(
    {
      paciente_id: pacienteId,
      data,
      tipo,
      missao_catalogo_id: sorteada.id,
      titulo: sorteada.titulo,
      descricao: sorteada.descricao,
      icone: sorteada.icone,
    },
    { onConflict: "paciente_id,data,tipo", ignoreDuplicates: true },
  );

  await supabase.from("missoes_ciclo_sorteio").upsert(
    {
      paciente_id: pacienteId,
      tipo,
      ids_usados: [...idsUsados, sorteada.id],
    },
    { onConflict: "paciente_id,tipo" },
  );
}

export async function buscarMissoesDoDia(
  pacienteId: string,
  data: string = dataHojeStr(),
): Promise<MissaoDiaria[]> {
  const { data: missoes, error } = await supabase
    .from("missoes_diarias")
    .select("*")
    .eq("paciente_id", pacienteId)
    .eq("data", data);

  if (error || !missoes) return [];

  return missoes.map((m) => ({
    id: m.id,
    tipo: m.tipo,
    titulo: m.titulo,
    descricao: m.descricao ?? "",
    icone: m.icone ?? "🎯",
    concluida: m.concluida,
  }));
}

export async function concluirMissaoDiaria(
  missaoDiariaId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("missoes_diarias")
    .update({ concluida: true, concluida_em: new Date().toISOString() })
    .eq("id", missaoDiariaId);

  return !error;
}
