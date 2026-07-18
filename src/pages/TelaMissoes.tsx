import { useState, useEffect } from "react";
import { useApp } from "../contexts/useApp";
import {
  garantirMissoesDoDia,
  buscarMissoesDoDia,
  concluirMissaoDiaria,
  type MissaoDiaria,
} from "../services/missoesService";

export default function TelaMissoes() {
  const { paciente } = useApp();
  const [missoes, setMissoes] = useState<MissaoDiaria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [celebrando, setCelebrando] = useState(false);

  useEffect(() => {
    async function carregar() {
      await garantirMissoesDoDia(paciente.id);
      const lista = await buscarMissoesDoDia(paciente.id);
      setMissoes(lista);
      setCarregando(false);
    }
    carregar();
  }, [paciente.id]);

  async function concluirMissao(id: string) {
    const missao = missoes.find((m) => m.id === id);
    if (!missao || missao.concluida) return;

    setMissoes((prev) =>
      prev.map((m) => (m.id === id ? { ...m, concluida: true } : m)),
    );
    setCelebrando(true);
    setTimeout(() => setCelebrando(false), 2000);

    await concluirMissaoDiaria(id);
  }

  const concluidas = missoes.filter((m) => m.concluida).length;
  const progresso = missoes.length > 0 ? concluidas / missoes.length : 0;

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-bounce">🥦</div>
          <p className="text-gray-400 text-sm">Carregando suas missões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-green-600 text-white px-5 pt-12 pb-6">
        <h1 className="text-xl font-bold mb-1">Missões de Hoje 🎯</h1>
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

      {celebrando && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg font-bold text-sm animate-bounce">
          🎉 Missão concluída!
        </div>
      )}

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
            </div>
            <button
              onClick={() => concluirMissao(missao.id)}
              disabled={missao.concluida}
              className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all
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

        {missoes.length === 0 && (
          <div className="text-center py-12 text-gray-300">
            <p className="text-4xl mb-2">🎯</p>
            <p className="text-sm">
              Nenhuma missão disponível no catálogo ainda
            </p>
          </div>
        )}
      </div>

      {concluidas === missoes.length && missoes.length > 0 && (
        <div className="mx-4 mt-4 bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
          <p className="text-2xl mb-1">🏆</p>
          <p className="font-bold text-green-700">
            Todas as missões concluídas!
          </p>
        </div>
      )}
    </div>
  );
}
