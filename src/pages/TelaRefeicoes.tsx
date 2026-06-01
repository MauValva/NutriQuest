import { useState, useEffect } from "react";
import { useApp } from "../contexts/useApp";
import { buscarPlanoAlimentar } from "../services/pacienteService";

type TipoRefeicao = "cafe" | "almoco" | "jantar" | "lanche";

interface ItemRefeicao {
  nome: string;
  quantidade: string;
  alternativas?: string[];
  selecionado?: number; // índice da alternativa selecionada
}

interface OpcaoRefeicao {
  numero: number;
  itens: ItemRefeicao[];
  observacoes?: string;
  concluida?: boolean;
}

interface RefeicaoPlano {
  tipo: TipoRefeicao;
  horario: string;
  opcoes: OpcaoRefeicao[];
  observacoes?: string;
}

const ABAS: { tipo: TipoRefeicao; icone: string; label: string }[] = [
  { tipo: "cafe", icone: "🌅", label: "Café" },
  { tipo: "almoco", icone: "🍽️", label: "Almoço" },
  { tipo: "jantar", icone: "🌙", label: "Jantar" },
  { tipo: "lanche", icone: "🥪", label: "Lanche" },
];

// Detecta alternativas no nome do item (separadas por " - ou - " ou " ou ")
function parseItem(nomeCompleto: string): ItemRefeicao {
  const partes = nomeCompleto.split(/ - ou - | ou /i);
  if (partes.length > 1) {
    return {
      nome: partes[0].trim(),
      quantidade: "",
      alternativas: partes.map((p) => p.trim()),
      selecionado: 0,
    };
  }
  return { nome: nomeCompleto.trim(), quantidade: "" };
}

export default function TelaRefeicoes() {
  const { paciente } = useApp();
  const [abaAtiva, setAbaAtiva] = useState<TipoRefeicao>("cafe");
  const [plano, setPlano] = useState<RefeicaoPlano[]>([]);
  const [opcaoAberta, setOpcaoAberta] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const dados = await buscarPlanoAlimentar(paciente.id);
        if (dados.length > 0) {
          const formatado: RefeicaoPlano[] = dados.map(
            (r: Record<string, unknown>) => {
              const opcoes = (r.opcoes as OpcaoRefeicao[] | null) ?? [];
              return {
                tipo: r.tipo as TipoRefeicao,
                horario: r.horario as string,
                opcoes: opcoes.map((op, idx) => ({
                  numero: idx + 1,
                  itens: (op.itens ?? []).map((item: ItemRefeicao) =>
                    parseItem(item.nome),
                  ),
                  observacoes: op.observacoes,
                  concluida: false,
                })),
                observacoes: r.observacoes as string,
              };
            },
          );
          setPlano(formatado);
        } else {
          setPlano(PLANO_EXEMPLO);
        }
      } catch {
        setPlano(PLANO_EXEMPLO);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [paciente.id]);

  const refeicaoAtiva = plano.find((r) => r.tipo === abaAtiva);

  function toggleOpcao(index: number) {
    setOpcaoAberta((prev) => (prev === index ? null : index));
  }

  function selecionarAlternativa(
    opcaoIdx: number,
    itemIdx: number,
    altIdx: number,
  ) {
    setPlano((prev) =>
      prev.map((r) => {
        if (r.tipo !== abaAtiva) return r;
        return {
          ...r,
          opcoes: r.opcoes.map((op, oi) => {
            if (oi !== opcaoIdx) return op;
            return {
              ...op,
              itens: op.itens.map((item, ii) => {
                if (ii !== itemIdx) return item;
                return { ...item, selecionado: altIdx };
              }),
            };
          }),
        };
      }),
    );
  }

  function concluirOpcao(opcaoIdx: number) {
    setPlano((prev) =>
      prev.map((r) => {
        if (r.tipo !== abaAtiva) return r;
        return {
          ...r,
          opcoes: r.opcoes.map((op, oi) =>
            oi === opcaoIdx ? { ...op, concluida: true } : op,
          ),
        };
      }),
    );
    setOpcaoAberta(null);
  }

  function opcaoProntoParaConcluir(opcao: OpcaoRefeicao): boolean {
    // Pronto se todos os itens com alternativas têm uma selecionada
    return opcao.itens.every(
      (item) => !item.alternativas || item.selecionado !== undefined,
    );
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-bounce">🥗</div>
          <p className="text-gray-400 text-sm">Carregando seu plano...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm px-5 pt-12 pb-4">
        <h1 className="text-xl font-bold text-gray-800 mb-4">Refeições 🍽️</h1>

        {/* Abas — todas visíveis sem scroll */}
        <div className="grid grid-cols-4 gap-1.5">
          {ABAS.map((aba) => (
            <button
              key={aba.tipo}
              onClick={() => {
                setAbaAtiva(aba.tipo);
                setOpcaoAberta(null);
              }}
              className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl
                text-xs font-medium transition-all
                ${
                  abaAtiva === aba.tipo
                    ? "bg-green-500 text-white shadow-sm"
                    : "bg-gray-100 text-gray-500"
                }`}
            >
              <span className="text-lg">{aba.icone}</span>
              <span>{aba.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Horário */}
        {refeicaoAtiva && (
          <div className="bg-green-600 text-white rounded-2xl px-5 py-3 mb-4 text-center">
            <p className="font-bold text-lg">
              {refeicaoAtiva.horario} —{" "}
              {ABAS.find((a) => a.tipo === abaAtiva)?.label}
            </p>
          </div>
        )}

        {/* Sem plano */}
        {!refeicaoAtiva && (
          <div className="text-center py-12 text-gray-300">
            <p className="text-4xl mb-2">🥗</p>
            <p className="text-sm">
              Nenhuma opção cadastrada para esta refeição
            </p>
          </div>
        )}

        {/* Lista de opções */}
        <div className="space-y-3">
          {refeicaoAtiva?.opcoes.map((opcao, opcaoIdx) => {
            const aberta = opcaoAberta === opcaoIdx;
            const pronta = opcaoProntoParaConcluir(opcao);

            return (
              <div
                key={opcaoIdx}
                className={`bg-white rounded-2xl shadow-sm overflow-hidden
                  border-2 transition-all
                  ${
                    opcao.concluida
                      ? "border-green-400"
                      : aberta
                        ? "border-green-300"
                        : "border-transparent"
                  }`}
              >
                {/* Cabeçalho da opção */}
                <button
                  onClick={() => toggleOpcao(opcaoIdx)}
                  className="w-full flex items-center justify-between px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    {opcao.concluida && (
                      <span
                        className="w-6 h-6 rounded-full bg-green-500
                        flex items-center justify-center text-white text-xs font-bold"
                      >
                        ✓
                      </span>
                    )}
                    <span className="font-semibold text-gray-800">
                      Opção {opcao.numero}
                    </span>
                    {opcao.concluida && (
                      <span className="text-xs text-green-600 font-medium">
                        Feita!
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400 text-lg">
                    {aberta ? "∨" : ">"}
                  </span>
                </button>

                {/* Conteúdo expandido */}
                {aberta && (
                  <div className="px-5 pb-5">
                    <div className="space-y-3 mb-4">
                      {opcao.itens.map((item, itemIdx) => (
                        <div key={itemIdx}>
                          {item.alternativas ? (
                            // Item com alternativas — seleção
                            <div>
                              <p className="text-xs text-gray-400 mb-1.5 font-medium">
                                Escolha uma opção:
                              </p>
                              <div className="space-y-1.5">
                                {item.alternativas.map((alt, altIdx) => (
                                  <button
                                    key={altIdx}
                                    onClick={() =>
                                      selecionarAlternativa(
                                        opcaoIdx,
                                        itemIdx,
                                        altIdx,
                                      )
                                    }
                                    className={`w-full text-left px-3 py-2 rounded-xl
                                      text-sm border-2 transition-all
                                      ${
                                        item.selecionado === altIdx
                                          ? "border-green-500 bg-green-50 text-green-800 font-medium"
                                          : "border-gray-100 bg-gray-50 text-gray-600"
                                      }`}
                                  >
                                    {item.selecionado === altIdx && "✓ "}
                                    {alt}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            // Item simples
                            <div className="flex items-start gap-2">
                              <span className="text-green-500 mt-0.5 flex-shrink-0">
                                •
                              </span>
                              <p className="text-sm text-gray-700">
                                {item.nome}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Observações */}
                    {opcao.observacoes && (
                      <div
                        className="bg-amber-50 border border-amber-200
                        rounded-xl px-3 py-2 mb-4"
                      >
                        <p className="text-xs text-amber-700">
                          💡 {opcao.observacoes}
                        </p>
                      </div>
                    )}

                    {/* Botão Fiz essa! */}
                    <button
                      onClick={() =>
                        pronta && !opcao.concluida && concluirOpcao(opcaoIdx)
                      }
                      disabled={!pronta || opcao.concluida}
                      className={`w-full py-3.5 rounded-xl font-bold text-sm
                        transition-all active:scale-95
                        ${
                          opcao.concluida
                            ? "bg-green-100 text-green-600 cursor-default"
                            : pronta
                              ? "bg-green-500 text-white shadow-md"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        }`}
                    >
                      {opcao.concluida
                        ? "✓ Refeição confirmada!"
                        : pronta
                          ? "Fiz essa! ✅"
                          : "Selecione as opções acima"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Plano exemplo para quando não há dados no banco
const PLANO_EXEMPLO: RefeicaoPlano[] = [
  {
    tipo: "cafe",
    horario: "06:30",
    opcoes: [
      {
        numero: 1,
        itens: [
          parseItem(
            "Leite desnatado (200ml) - ou - Leite em pó desnatado 2 col. sopa (20g)",
          ),
          parseItem("Pão integral - 1 Fat. (25g)"),
          parseItem("Requeijão light (20g) - ou - Creme de ricota light (25g)"),
          parseItem("Queijo muçarela - 1 Fat. (20g)"),
          parseItem("Fruta - 1 Porção"),
        ],
        concluida: false,
      },
      {
        numero: 2,
        itens: [
          parseItem(
            "Leite longa vida desnatado (200ml) - ou - Leite em pó desnatado (20g)",
          ),
          parseItem("Banana - 1 Unid. média (75g)"),
          parseItem("Aveia em flocos finos - 2 Col. de sopa (20g)"),
          parseItem("Whey Protein concentrado - 1.5 Col. de sopa (15g)"),
        ],
        concluida: false,
      },
    ],
  },
  {
    tipo: "almoco",
    horario: "12:30",
    opcoes: [
      {
        numero: 1,
        itens: [
          parseItem(
            "Arroz branco (80g) - ou - Arroz integral (120g) - ou - Batata doce (100g)",
          ),
          parseItem(
            "Peito de frango (100g) - ou - Carne bovina magra (100g) - ou - Filé de peixe (100g)",
          ),
          parseItem("Feijão cozido - 1/2 concha (100g)"),
          parseItem("Salada, verdura, legumes (120g)"),
        ],
        observacoes: "Tempere a salada com vinagre ou limão e sal. Sem azeite.",
        concluida: false,
      },
    ],
  },
  {
    tipo: "lanche",
    horario: "16:30",
    opcoes: [
      {
        numero: 1,
        itens: [
          parseItem("Pão integral - 2 Fat. (50g)"),
          parseItem("Peito de frango (40g) - ou - Sardinha em óleo (40g)"),
          parseItem(
            "Requeijão light (30g) - ou - Creme de ricota light (37g) - ou - Maionese light (22g)",
          ),
          parseItem("Fruta - 1 Porção"),
        ],
        observacoes:
          "Sugestão: Faça um sanduíche com tomate e salada de folhas.",
        concluida: false,
      },
      {
        numero: 2,
        itens: [
          parseItem("Yopro Bebida Láctea 250ml"),
          parseItem("Fruta - 1 Porção"),
          parseItem("Aveia em flocos finos - 2 Col. de sopa (20g)"),
        ],
        concluida: false,
      },
    ],
  },
  {
    tipo: "jantar",
    horario: "19:30",
    opcoes: [
      {
        numero: 1,
        itens: [
          parseItem("Wrap integral - 1 Unid."),
          parseItem(
            "Peito de frango (100g) - ou - Carne bovina (100g) - ou - Atum ao natural",
          ),
          parseItem("Requeijão light (30g) - ou - Creme de ricota light (37g)"),
          parseItem("Salada, verdura, legumes (120g)"),
        ],
        observacoes:
          "Sugestão: Wrap com pastinha de proteína ou pizza de wrap.",
        concluida: false,
      },
    ],
  },
];
