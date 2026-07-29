import { useState, useEffect } from "react";
import { useApp } from "../contexts/useApp";
import {
  garantirMissoesDoDia,
  buscarMissoesDoDia,
  concluirMissaoDiaria,
  type MissaoDiaria,
} from "../services/missoesService";
import {
  calcularStatsConquistas,
  CONQUISTAS_DEFS,
  estaDesbloqueada,
  type StatsConquistas,
} from "../services/gamificacaoService";

export default function TelaMissoes() {
  const { paciente } = useApp();
  const [missoes, setMissoes] = useState<MissaoDiaria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [celebrando, setCelebrando] = useState(false);
  const [stats, setStats] = useState<StatsConquistas | null>(null);

  useEffect(() => {
    async function carregar() {
      await garantirMissoesDoDia(paciente.id);
      const [lista, statsCalc] = await Promise.all([
        buscarMissoesDoDia(paciente.id),
        calcularStatsConquistas(paciente.id),
      ]);
      setMissoes(lista);
      setStats(statsCalc);
      setCarregando(false);
    }
    carregar();
  }, [paciente.id]);
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
    <div className="min-h-screen bg-gray-50 pb-24">
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

      <div className="px-4 mt-6 pb-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-3">Conquistas</h2>
          {Array.from(new Set(CONQUISTAS_DEFS.map((d) => d.categoria))).map(
            (categoria) => {
              const defs = CONQUISTAS_DEFS.filter(
                (d) => d.categoria === categoria,
              );
              return (
                <div key={categoria} className="mb-4 last:mb-0">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">
                    {categoria}
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    {defs.map((def, i) => {
                      const desbloqueada = stats
                        ? estaDesbloqueada(def, stats)
                        : false;
                      return (
                        <div
                          key={i}
                          className="flex flex-col items-center gap-1 w-16"
                          title={def.titulo}
                        >
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl whitespace-nowrap
    ${
      desbloqueada
        ? "bg-green-50 shadow-sm"
        : "bg-gray-100 grayscale opacity-40"
    }`}
                          >
                            {def.icone}
                          </div>
                          <p
                            className={`text-[10px] text-center leading-tight ${
                              desbloqueada
                                ? "text-gray-700 font-medium"
                                : "text-gray-400"
                            }`}
                          >
                            {def.titulo}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}
