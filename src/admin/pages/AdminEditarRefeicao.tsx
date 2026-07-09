import { useState } from "react";
import type {
  RefeicaoPlano,
  OpcaoRefeicao,
  ItemRefeicao,
} from "./AdminEditarPlano";
import { supabase } from "../../lib/supabase";

interface Props {
  refeicao: RefeicaoPlano;
  onVoltar: () => void;
  onSalvo: (refeicao: RefeicaoPlano) => void;
}

const TIPO_LABELS: Record<string, string> = {
  cafe: "Café da manhã",
  almoco: "Almoço",
  lanche: "Lanche",
  jantar: "Jantar",
  sobremesa: "Sobremesa",
  complemento: "Complemento",
};

const TIPO_ICONES: Record<string, string> = {
  cafe: "🌅",
  almoco: "🍽️",
  lanche: "🥪",
  jantar: "🌙",
  sobremesa: "🍫",
  complemento: "➕",
};

export default function AdminEditarRefeicao({
  refeicao,
  onVoltar,
  onSalvo,
}: Props) {
  const [horario, setHorario] = useState(refeicao.horario);
  const semHorarioFixo = horario === "";
  const [observacoes, setObservacoes] = useState(refeicao.observacoes ?? "");
  const [frequenciaSemanal, setFrequenciaSemanal] = useState(
    refeicao.frequencia_semanal ?? 1,
  );
  // Deep clone para não mutar o original
  const [opcoes, setOpcoes] = useState<OpcaoRefeicao[]>(
    JSON.parse(JSON.stringify(refeicao.opcoes)),
  );
  const [salvando, setSalvando] = useState(false);
  const [opcaoAberta, setOpcaoAberta] = useState<number | null>(0);

  // ── Opções ──────────────────────────────────────────────────────────────

  function adicionarOpcao() {
    const nova: OpcaoRefeicao = {
      numero: opcoes.length + 1,
      itens: [],
      observacoes: "",
    };
    setOpcoes((prev) => [...prev, nova]);
    setOpcaoAberta(opcoes.length);
  }

  function removerOpcao(idx: number) {
    setOpcoes((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((op, i) => ({ ...op, numero: i + 1 })),
    );
    setOpcaoAberta(null);
  }

  function updateOpcaoObservacoes(idx: number, val: string) {
    setOpcoes((prev) =>
      prev.map((op, i) => (i === idx ? { ...op, observacoes: val } : op)),
    );
  }

  // ── Itens ───────────────────────────────────────────────────────────────

  function adicionarItem(opcaoIdx: number) {
    setOpcoes((prev) =>
      prev.map((op, i) =>
        i === opcaoIdx
          ? { ...op, itens: [...op.itens, { nome: "", quantidade: "" }] }
          : op,
      ),
    );
  }

  function removerItem(opcaoIdx: number, itemIdx: number) {
    setOpcoes((prev) =>
      prev.map((op, i) =>
        i === opcaoIdx
          ? { ...op, itens: op.itens.filter((_, ii) => ii !== itemIdx) }
          : op,
      ),
    );
  }

  function updateItem(
    opcaoIdx: number,
    itemIdx: number,
    field: keyof ItemRefeicao,
    val: string,
  ) {
    setOpcoes((prev) =>
      prev.map((op, i) =>
        i === opcaoIdx
          ? {
              ...op,
              itens: op.itens.map((item, ii) =>
                ii === itemIdx ? { ...item, [field]: val } : item,
              ),
            }
          : op,
      ),
    );
  }

  // ── Alternativas ────────────────────────────────────────────────────────

  function ativarAlternativas(opcaoIdx: number, itemIdx: number) {
    setOpcoes((prev) =>
      prev.map((op, i) =>
        i === opcaoIdx
          ? {
              ...op,
              itens: op.itens.map((item, ii) => {
                if (ii !== itemIdx) return item;
                return {
                  ...item,
                  alternativas: [
                    { nome: item.nome, quantidade: item.quantidade },
                    { nome: "", quantidade: "" },
                  ],
                };
              }),
            }
          : op,
      ),
    );
  }

  function adicionarAlternativa(opcaoIdx: number, itemIdx: number) {
    setOpcoes((prev) =>
      prev.map((op, i) =>
        i === opcaoIdx
          ? {
              ...op,
              itens: op.itens.map((item, ii) =>
                ii === itemIdx
                  ? {
                      ...item,
                      alternativas: [
                        ...(item.alternativas ?? []),
                        { nome: "", quantidade: "" },
                      ],
                    }
                  : item,
              ),
            }
          : op,
      ),
    );
  }

  function removerAlternativa(
    opcaoIdx: number,
    itemIdx: number,
    altIdx: number,
  ) {
    setOpcoes((prev) =>
      prev.map((op, i) => {
        if (i !== opcaoIdx) return op;
        return {
          ...op,
          itens: op.itens.map((item, ii) => {
            if (ii !== itemIdx) return item;
            const novas = item.alternativas!.filter((_, ai) => ai !== altIdx);
            if (novas.length <= 1) {
              // Volta a ser item simples
              return {
                nome: novas[0]?.nome ?? item.nome,
                quantidade: novas[0]?.quantidade ?? "",
                observacao: item.observacao,
              };
            }
            return { ...item, alternativas: novas };
          }),
        };
      }),
    );
  }

  function updateAlternativa(
    opcaoIdx: number,
    itemIdx: number,
    altIdx: number,
    field: "nome" | "quantidade",
    val: string,
  ) {
    setOpcoes((prev) =>
      prev.map((op, i) =>
        i === opcaoIdx
          ? {
              ...op,
              itens: op.itens.map((item, ii) =>
                ii === itemIdx
                  ? {
                      ...item,
                      alternativas: item.alternativas!.map((alt, ai) =>
                        ai === altIdx ? { ...alt, [field]: val } : alt,
                      ),
                    }
                  : item,
              ),
            }
          : op,
      ),
    );
  }

  // ── Salvar ──────────────────────────────────────────────────────────────

  async function salvar() {
    setSalvando(true);

    const update: Record<string, unknown> = {
      horario,
      observacoes,
      opcoes,
    };

    if (refeicao.tipo === "sobremesa") {
      update.frequencia_semanal = frequenciaSemanal;
    }

    const { data, error } = await supabase
      .from("refeicoes_plano")
      .update(update)
      .eq("id", refeicao.id)
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("Erro ao salvar");
      setSalvando(false);
      return;
    }

    setSalvando(false);
    onSalvo(data);
  }

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
          <h1 className="font-bold text-gray-800">
            {TIPO_ICONES[refeicao.tipo]} {TIPO_LABELS[refeicao.tipo]}
          </h1>
          <p className="text-xs text-gray-400">Editar refeição</p>
        </div>
        <button
          onClick={salvar}
          disabled={salvando}
          className="bg-green-500 text-white font-bold px-4 py-2 rounded-xl text-sm"
        >
          {salvando ? "..." : "Salvar"}
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Configurações básicas */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-700">Configurações</h2>

          <div>
            <label className="text-xs text-gray-400">Horário</label>

            <label className="flex items-center gap-2 mt-2 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={semHorarioFixo}
                onChange={(e) => setHorario(e.target.checked ? "" : "12:00")}
                className="rounded"
              />
              <span className="text-sm text-gray-600">
                Sem horário fixo — não mostrar horário para o paciente
              </span>
            </label>

            {!semHorarioFixo && (
              <input
                type="time"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 mt-1"
              />
            )}
          </div>

          {refeicao.tipo === "sobremesa" && (
            <div>
              <label className="text-xs text-gray-400">
                Frequência semanal
              </label>
              <input
                type="number"
                min={1}
                max={7}
                value={frequenciaSemanal}
                onChange={(e) => setFrequenciaSemanal(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">
                Quantas vezes por semana o paciente pode comer sobremesa
              </p>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400">
              Observações gerais da refeição
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              placeholder="Observações que aparecem para o paciente..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 mt-1 text-sm resize-none"
            />
          </div>
        </div>

        {/* Opções */}
        <h2 className="font-bold text-gray-700 px-1">
          Opções da refeição
          <span className="text-xs font-normal text-gray-400 ml-2">
            ({opcoes.length} opção{opcoes.length !== 1 ? "ões" : ""})
          </span>
        </h2>

        {opcoes.map((opcao, opcaoIdx) => (
          <div
            key={opcaoIdx}
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            {/* Cabeçalho da opção */}
            <div className="flex items-center px-5 py-4 border-b border-gray-50">
              <button
                onClick={() =>
                  setOpcaoAberta(opcaoAberta === opcaoIdx ? null : opcaoIdx)
                }
                className="flex-1 flex items-center gap-2 text-left"
              >
                <span className="font-bold text-gray-800">
                  Opção {opcao.numero}
                </span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {opcao.itens.length} item
                  {opcao.itens.length !== 1 ? "ns" : ""}
                </span>
                <span className="text-gray-300 ml-auto">
                  {opcaoAberta === opcaoIdx ? "∨" : ">"}
                </span>
              </button>

              {opcoes.length > 1 && (
                <button
                  onClick={() => removerOpcao(opcaoIdx)}
                  className="text-red-400 text-sm ml-3 px-2 py-1 rounded-lg hover:bg-red-50"
                >
                  🗑️
                </button>
              )}
            </div>

            {/* Conteúdo da opção */}
            {opcaoAberta === opcaoIdx && (
              <div className="px-5 pb-5 pt-4 space-y-3">
                {opcao.itens.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">
                    Nenhum item ainda. Adicione abaixo.
                  </p>
                )}

                {opcao.itens.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="bg-gray-50 rounded-xl p-4 space-y-3"
                  >
                    {/* Cabeçalho do item */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">
                        Item {itemIdx + 1}
                        {item.titulo ? ` · "${item.titulo}"` : ""}
                        {item.alternativas
                          ? ` · ${item.alternativas.length} alternativas`
                          : ""}
                      </span>
                      <button
                        onClick={() => removerItem(opcaoIdx, itemIdx)}
                        className="text-xs text-red-400 font-bold px-2 py-0.5 rounded-lg hover:bg-red-50"
                      >
                        remover
                      </button>
                    </div>

                    {item.alternativas ? (
                      /* Item com alternativas */
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-gray-400">
                            Título do grupo (opcional)
                          </label>
                          <input
                            value={item.titulo ?? ""}
                            onChange={(e) =>
                              updateItem(
                                opcaoIdx,
                                itemIdx,
                                "titulo",
                                e.target.value,
                              )
                            }
                            placeholder='Ex: "Suco", "Proteína", "Carboidrato"...'
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-1"
                          />
                        </div>
                        <p className="text-xs text-blue-500 font-bold">
                          Alternativas — paciente escolhe uma:
                        </p>
                        {item.alternativas.map((alt, altIdx) => (
                          <div
                            key={altIdx}
                            className="flex gap-2 items-start bg-white rounded-lg p-2"
                          >
                            <div className="flex-1 space-y-1">
                              <input
                                value={alt.nome}
                                onChange={(e) =>
                                  updateAlternativa(
                                    opcaoIdx,
                                    itemIdx,
                                    altIdx,
                                    "nome",
                                    e.target.value,
                                  )
                                }
                                placeholder={`Alternativa ${altIdx + 1}`}
                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                              />
                              <input
                                value={alt.quantidade}
                                onChange={(e) =>
                                  updateAlternativa(
                                    opcaoIdx,
                                    itemIdx,
                                    altIdx,
                                    "quantidade",
                                    e.target.value,
                                  )
                                }
                                placeholder="Quantidade (ex: 100g)"
                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                              />
                            </div>
                            <button
                              onClick={() =>
                                removerAlternativa(opcaoIdx, itemIdx, altIdx)
                              }
                              className="text-red-400 text-xs mt-1 px-1"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() =>
                            adicionarAlternativa(opcaoIdx, itemIdx)
                          }
                          className="text-xs text-green-600 font-bold"
                        >
                          + nova alternativa
                        </button>
                      </div>
                    ) : (
                      /* Item simples */
                      <div className="space-y-1">
                        <input
                          value={item.nome}
                          onChange={(e) =>
                            updateItem(
                              opcaoIdx,
                              itemIdx,
                              "nome",
                              e.target.value,
                            )
                          }
                          placeholder="Nome do alimento"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                        />
                        <input
                          value={item.quantidade}
                          onChange={(e) =>
                            updateItem(
                              opcaoIdx,
                              itemIdx,
                              "quantidade",
                              e.target.value,
                            )
                          }
                          placeholder="Quantidade (ex: 100g, 2 col. sopa)"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                        />
                        <button
                          onClick={() => ativarAlternativas(opcaoIdx, itemIdx)}
                          className="text-xs text-blue-500 font-bold mt-1"
                        >
                          + adicionar alternativas para este item
                        </button>
                      </div>
                    )}

                    {/* Observação do item */}
                    <input
                      value={item.observacao ?? ""}
                      onChange={(e) =>
                        updateItem(
                          opcaoIdx,
                          itemIdx,
                          "observacao",
                          e.target.value,
                        )
                      }
                      placeholder="Observação do item (opcional)"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                    />
                  </div>
                ))}

                {/* Adicionar item */}
                <button
                  onClick={() => adicionarItem(opcaoIdx)}
                  className="w-full border-2 border-dashed border-gray-200 text-gray-400 font-bold py-2.5 rounded-xl text-sm hover:border-green-300 hover:text-green-500 transition-colors"
                >
                  + Adicionar item
                </button>

                {/* Dicas da opção */}
                <div>
                  <label className="text-xs text-gray-400">
                    💡 Dicas desta opção
                  </label>
                  <textarea
                    value={opcao.observacoes ?? ""}
                    onChange={(e) =>
                      updateOpcaoObservacoes(opcaoIdx, e.target.value)
                    }
                    rows={3}
                    placeholder="Sugestões, dicas de preparo, combinações recomendadas..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 mt-1 text-sm resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Adicionar opção */}
        <button
          onClick={adicionarOpcao}
          className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-2xl hover:bg-gray-200 transition-colors"
        >
          + Adicionar opção
        </button>

        {/* Salvar */}
        <button
          onClick={salvar}
          disabled={salvando}
          className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl"
        >
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}
