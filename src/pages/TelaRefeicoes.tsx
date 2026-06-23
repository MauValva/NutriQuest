import { useState, useEffect } from "react";
import { useApp } from "../contexts/useApp";
import {
  buscarPlanoAlimentar,
  registrarRefeicaoConfirmada,
} from "../services/pacienteService";

import { supabase } from "../lib/supabase";

type TipoRefeicao =
  | "cafe"
  | "almoco"
  | "sobremesa"
  | "lanche"
  | "jantar"
  | "complemento";

interface Alternativa {
  nome: string;
  quantidade: string;
}

interface ItemRefeicao {
  nome: string;
  quantidade: string;
  alternativas?: Alternativa[];
  selecionado?: number;
  observacao?: string;
}

interface OpcaoRefeicao {
  numero: number;
  itens: ItemRefeicao[];
  observacoes?: string;
  concluida?: boolean;
  bloqueada?: boolean;
}

interface RefeicaoPlano {
  tipo: TipoRefeicao;
  horario?: string;
  opcoes: OpcaoRefeicao[];
  observacoes?: string;
}

const TODAS_ABAS: { tipo: TipoRefeicao; icone: string; label: string }[] = [
  { tipo: "cafe", icone: "🌅", label: "Café" },
  { tipo: "almoco", icone: "🍽️", label: "Almoço" },
  { tipo: "lanche", icone: "🥪", label: "Lanche" },
  { tipo: "jantar", icone: "🌙", label: "Jantar" },
  { tipo: "sobremesa", icone: "🍫", label: "Sobremesa" },
  { tipo: "complemento", icone: "➕", label: "Complemento" },
];

// Detecta alternativas no nome do item (separadas por " - ou - " ou " ou ")
function parseItem(nomeCompleto: string): ItemRefeicao {
  const partes = nomeCompleto.split(
    /\s+-\s+ou\s+-\s+|\s+ou\s+|\s+OU\s+|\/|\|/i,
  );

  if (partes.length > 1) {
    return {
      nome: partes[0].trim(),
      quantidade: "",
      alternativas: partes.map((p) => ({
        nome: p.trim(),
        quantidade: "",
      })),
      selecionado: 0,
    };
  }

  return {
    nome: nomeCompleto.trim(),
    quantidade: "",
  };
}

function detectarCategoria(texto: string) {
  const t = texto.toLowerCase();

  if (
    t.includes("frango") ||
    t.includes("carne") ||
    t.includes("peixe") ||
    t.includes("atum") ||
    t.includes("sardinha") ||
    t.includes("ovo")
  ) {
    return {
      titulo: "Proteína",
      icone: "🍗",
    };
  }

  if (
    t.includes("requeijão") ||
    t.includes("ricota") ||
    t.includes("maionese")
  ) {
    return {
      titulo: "Complemento",
      icone: "🧀",
    };
  }

  if (
    t.includes("arroz") ||
    t.includes("batata") ||
    t.includes("wrap") ||
    t.includes("pão")
  ) {
    return {
      titulo: "Carboidrato",
      icone: "🍞",
    };
  }

  if (t.includes("leite") || t.includes("iogurte") || t.includes("whey")) {
    return {
      titulo: "Laticínio",
      icone: "🥛",
    };
  }

  if (t.includes("fruta")) {
    return {
      titulo: "Fruta",
      icone: "🍎",
    };
  }

  return {
    titulo: "Escolha uma opção",
    icone: "✨",
  };
}

function formatarDica(texto: string): { titulo?: string; conteudo: string }[] {
  if (!texto) return [];

  // Divide por ponto final seguido de maiúscula ou por quebra de linha
  const blocos = texto
    .split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ])|(?:\.\s*\n)|(\n)/)
    .filter(Boolean)
    .map((b) => b.trim())
    .filter((b) => b.length > 2);

  return blocos.map((bloco) => {
    // Detecta padrão "Título: conteúdo"
    const match = bloco.match(/^([^:]{3,40}):\s*(.+)$/s);
    if (match) {
      return { titulo: match[1].trim(), conteudo: match[2].trim() };
    }
    return { conteudo: bloco };
  });
}

export default function TelaRefeicoes() {
  const { paciente } = useApp();
  const [abaAtiva, setAbaAtiva] = useState<TipoRefeicao>("cafe");
  const [plano, setPlano] = useState<RefeicaoPlano[]>([]);
  const [abasDisponiveis, setAbasDisponiveis] = useState<
    { tipo: TipoRefeicao; icone: string; label: string }[]
  >([]);
  const [opcaoAberta, setOpcaoAberta] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [dicaAberta, setDicaAberta] = useState<string | null>(null);
  const [sobremesaDisponivel, setSobremesaDisponivel] = useState(true);
  const [sobremesaInfo, setSobremesaInfo] = useState({ usadas: 0, limite: 0 });

  function gerarAbas(plano: RefeicaoPlano[]) {
    return TODAS_ABAS.filter((aba) =>
      plano.some(
        (refeicao) =>
          refeicao.tipo === aba.tipo &&
          refeicao.opcoes?.some((opcao) => opcao.itens?.length > 0),
      ),
    );
  }

  useEffect(() => {
    async function carregar() {
      try {
        const dados = await buscarPlanoAlimentar(paciente.id);
        if (dados.length > 0) {
          const formatado: RefeicaoPlano[] = dados.map(
            (r: Record<string, unknown>) => {
              const opcoes =
                (r.opcoes as Array<{
                  numero: number;
                  itens: Array<{
                    nome: string;
                    quantidade: string;
                    alternativas?: Array<{ nome: string; quantidade: string }>;
                  }>;
                  observacoes?: string;
                }>) ?? [];

              return {
                tipo: r.tipo as TipoRefeicao,
                horario: r.horario as string,
                opcoes: opcoes.map((op, idx) => ({
                  numero: op.numero ?? idx + 1,
                  itens: (op.itens ?? []).map((item) => ({
                    nome: item.nome,
                    quantidade: item.quantidade,
                    observacao: (item as Record<string, unknown>).observacao as
                      | string
                      | undefined,
                    alternativas: item.alternativas?.map((alt) => ({
                      nome: alt.nome,
                      quantidade: alt.quantidade,
                    })),
                    selecionado: item.alternativas ? 0 : undefined,
                  })),
                  observacoes: op.observacoes ?? "",
                  concluida: false,
                  bloqueada: false,
                })),
                observacoes: r.observacoes as string,
              };
            },
          );
          setPlano(formatado);
          setAbasDisponiveis(gerarAbas(formatado));

          const abas = TODAS_ABAS.filter((aba) =>
            formatado.some(
              (refeicao) =>
                refeicao.tipo === aba.tipo &&
                refeicao.opcoes?.some((opcao) => opcao.itens?.length > 0),
            ),
          );

          setAbasDisponiveis(abas);
        } else {
          setPlano(PLANO_EXEMPLO);
          setAbasDisponiveis(gerarAbas(PLANO_EXEMPLO));
        }
      } catch {
        setPlano(PLANO_EXEMPLO);
        setAbasDisponiveis(gerarAbas(PLANO_EXEMPLO));
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

  async function concluirOpcao(opcaoIdx: number) {
    setPlano((prev) =>
      prev.map((r) => {
        if (r.tipo !== abaAtiva) return r;
        return {
          ...r,
          opcoes: r.opcoes.map((op, oi) => ({
            ...op,
            concluida: oi === opcaoIdx ? true : op.concluida,
            bloqueada:
              oi !== opcaoIdx && !op.concluida ? true : (op.bloqueada ?? false),
          })),
        };
      }),
    );
    setOpcaoAberta(null);

    // Salva no Supabase em background
    await registrarRefeicaoConfirmada(paciente.id, abaAtiva, opcaoIdx + 1);

    if (abaAtiva === "sobremesa") {
      await registrarUsoSobremesa(paciente.id);
      const info = await verificarSobremesaDisponivel(paciente.id);
      setSobremesaDisponivel(info.disponivel);
      setSobremesaInfo({ usadas: info.usadas, limite: info.limite });
    }
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
        <div className="grid grid-cols-[repeat(auto-fit,minmax(70px,1fr))] gap-1">
          {abasDisponiveis.map((aba) => (
            <button
              key={aba.tipo}
              onClick={() => {
                if (
                  aba.tipo === "sobremesa" &&
                  !sobremesaDisponivel &&
                  sobremesaInfo.limite > 0
                )
                  return;
                setAbaAtiva(aba.tipo);
                setOpcaoAberta(null);
              }}
              className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl
      text-xs font-medium transition-all relative
      ${
        abaAtiva === aba.tipo
          ? "bg-green-500 text-white shadow-sm"
          : aba.tipo === "sobremesa" &&
              !sobremesaDisponivel &&
              sobremesaInfo.limite > 0
            ? "bg-gray-100 text-gray-300 cursor-not-allowed"
            : "bg-gray-100 text-gray-500"
      }`}
            >
              <span className="text-lg">
                {aba.tipo === "sobremesa" &&
                !sobremesaDisponivel &&
                sobremesaInfo.limite > 0
                  ? "🚫"
                  : aba.icone}
              </span>
              <span>{aba.label}</span>
              {aba.tipo === "sobremesa" && sobremesaInfo.limite > 0 && (
                <span
                  className={`text-xs font-bold
        ${sobremesaDisponivel ? "text-green-600" : "text-gray-400"}`}
                >
                  {sobremesaInfo.usadas}/{sobremesaInfo.limite}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Horário */}
        {refeicaoAtiva && (
          <div className="bg-green-600 text-white rounded-2xl px-5 py-3 mb-4 text-center">
            <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm flex gap-3 items-center">
              <div className="text-4xl">🥦</div>

              <div>
                <p className="font-bold text-gray-800">Monte sua refeição</p>

                <p className="text-sm text-gray-500">
                  Escolha uma opção em cada grupo.
                </p>
              </div>
            </div>
            <p className="font-bold text-lg">
              {abaAtiva === "sobremesa"
                ? "Sobremesa"
                : `${refeicaoAtiva.horario} — ${
                    TODAS_ABAS.find((a) => a.tipo === abaAtiva)?.label
                  }`}
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
                  onClick={() => !opcao.bloqueada && toggleOpcao(opcaoIdx)}
                  className={`w-full flex items-center justify-between px-5 py-4
    ${opcao.bloqueada ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
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
                    {/* ITENS SIMPLES — aparecem primeiro, destaque visual */}
                    {(() => {
                      const simples = opcao.itens.filter(
                        (i) => !i.alternativas,
                      );
                      const comOpcao = opcao.itens.filter(
                        (i) => i.alternativas,
                      );

                      return (
                        <>
                          {/* Itens fixos — sem escolha */}
                          {simples.length > 0 && (
                            <div
                              className="bg-green-50 border border-green-100 rounded-2xl
              px-4 py-3 mb-4"
                            >
                              <p
                                className="text-xs font-bold text-green-600 uppercase
                tracking-wide mb-2"
                              >
                                Inclusos na refeição
                              </p>
                              <div className="space-y-2">
                                {simples.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-3"
                                  >
                                    <span
                                      className="w-5 h-5 rounded-full bg-green-500
                      flex items-center justify-center shrink-0"
                                    >
                                      <span className="text-white text-xs font-bold">
                                        ✓
                                      </span>
                                    </span>
                                    <div>
                                      <p className="text-sm font-semibold text-gray-800">
                                        {item.nome}
                                      </p>
                                      {item.quantidade && (
                                        <p className="text-xs text-gray-400">
                                          {item.quantidade}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Itens com alternativas — escolha do paciente */}
                          {comOpcao.length > 0 && (
                            <div className="space-y-4 mb-4">
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                                Escolha em cada grupo
                              </p>
                              {comOpcao.map((item, itemIdx) => {
                                // Índice real no array original para manter seleção correta
                                const idxReal = opcao.itens.indexOf(item);
                                const cat = detectarCategoria(
                                  item.alternativas![0].nome,
                                );

                                return (
                                  <div key={itemIdx}>
                                    {/* Título da categoria */}
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-lg">
                                        {cat.icone}
                                      </span>
                                      <p className="font-semibold text-sm text-gray-700">
                                        {cat.titulo}
                                      </p>
                                    </div>

                                    {/* Observação do grupo — aparece logo abaixo do título */}
                                    {item.observacao && (
                                      <div className="flex items-start gap-1.5 mb-2 ml-7">
                                        <span className="text-blue-400 text-xs mt-0.5">
                                          ℹ️
                                        </span>
                                        <p className="text-xs text-blue-500 leading-snug">
                                          {item.observacao}
                                        </p>
                                      </div>
                                    )}

                                    {/* Alternativas */}
                                    <div className="grid gap-2 mb-1">
                                      {item.alternativas!.map((alt, altIdx) => {
                                        const selecionado =
                                          item.selecionado === altIdx;
                                        return (
                                          <button
                                            key={altIdx}
                                            onClick={() =>
                                              selecionarAlternativa(
                                                opcaoIdx,
                                                idxReal,
                                                altIdx,
                                              )
                                            }
                                            className={`text-left rounded-2xl border-2 px-4 py-3 transition-all
                ${
                  selecionado
                    ? "border-green-500 bg-green-50"
                    : "border-gray-100 bg-white hover:border-green-200"
                }`}
                                          >
                                            <div className="flex items-center gap-3">
                                              <div
                                                className={`w-6 h-6 rounded-full flex items-center
                  justify-center text-xs font-bold shrink-0
                  ${
                    selecionado
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                                              >
                                                {selecionado ? "✓" : ""}
                                              </div>
                                              <div>
                                                <p
                                                  className={`text-sm font-medium
                    ${selecionado ? "text-green-800" : "text-gray-700"}`}
                                                >
                                                  {alt.nome}
                                                </p>
                                                {alt.quantidade && (
                                                  <p className="text-xs text-gray-400">
                                                    {alt.quantidade}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* Observações */}
                    {opcao.observacoes && (
                      <>
                        {/* Card de dica — clicável para expandir */}
                        <button
                          onClick={() =>
                            setDicaAberta(
                              dicaAberta === `${opcaoIdx}`
                                ? null
                                : `${opcaoIdx}`,
                            )
                          }
                          className="w-full bg-amber-50 border border-amber-200 rounded-xl
        px-3 py-2 mb-4 text-left transition-all hover:bg-amber-100"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">💡</span>
                              <p className="text-xs text-amber-700 font-medium">
                                Dicas desta opção
                              </p>
                            </div>
                            <span className="text-amber-500 text-xs">
                              {dicaAberta === `${opcaoIdx}` ? "∨" : ">"}
                            </span>
                          </div>
                          {/* Preview — só primeira linha */}
                          {dicaAberta !== `${opcaoIdx}` && (
                            <p className="text-xs text-amber-600 mt-1 line-clamp-1 opacity-70">
                              {opcao.observacoes.split("\n")[0].slice(0, 60)}...
                            </p>
                          )}
                        </button>

                        {/* Popup modal com dica completa */}
                        {dicaAberta === `${opcaoIdx}` && (
                          <div
                            className="fixed inset-0 bg-black/40 z-50 flex items-end"
                            onClick={() => setDicaAberta(null)}
                          >
                            <div
                              className="bg-white w-full max-w-107.5 mx-auto rounded-t-3xl
            p-6 max-h-[70vh] overflow-y-auto"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">💡</span>
                                  <h3 className="font-bold text-gray-800">
                                    Dicas desta opção
                                  </h3>
                                </div>
                                <button
                                  onClick={() => setDicaAberta(null)}
                                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center
                justify-center text-gray-500 text-lg"
                                >
                                  ✕
                                </button>
                              </div>

                              {/* Renderiza o texto com formatação */}
                              <div className="space-y-3">
                                {formatarDica(opcao.observacoes).map(
                                  (bloco, i) => (
                                    <div key={i}>
                                      {bloco.titulo ? (
                                        <p className="text-sm text-gray-700 leading-relaxed">
                                          <span className="font-bold text-gray-900">
                                            {bloco.titulo}:
                                          </span>{" "}
                                          {bloco.conteudo}
                                        </p>
                                      ) : (
                                        <p className="text-sm text-gray-700 leading-relaxed">
                                          {bloco.conteudo}
                                        </p>
                                      )}
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
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
async function verificarSobremesaDisponivel(
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
async function registrarUsoSobremesa(pacienteId: string): Promise<void> {
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
