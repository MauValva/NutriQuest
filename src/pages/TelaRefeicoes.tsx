import { useState } from "react";

interface Alimento {
  id: string;
  nome: string;
  porcaoGramas: number;
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
}

interface ItemRegistrado extends Alimento {
  quantidadeGramas: number;
}

const ALIMENTOS: Alimento[] = [
  {
    id: "1",
    nome: "Arroz branco cozido",
    porcaoGramas: 100,
    calorias: 130,
    proteinas: 2.7,
    carboidratos: 28,
    gorduras: 0.3,
  },
  {
    id: "2",
    nome: "Feijão carioca cozido",
    porcaoGramas: 100,
    calorias: 76,
    proteinas: 4.8,
    carboidratos: 13.6,
    gorduras: 0.5,
  },
  {
    id: "3",
    nome: "Peito de frango grelhado",
    porcaoGramas: 100,
    calorias: 165,
    proteinas: 31,
    carboidratos: 0,
    gorduras: 3.6,
  },
  {
    id: "4",
    nome: "Ovo cozido",
    porcaoGramas: 50,
    calorias: 78,
    proteinas: 6,
    carboidratos: 0.6,
    gorduras: 5.3,
  },
  {
    id: "5",
    nome: "Banana prata",
    porcaoGramas: 100,
    calorias: 89,
    proteinas: 1.1,
    carboidratos: 23,
    gorduras: 0.3,
  },
  {
    id: "6",
    nome: "Batata doce cozida",
    porcaoGramas: 100,
    calorias: 86,
    proteinas: 1.6,
    carboidratos: 20,
    gorduras: 0.1,
  },
  {
    id: "7",
    nome: "Maçã",
    porcaoGramas: 100,
    calorias: 52,
    proteinas: 0.3,
    carboidratos: 14,
    gorduras: 0.2,
  },
  {
    id: "8",
    nome: "Leite integral",
    porcaoGramas: 200,
    calorias: 122,
    proteinas: 6.4,
    carboidratos: 9.6,
    gorduras: 6.4,
  },
  {
    id: "9",
    nome: "Pão francês",
    porcaoGramas: 50,
    calorias: 134,
    proteinas: 4.2,
    carboidratos: 27,
    gorduras: 0.8,
  },
  {
    id: "10",
    nome: "Iogurte natural",
    porcaoGramas: 170,
    calorias: 99,
    proteinas: 5.7,
    carboidratos: 7.7,
    gorduras: 5.3,
  },
  {
    id: "11",
    nome: "Brócolis cozido",
    porcaoGramas: 100,
    calorias: 35,
    proteinas: 2.4,
    carboidratos: 7.2,
    gorduras: 0.4,
  },
  {
    id: "12",
    nome: "Salmão grelhado",
    porcaoGramas: 100,
    calorias: 208,
    proteinas: 20,
    carboidratos: 0,
    gorduras: 13,
  },
];

type TipoRefeicao = "cafe" | "almoco" | "jantar" | "lanche";

const REFEICOES: { tipo: TipoRefeicao; icone: string; label: string }[] = [
  { tipo: "cafe", icone: "☀️", label: "Café da Manhã" },
  { tipo: "almoco", icone: "🍽️", label: "Almoço" },
  { tipo: "jantar", icone: "🌙", label: "Jantar" },
  { tipo: "lanche", icone: "🥪", label: "Lanche" },
];

export default function TelaRefeicoes() {
  const [refeicao, setRefeicao] = useState<TipoRefeicao>("almoco");
  const [busca, setBusca] = useState("");
  const [itens, setItens] = useState<ItemRegistrado[]>([]);

  const resultados =
    busca.length > 1
      ? ALIMENTOS.filter((a) =>
          a.nome.toLowerCase().includes(busca.toLowerCase()),
        )
      : [];

  function adicionarAlimento(alimento: Alimento) {
    setItens((prev) => [
      ...prev,
      { ...alimento, quantidadeGramas: alimento.porcaoGramas },
    ]);
    setBusca("");
  }

  function removerItem(index: number) {
    setItens((prev) => prev.filter((_, i) => i !== index));
  }

  function atualizarQuantidade(index: number, gramas: number) {
    setItens((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, quantidadeGramas: gramas } : item,
      ),
    );
  }

  const totais = itens.reduce(
    (acc, item) => {
      const f = item.quantidadeGramas / item.porcaoGramas;
      return {
        calorias: acc.calorias + item.calorias * f,
        proteinas: acc.proteinas + item.proteinas * f,
        carboidratos: acc.carboidratos + item.carboidratos * f,
        gorduras: acc.gorduras + item.gorduras * f,
      };
    },
    { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0 },
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm px-5 pt-12 pb-4">
        <h1 className="text-xl font-bold text-gray-800 mb-4">
          Registrar Refeição 🍽️
        </h1>

        {/* Seletor de refeição */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {REFEICOES.map((r) => (
            <button
              key={r.tipo}
              onClick={() => setRefeicao(r.tipo)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm
                font-medium whitespace-nowrap transition-all
                ${
                  refeicao === r.tipo
                    ? "bg-green-500 text-white shadow-sm"
                    : "bg-gray-100 text-gray-500"
                }`}
            >
              {r.icone} {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resumo de macros */}
      <div className="px-4 pt-4 grid grid-cols-4 gap-2">
        {[
          {
            label: "Kcal",
            valor: Math.round(totais.calorias),
            cor: "text-orange-500",
          },
          {
            label: "Prot",
            valor: Math.round(totais.proteinas) + "g",
            cor: "text-blue-500",
          },
          {
            label: "Carb",
            valor: Math.round(totais.carboidratos) + "g",
            cor: "text-yellow-500",
          },
          {
            label: "Gord",
            valor: Math.round(totais.gorduras) + "g",
            cor: "text-red-400",
          },
        ].map((m) => (
          <div
            key={m.label}
            className="bg-white rounded-2xl p-3 text-center shadow-sm"
          >
            <div className={`text-lg font-bold ${m.cor}`}>{m.valor}</div>
            <div className="text-xs text-gray-400 mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="px-4 mt-4 relative">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="🔍  Buscar alimento..."
          className="w-full bg-white rounded-2xl px-4 py-3 shadow-sm border
            border-gray-200 outline-none focus:border-green-400 text-sm"
        />

        {/* Resultados da busca */}
        {resultados.length > 0 && (
          <div
            className="absolute left-4 right-4 bg-white rounded-2xl shadow-lg
            border border-gray-100 mt-1 z-10 overflow-hidden"
          >
            {resultados.map((a) => (
              <button
                key={a.id}
                onClick={() => adicionarAlimento(a)}
                className="w-full px-4 py-3 text-left hover:bg-green-50
                  border-b border-gray-50 last:border-0 flex justify-between items-center"
              >
                <span className="text-sm font-medium text-gray-700">
                  {a.nome}
                </span>
                <span className="text-xs text-gray-400">{a.calorias} kcal</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista de itens registrados */}
      <div className="px-4 mt-4 space-y-2">
        {itens.length === 0 && (
          <div className="text-center text-gray-300 py-8">
            <p className="text-4xl mb-2">🥗</p>
            <p className="text-sm">Busque e adicione alimentos acima</p>
          </div>
        )}

        {itens.map((item, index) => {
          const f = item.quantidadeGramas / item.porcaoGramas;
          const cal = Math.round(item.calorias * f);
          return (
            <div
              key={index}
              className="bg-white rounded-2xl px-4 py-3 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-gray-800 text-sm">
                    {item.nome}
                  </p>
                  <p className="text-orange-500 text-xs font-bold mt-0.5">
                    {cal} kcal
                  </p>
                </div>
                <button
                  onClick={() => removerItem(index)}
                  className="text-gray-300 hover:text-red-400 text-lg ml-2 transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  value={item.quantidadeGramas}
                  onChange={(e) =>
                    atualizarQuantidade(index, Number(e.target.value))
                  }
                  className="w-20 border border-gray-200 rounded-lg px-2 py-1
                    text-sm text-center outline-none focus:border-green-400"
                />
                <span className="text-xs text-gray-400">gramas</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botão salvar */}
      {itens.length > 0 && (
        <div className="px-4 mt-4">
          <button
            onClick={() => {
              setItens([]);
              alert("Refeição salva! +25 XP 🎉");
            }}
            className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl
              shadow-md active:scale-95 transition-all"
          >
            Salvar Refeição — {Math.round(totais.calorias)} kcal
          </button>
        </div>
      )}
    </div>
  );
}
