import { useState, useEffect } from "react";
import { useApp } from "../contexts/AppContext";
import { type Missao } from "../types";
import { salvarMissoesDoDia, carregarMissoesDoDia } from "../utils/storage";

const MISSOES_PADRAO: Missao[] = [
  {
    id: "1",
    icone: "💧",
    tipo: "hidratacao",
    xpRecompensa: 15,
    concluida: false,
    titulo: "Hidratação Matinal",
    descricao: "Beba 2 copos de água ao acordar",
  },
  {
    id: "2",
    icone: "🥣",
    tipo: "alimentacao",
    xpRecompensa: 25,
    concluida: false,
    titulo: "Café Nutritivo",
    descricao: "Inclua proteína no café da manhã",
  },
  {
    id: "3",
    icone: "🍎",
    tipo: "alimentacao",
    xpRecompensa: 20,
    concluida: false,
    titulo: "Frutas do Dia",
    descricao: "Consuma 3 porções de frutas",
  },
  {
    id: "4",
    icone: "🥤",
    tipo: "hidratacao",
    xpRecompensa: 30,
    concluida: false,
    titulo: "Meta de Água",
    descricao: "Complete os 8 copos de água diários",
  },
  {
    id: "5",
    icone: "🥗",
    tipo: "alimentacao",
    xpRecompensa: 25,
    concluida: false,
    titulo: "Almoço Equilibrado",
    descricao: "Metade do prato com vegetais",
  },
];

export default function TelaMissoes() {
  const [missoes, setMissoes] = useState<Missao[]>(() =>
    carregarMissoesDoDia(MISSOES_PADRAO),
  );
  const [celebrando, setCelebrando] = useState(false);
  const [ultimoXP, setUltimoXP] = useState(0);
  const { xpTotal, ganharXP } = useApp();

  const concluidas = missoes.filter((m) => m.concluida).length;
  const progresso = concluidas / missoes.length;

  // Salva automaticamente sempre que missões mudarem
  useEffect(() => {
    salvarMissoesDoDia(missoes);
  }, [missoes]);

  function concluirMissao(id: string) {
    const missao = missoes.find((m) => m.id === id);
    if (!missao || missao.concluida) return;

    setMissoes((prev) =>
      prev.map((m) => (m.id === id ? { ...m, concluida: true } : m)),
    );
    ganharXP(missao.xpRecompensa);
    setUltimoXP(missao.xpRecompensa);
    setCelebrando(true);
    setTimeout(() => setCelebrando(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-green-600 text-white px-5 pt-12 pb-6">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-xl font-bold">Missões de Hoje 🎯</h1>
          <span className="bg-green-500 px-3 py-1 rounded-full text-sm font-bold">
            ⭐ {xpTotal} XP
          </span>
        </div>
        <p className="text-green-100 text-sm mb-3">
          {concluidas} de {missoes.length} missões concluídas
        </p>
        <div className="bg-green-700 rounded-full h-2.5">
          <div
            className="bg-yellow-400 h-2.5 rounded-full transition-all duration-700"
            style={{ width: `${progresso * 100}%` }}
          />
        </div>
      </div>

      {/* Toast */}
      {celebrando && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50
          bg-green-500 text-white px-6 py-3 rounded-full shadow-lg
          font-bold text-sm animate-bounce"
        >
          🎉 +{ultimoXP} XP ganhos!
        </div>
      )}

      {/* Lista */}
      <div className="px-4 pt-4 space-y-3">
        {missoes.map((missao) => (
          <div
            key={missao.id}
            className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 flex items-center gap-4
              ${missao.concluida ? "border-green-300 opacity-60" : "border-green-500"}`}
          >
            <span className="text-3xl">{missao.icone}</span>
            <div className="flex-1">
              <h3
                className={`font-semibold text-gray-800 ${missao.concluida ? "line-through" : ""}`}
              >
                {missao.titulo}
              </h3>
              <p className="text-gray-400 text-xs mt-0.5">{missao.descricao}</p>
              <span className="text-green-600 text-xs font-bold mt-1 block">
                +{missao.xpRecompensa} XP
              </span>
            </div>
            <button
              onClick={() => concluirMissao(missao.id)}
              disabled={missao.concluida}
              className={`w-9 h-9 rounded-full border-2 flex items-center justify-center
                font-bold text-sm transition-all
                ${
                  missao.concluida
                    ? "bg-green-500 border-green-500 text-white"
                    : "border-gray-300 hover:border-green-400 active:scale-95"
                }`}
            >
              {missao.concluida ? "✓" : ""}
            </button>
          </div>
        ))}
      </div>

      {concluidas === missoes.length && (
        <div className="mx-4 mt-4 bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
          <p className="text-2xl mb-1">🏆</p>
          <p className="font-bold text-green-700">
            Todas as missões concluídas!
          </p>
          <p className="text-green-600 text-sm">
            Incrível! Você tem {xpTotal} XP no total!
          </p>
        </div>
      )}
    </div>
  );
}
