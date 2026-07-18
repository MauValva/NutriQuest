import { useEffect, useState } from "react";
import { useApp } from "../contexts/useApp";
import {
  buscarPlanoAlimentar,
  buscarRegistrosPorData,
  buscarMissoesPaciente,
  buscarRegistrosHoje,
  dataHojeStr,
} from "../services/pacienteService";
import {
  atualizarStreak,
  calcularHabitos,
  calcularCumprimentoDia,
  corDoDia,
  calcularJornada,
  calcularStatsConquistas,
  CONQUISTAS_DEFS,
  estaDesbloqueada,
  verificarEConcederPasseLivre,
  passeLivreDisponivel,
  type Habitos,
  type StatsConquistas,
} from "../services/gamificacaoService";

const LABELS_REFEICAO: Record<string, { label: string; icone: string }> = {
  cafe: { label: "Café", icone: "🌅" },
  almoco: { label: "Almoço", icone: "🍽️" },
  lanche: { label: "Lanche", icone: "🥪" },
  jantar: { label: "Jantar", icone: "🌙" },
  sobremesa: { label: "Sobremesa", icone: "🍫" },
  complemento: { label: "Complemento", icone: "➕" },
};

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

interface RefeicaoHojeStatus {
  tipo: string;
  feita: boolean;
}

interface DiaCalendario {
  data: string;
  cor: string;
  diaSemana: string;
}

function addDiasStr(dataStr: string, dias: number): string {
  const d = new Date(dataStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().split("T")[0];
}

const CORES_CALENDARIO: Record<string, string> = {
  verde: "bg-green-500",
  amarelo: "bg-yellow-400",
  vermelho: "bg-red-400",
  "sem-plano": "bg-gray-200",
};

const HABITOS_CONFIG = [
  { chave: "alimentacao" as const, label: "Alimentação", icone: "🥗" },
  { chave: "agua" as const, label: "Água", icone: "💧" },
  { chave: "exercicio" as const, label: "Exercícios", icone: "🏃" },
  { chave: "sono" as const, label: "Sono", icone: "😴" },
];

export default function TelaProgresso() {
  const { paciente } = useApp();
  const [carregando, setCarregando] = useState(true);
  const [streakDias, setStreakDias] = useState(0);
  const [refeicoesHoje, setRefeicoesHoje] = useState<RefeicaoHojeStatus[]>([]);
  const [missoesHoje, setMissoesHoje] = useState({ total: 0, concluidas: 0 });
  const [habitos, setHabitos] = useState<Habitos>({
    alimentacao: 0,
    agua: 0,
    exercicio: 0,
    sono: 0,
  });
  const [stats, setStats] = useState<StatsConquistas | null>(null);
  const [calendario, setCalendario] = useState<DiaCalendario[]>([]);
  const [passeDisponivel, setPasseDisponivel] = useState(false);

  useEffect(() => {
    async function carregar() {
      await verificarEConcederPasseLivre(paciente.id);

      const { streakDias: streakAtualizado } = await atualizarStreak(
        paciente.id,
      );
      setStreakDias(streakAtualizado);

      const disponivel = await passeLivreDisponivel(paciente.id);
      setPasseDisponivel(disponivel);

      // ... resto do carregamento continua igual

      const hoje = dataHojeStr();

      const [
        plano,
        registrosHoje,
        missoesDB,
        registrosMissoesHoje,
        habitosCalc,
        statsCalc,
      ] = await Promise.all([
        buscarPlanoAlimentar(paciente.id),
        buscarRegistrosPorData(paciente.id, hoje),
        buscarMissoesPaciente(paciente.id),
        buscarRegistrosHoje(paciente.id),
        calcularHabitos(paciente.id),
        calcularStatsConquistas(paciente.id),
      ]);

      const tiposAtivos = (
        plano as Array<{ tipo: string; opcoes: Array<{ itens: unknown[] }> }>
      )
        .filter((r) => r.opcoes?.some((op) => (op.itens?.length ?? 0) > 0))
        .map((r) => r.tipo);

      setRefeicoesHoje(
        tiposAtivos.map((tipo) => ({
          tipo,
          feita: !!registrosHoje[tipo],
        })),
      );

      setMissoesHoje({
        total: missoesDB.length,
        concluidas: missoesDB.filter((m) => registrosMissoesHoje[m.id]).length,
      });

      setHabitos(habitosCalc);
      setStats(statsCalc);

      const dias: { data: string; cor: string; diaSemana: string }[] = [];
      for (let i = 6; i >= 0; i--) {
        const dia = addDiasStr(hoje, -i);
        const { percentual, totalPlanejadas } = await calcularCumprimentoDia(
          paciente.id,
          dia,
        );
        const cor = corDoDia(totalPlanejadas, percentual);
        const diaSemana = DIAS_SEMANA[new Date(dia + "T00:00:00Z").getUTCDay()];
        dias.push({ data: dia, cor, diaSemana });
      }
      setCalendario(dias);

      setCarregando(false);
    }
    carregar();
  }, [paciente.id]);

  const jornada = calcularJornada(
    paciente.jornada_duracao_dias ?? null,
    paciente.jornada_data_inicio ?? null,
  );

  const primeiroNome = paciente.nome.split(" ")[0];

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-bounce">📊</div>
          <p className="text-gray-400 text-sm">Carregando seu progresso...</p>
        </div>
      </div>
    );
  }

  const categorias = Array.from(
    new Set(CONQUISTAS_DEFS.map((d) => d.categoria)),
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-linear-to-b from-green-600 to-green-500 px-5 pt-12 pb-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/30 flex items-center justify-center text-2xl">
            👤
          </div>
          <div className="flex-1">
            <p className="font-bold text-lg">{primeiroNome}</p>
            <p className="text-sm opacity-90">
              🔥 {streakDias} dias de sequência
            </p>
            {passeDisponivel && (
              <p className="text-xs opacity-80 mt-0.5">
                🍀 Passe livre disponível
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 -mt-2 space-y-4">
        {/* Jornada nutricional */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-1">
            🌱 Jornada nutricional
          </h2>
          {jornada.definida ? (
            <>
              <p className="text-sm text-gray-500 mb-2">
                Semana {jornada.semanaAtual} de {jornada.totalSemanas}
              </p>
              <div className="bg-gray-100 rounded-full h-2.5 mb-2">
                <div
                  className="bg-green-500 h-2.5 rounded-full transition-all duration-700"
                  style={{ width: `${jornada.progresso * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">
                {jornada.diasRestantes > 0
                  ? `Consulta em ${jornada.diasRestantes} dias`
                  : "Hora de agendar seu retorno"}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">
              Sua nutricionista ainda vai definir sua jornada.
            </p>
          )}
        </div>

        {/* Hoje */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-3">Hoje</h2>
          <div className="space-y-2">
            {refeicoesHoje.map((r) => (
              <div key={r.tipo} className="flex items-center gap-2 text-sm">
                <span>{r.feita ? "✅" : "⬜"}</span>
                <span className={r.feita ? "text-gray-700" : "text-gray-400"}>
                  {LABELS_REFEICAO[r.tipo]?.icone}{" "}
                  {LABELS_REFEICAO[r.tipo]?.label ?? r.tipo}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 text-sm">
              <span>
                {missoesHoje.total > 0 &&
                missoesHoje.concluidas === missoesHoje.total
                  ? "✅"
                  : "⬜"}
              </span>
              <span
                className={
                  missoesHoje.concluidas === missoesHoje.total &&
                  missoesHoje.total > 0
                    ? "text-gray-700"
                    : "text-gray-400"
                }
              >
                🎯 Missões ({missoesHoje.concluidas}/{missoesHoje.total})
              </span>
            </div>
          </div>
        </div>

        {/* Hábitos */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-3">Hábitos</h2>
          <div className="space-y-3">
            {HABITOS_CONFIG.map((h) => (
              <div key={h.chave}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">
                    {h.icone} {h.label}
                  </span>
                  <span className="font-bold text-gray-700">
                    {habitos[h.chave]}%
                  </span>
                </div>
                <div className="bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-700"
                    style={{ width: `${habitos[h.chave]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conquistas */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-3">Conquistas</h2>
          {categorias.map((categoria) => {
            const defs = CONQUISTAS_DEFS.filter(
              (d) => d.categoria === categoria,
            );
            return (
              <div key={categoria} className="mb-4 last:mb-0">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">
                  {categoria}
                </p>
                <div className="flex gap-3">
                  {defs.map((def, i) => {
                    const desbloqueada = stats
                      ? estaDesbloqueada(def, stats)
                      : false;
                    return (
                      <div
                        key={i}
                        className="flex flex-col items-center gap-1 flex-1"
                        title={def.titulo}
                      >
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl
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
          })}
        </div>

        {/* Calendário */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-3">Últimos 7 dias</h2>
          <div className="flex justify-between">
            {calendario.map((dia) => (
              <div key={dia.data} className="flex flex-col items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full ${CORES_CALENDARIO[dia.cor]}`}
                />
                <span className="text-xs text-gray-400">{dia.diaSemana}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
