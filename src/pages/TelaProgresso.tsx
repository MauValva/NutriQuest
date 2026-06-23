import { useApp } from "../contexts/useApp";

interface Conquista {
  id: string;
  icone: string;
  titulo: string;
  descricao: string;
  desbloqueada: boolean;
  xpNecessario: number;
}

const CONQUISTAS: Conquista[] = [
  {
    id: "1",
    icone: "💧",
    titulo: "Hidratado",
    descricao: "Concluiu 1 missão de água",
    desbloqueada: true,
    xpNecessario: 0,
  },
  {
    id: "2",
    icone: "🥗",
    titulo: "Come Bem",
    descricao: "Registrou 3 refeições",
    desbloqueada: true,
    xpNecessario: 0,
  },
  {
    id: "3",
    icone: "🔥",
    titulo: "Em Chamas",
    descricao: "5 dias seguidos no app",
    desbloqueada: true,
    xpNecessario: 0,
  },
  {
    id: "4",
    icone: "⭐",
    titulo: "Estrela",
    descricao: "Acumulou 100 XP",
    desbloqueada: true,
    xpNecessario: 100,
  },
  {
    id: "5",
    icone: "🏆",
    titulo: "Campeão",
    descricao: "Acumulou 500 XP",
    desbloqueada: false,
    xpNecessario: 500,
  },
  {
    id: "6",
    icone: "💎",
    titulo: "Diamante",
    descricao: "Acumulou 1000 XP",
    desbloqueada: false,
    xpNecessario: 1000,
  },
  {
    id: "7",
    icone: "🥦",
    titulo: "Nutri Expert",
    descricao: "30 dias seguidos no app",
    desbloqueada: false,
    xpNecessario: 0,
  },
  {
    id: "8",
    icone: "🎯",
    titulo: "Missão Completa",
    descricao: "Concluiu todas as missões do dia",
    desbloqueada: false,
    xpNecessario: 0,
  },
];

const NIVEIS = [
  { nivel: 1, nome: "Iniciante", cor: "text-gray-500", bg: "bg-gray-100" },
  { nivel: 2, nome: "Aprendiz", cor: "text-green-600", bg: "bg-green-100" },
  { nivel: 3, nome: "Praticante", cor: "text-blue-600", bg: "bg-blue-100" },
  { nivel: 4, nome: "Dedicado", cor: "text-purple-600", bg: "bg-purple-100" },
  { nivel: 5, nome: "Expert", cor: "text-yellow-600", bg: "bg-yellow-100" },
];

export default function TelaProgresso() {
  const { xpTotal, nivel, streakDias, nomeUsuario } = useApp();

  const xpNoNivel = xpTotal % 200;
  const progressoNivel = xpNoNivel / 200;
  const xpParaProximo = 200 - xpNoNivel;
  const nivelInfo = NIVEIS[Math.min(nivel - 1, NIVEIS.length - 1)];
  const conquistasDesbloqueadas = CONQUISTAS.filter(
    (c) => c.desbloqueada,
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-linear-to-b from-green-600 to-green-500 px-5 pt-12 pb-8 text-white">
        <h1 className="text-xl font-bold mb-4">Meu Progresso 📊</h1>

        {/* Card do usuário */}
        <div className="bg-white/20 rounded-3xl p-4 backdrop-blur">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full bg-white/30 flex items-center
              justify-center text-3xl"
            >
              👤
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg">{nomeUsuario}</p>
              <div
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                text-xs font-bold bg-white/20`}
              >
                {nivelInfo?.nome ?? "Iniciante"}
              </div>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{streakDias}</p>
              <p className="text-xs opacity-80">🔥 dias</p>
            </div>
          </div>

          {/* Barra de nível */}
          <div className="mt-4">
            <div className="flex justify-between text-xs opacity-80 mb-1">
              <span>Nível {nivel}</span>
              <span>
                {xpNoNivel}/200 XP — faltam {xpParaProximo} XP
              </span>
            </div>
            <div className="bg-white/20 rounded-full h-3">
              <div
                className="bg-yellow-400 h-3 rounded-full transition-all duration-700"
                style={{ width: `${progressoNivel * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="px-4 -mt-4 grid grid-cols-3 gap-3">
        {[
          { icone: "⭐", valor: xpTotal, label: "XP Total" },
          { icone: "🔥", valor: streakDias, label: "Dias Streak" },
          { icone: "🏅", valor: conquistasDesbloqueadas, label: "Conquistas" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-3 text-center shadow-sm"
          >
            <p className="text-2xl">{stat.icone}</p>
            <p className="text-xl font-bold text-gray-800 mt-1">{stat.valor}</p>
            <p className="text-xs text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Conquistas */}
      <div className="px-4 mt-6">
        <h2 className="font-bold text-gray-800 mb-3">
          Conquistas 🏆
          <span className="text-sm font-normal text-gray-400 ml-2">
            {conquistasDesbloqueadas}/{CONQUISTAS.length}
          </span>
        </h2>

        <div className="grid grid-cols-4 gap-3">
          {CONQUISTAS.map((c) => (
            <div key={c.id} className="flex flex-col items-center gap-1">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center
                text-2xl shadow-sm transition-all
                ${
                  c.desbloqueada
                    ? "bg-white shadow-md scale-105"
                    : "bg-gray-100 grayscale opacity-40"
                }`}
              >
                {c.icone}
              </div>
              <p
                className={`text-xs text-center leading-tight font-medium
                ${c.desbloqueada ? "text-gray-700" : "text-gray-400"}`}
              >
                {c.titulo}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Histórico semanal */}
      <div className="px-4 mt-6">
        <h2 className="font-bold text-gray-800 mb-3">Semana Atual 📅</h2>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between">
            {["S", "T", "Q", "Q", "S", "S", "D"].map((dia, i) => {
              const ativo = i < 5;
              const hoje = i === 4;
              return (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center
                    justify-center text-sm font-bold transition-all
                    ${
                      hoje
                        ? "bg-green-500 text-white ring-2 ring-green-300"
                        : ativo
                          ? "bg-green-100 text-green-600"
                          : "bg-gray-100 text-gray-300"
                    }`}
                  >
                    {ativo ? "✓" : ""}
                  </div>
                  <span
                    className={`text-xs font-medium
                    ${hoje ? "text-green-600" : "text-gray-400"}`}
                  >
                    {dia}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
