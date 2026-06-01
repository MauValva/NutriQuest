import { useState, useEffect } from "react";
import { useApp } from "../contexts/useApp";
import { type Missao } from "../types";
import { salvarMissoesDoDia, carregarMissoesDoDia } from "../utils/storage";
import {
  buscarMissoesPaciente,
  buscarRegistrosHoje,
  concluirMissaoDB,
} from "../services/pacienteService";

const MISSOES_PADRAO: Missao[] = [
  {
    id: "p1",
    icone: "💧",
    tipo: "hidratacao",
    xpRecompensa: 15,
    concluida: false,
    titulo: "Beber água ao acordar",
    descricao: "Beba um copo cheio de água antes do café da manhã",
  },
  {
    id: "p2",
    icone: "🥗",
    tipo: "alimentacao",
    xpRecompensa: 20,
    concluida: false,
    titulo: "Seguir o plano hoje",
    descricao: "Faça pelo menos uma refeição conforme o seu plano alimentar",
  },
  {
    id: "p3",
    icone: "🥤",
    tipo: "hidratacao",
    xpRecompensa: 25,
    concluida: false,
    titulo: "Meta de hidratação",
    descricao: "Complete o consumo mínimo de 2,5L de água hoje",
  },
];

export default function TelaMissoes() {
  const { xpTotal, ganharXP, paciente } = useApp();
  const [missoes, setMissoes] = useState<Missao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [celebrando, setCelebrando] = useState(false);
  const [ultimoXP, setUltimoXP] = useState(0);

  useEffect(() => {
    async function carregar() {
      try {
        // Tenta carregar missões reais do Supabase
        const missoesDB = await buscarMissoesPaciente(paciente.id);
        const registros = await buscarRegistrosHoje(paciente.id);

        if (missoesDB.length > 0) {
          const missoesFormatadas: Missao[] = missoesDB.map((m) => ({
            id: m.id,
            titulo: m.titulo,
            descricao: m.descricao ?? "",
            tipo: m.tipo,
            icone: m.icone,
            xpRecompensa: m.xp_recompensa,
            concluida: registros[m.id] ?? false,
          }));

          // Garante mínimo de 3 missões
          if (missoesFormatadas.length < 3) {
            const faltam = MISSOES_PADRAO.slice(missoesFormatadas.length);
            missoesFormatadas.push(...faltam);
          }

          setMissoes(missoesFormatadas);
          salvarMissoesDoDia(missoesFormatadas);
        } else {
          // Fallback para missões salvas localmente ou padrão
          setMissoes(carregarMissoesDoDia(MISSOES_PADRAO));
        }
      } catch {
        setMissoes(carregarMissoesDoDia(MISSOES_PADRAO));
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [paciente.id]);

  useEffect(() => {
    if (!carregando) salvarMissoesDoDia(missoes);
  }, [missoes, carregando]);

  async function concluirMissao(id: string) {
    const missao = missoes.find((m) => m.id === id);
    if (!missao || missao.concluida) return;

    setMissoes((prev) =>
      prev.map((m) => (m.id === id ? { ...m, concluida: true } : m)),
    );
    ganharXP(missao.xpRecompensa);
    setUltimoXP(missao.xpRecompensa);
    setCelebrando(true);
    setTimeout(() => setCelebrando(false), 2000);

    // Salva no Supabase em background
    await concluirMissaoDB(paciente.id, id, missao.xpRecompensa);
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

      {celebrando && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50
          bg-green-500 text-white px-6 py-3 rounded-full shadow-lg
          font-bold text-sm animate-bounce"
        >
          🎉 +{ultimoXP} XP ganhos!
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

      {concluidas === missoes.length && missoes.length > 0 && (
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
