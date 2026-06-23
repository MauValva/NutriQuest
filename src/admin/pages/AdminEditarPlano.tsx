import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Paciente } from "../../lib/supabase";
import AdminEditarRefeicao from "./AdminEditarRefeicao";

type TipoRefeicao =
  | "cafe"
  | "almoco"
  | "sobremesa"
  | "lanche"
  | "jantar"
  | "complemento";

export interface ItemRefeicao {
  nome: string;
  quantidade: string;
  alternativas?: { nome: string; quantidade: string }[];
  observacao?: string;
}

export interface OpcaoRefeicao {
  numero: number;
  itens: ItemRefeicao[];
  observacoes?: string;
}

export interface RefeicaoPlano {
  id: string;
  paciente_id: string;
  tipo: TipoRefeicao;
  horario: string;
  opcoes: OpcaoRefeicao[];
  observacoes: string;
  frequencia_semanal?: number | null;
}

const TIPOS_REFEICAO: { tipo: TipoRefeicao; icone: string; label: string }[] = [
  { tipo: "cafe", icone: "🌅", label: "Café da manhã" },
  { tipo: "almoco", icone: "🍽️", label: "Almoço" },
  { tipo: "lanche", icone: "🥪", label: "Lanche" },
  { tipo: "jantar", icone: "🌙", label: "Jantar" },
  { tipo: "sobremesa", icone: "🍫", label: "Sobremesa" },
  { tipo: "complemento", icone: "➕", label: "Complemento" },
];

interface Props {
  paciente: Paciente;
  onVoltar: () => void;
}

export default function AdminEditarPlano({ paciente, onVoltar }: Props) {
  const [refeicoes, setRefeicoes] = useState<RefeicaoPlano[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editandoRefeicao, setEditandoRefeicao] =
    useState<RefeicaoPlano | null>(null);
  const [adicionandoTipo, setAdicionandoTipo] = useState(false);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("refeicoes_plano")
      .select("*")
      .eq("paciente_id", paciente.id)
      .order("horario")
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          setCarregando(false);
          return;
        }
        setRefeicoes(data ?? []);
        setCarregando(false);
      });
  }, [paciente.id]);

  async function adicionarRefeicao(tipo: TipoRefeicao) {
    const novaRefeicao = {
      paciente_id: paciente.id,
      tipo,
      horario: "12:00",
      opcoes: [{ numero: 1, itens: [], observacoes: "" }],
      observacoes: "",
      frequencia_semanal: tipo === "sobremesa" ? 1 : null,
    };

    const { data, error } = await supabase
      .from("refeicoes_plano")
      .insert(novaRefeicao)
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("Erro ao adicionar refeição");
      return;
    }

    setRefeicoes((prev) => [...prev, data]);
    setEditandoRefeicao(data);
    setAdicionandoTipo(false);
  }

  async function excluirRefeicao(id: string) {
    setExcluindo(id);

    const { error } = await supabase
      .from("refeicoes_plano")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Erro ao excluir");
      setExcluindo(null);
      return;
    }

    setRefeicoes((prev) => prev.filter((r) => r.id !== id));
    setExcluindo(null);
  }

  if (editandoRefeicao) {
    return (
      <AdminEditarRefeicao
        refeicao={editandoRefeicao}
        onVoltar={() => setEditandoRefeicao(null)}
        onSalvo={(refeicaoAtualizada) => {
          setRefeicoes((prev) =>
            prev.map((r) =>
              r.id === refeicaoAtualizada.id ? refeicaoAtualizada : r,
            ),
          );
          setEditandoRefeicao(null);
        }}
      />
    );
  }

  const tiposExistentes = refeicoes.map((r) => r.tipo);
  const tiposDisponiveis = TIPOS_REFEICAO.filter(
    (t) => !tiposExistentes.includes(t.tipo),
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button
          onClick={onVoltar}
          className="text-gray-400 hover:text-gray-600 text-xl"
        >
          ←
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-gray-800">Plano Alimentar</h1>
          <p className="text-xs text-gray-400">{paciente.nome}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {carregando ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3 animate-bounce">🥗</p>
            <p className="text-gray-400 text-sm">Carregando plano...</p>
          </div>
        ) : (
          <>
            {refeicoes.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                <p className="text-4xl mb-3">🍽️</p>
                <p className="font-bold text-gray-600 mb-1">
                  Nenhuma refeição cadastrada
                </p>
                <p className="text-xs text-gray-400">
                  Adicione as refeições do plano abaixo
                </p>
              </div>
            )}

            {/* Lista de refeições na ordem dos tipos */}
            {TIPOS_REFEICAO.filter((t) => tiposExistentes.includes(t.tipo)).map(
              (tipoInfo) => {
                const refeicao = refeicoes.find(
                  (r) => r.tipo === tipoInfo.tipo,
                )!;
                const isExcluindo = excluindo === refeicao.id;

                return (
                  <div
                    key={tipoInfo.tipo}
                    className="bg-white rounded-2xl p-5 shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-2xl shrink-0">
                        {tipoInfo.icone}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800">
                          {tipoInfo.label}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {refeicao.horario}
                          {" · "}
                          {refeicao.opcoes.length} opção
                          {refeicao.opcoes.length !== 1 ? "ões" : ""}
                          {refeicao.frequencia_semanal
                            ? ` · ${refeicao.frequencia_semanal}x/semana`
                            : ""}
                        </p>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => setEditandoRefeicao(refeicao)}
                          className="bg-green-50 text-green-600 font-bold text-sm px-3 py-2 rounded-xl"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => excluirRefeicao(refeicao.id)}
                          disabled={isExcluindo}
                          className="bg-red-50 text-red-500 font-bold text-sm px-3 py-2 rounded-xl"
                        >
                          {isExcluindo ? "..." : "🗑️"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              },
            )}

            {tiposDisponiveis.length > 0 && (
              <button
                onClick={() => setAdicionandoTipo(true)}
                className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl"
              >
                + Adicionar refeição
              </button>
            )}
          </>
        )}
      </div>

      {/* Modal escolher tipo */}
      {adicionandoTipo && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end z-50"
          onClick={() => setAdicionandoTipo(false)}
        >
          <div
            className="bg-white w-full rounded-t-3xl p-6 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-gray-800 mb-4">
              Qual refeição adicionar?
            </h2>

            {tiposDisponiveis.map((t) => (
              <button
                key={t.tipo}
                onClick={() => adicionarRefeicao(t.tipo)}
                className="w-full flex items-center gap-3 bg-gray-50 hover:bg-green-50 rounded-xl px-4 py-3 transition-colors"
              >
                <span className="text-2xl">{t.icone}</span>
                <span className="font-bold text-gray-700">{t.label}</span>
              </button>
            ))}

            <button
              onClick={() => setAdicionandoTipo(false)}
              className="w-full mt-2 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
