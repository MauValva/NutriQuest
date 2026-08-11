import { useEffect, useState } from "react";
import { useApp } from "../contexts/useApp";
import {
  buscarPlanoAlimentar,
  buscarRegistrosPorData,
  dataHojeStr,
} from "../services/pacienteService";
import {
  atualizarStreak,
  calcularHabitos,
  calcularCumprimentoDia,
  corDoDia,
  calcularJornada,
  verificarEConcederPasseLivre,
  passeLivreDisponivel,
  diasProtegidosPorPasse,
  type Habitos,
} from "../services/gamificacaoService";
import {
  garantirMissoesDoDia,
  buscarMissoesDoDia,
} from "../services/missoesService";

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

function formatarDataBr(dataStr: string): string {
  const [ano, mes, dia] = dataStr.split("-");
  return `${dia}/${mes}/${ano}`;
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
  const [calendario, setCalendario] = useState<DiaCalendario[]>([]);
  const [passeDisponivel, setPasseDisponivel] = useState(false);
  const [toastPasse, setToastPasse] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      await garantirMissoesDoDia(paciente.id);
      await verificarEConcederPasseLivre(paciente.id);

      const { streakDias: streakAtualizado, diasProtegidosAgora } =
        await atualizarStreak(paciente.id);
      setStreakDias(streakAtualizado);

      if (diasProtegidosAgora.length > 0) {
        setToastPasse(formatarDataBr(diasProtegidosAgora[0]));
        setTimeout(() => setToastPasse(null), 5000);
      }

      const disponivel = await passeLivreDisponivel(paciente.id);
      setPasseDisponivel(disponivel);

      const hoje = dataHojeStr();

      const [plano, registrosHoje, missoesDoDia, habitosCalc] =
        await Promise.all([
          buscarPlanoAlimentar(paciente.id),
          buscarRegistrosPorData(paciente.id, hoje),
          buscarMissoesDoDia(paciente.id, hoje),
          calcularHabitos(paciente.id),
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
        total: missoesDoDia.length,
        concluidas: missoesDoDia.filter((m) => m.concluida).length,
      });

      setHabitos(habitosCalc);

      const diasProtegidosSet = await diasProtegidosPorPasse(paciente.id);

      const dias: DiaCalendario[] = [];
      for (let i = 6; i >= 0; i--) {
        const dia = addDiasStr(hoje, -i);
        const { percentual, totalPlanejadas } = await calcularCumprimentoDia(
          paciente.id,
          dia,
        );
        let cor: string = corDoDia(totalPlanejadas, percentual);
        if (cor === "vermelho" && diasProtegidosSet.has(dia)) {
          cor = "protegido";
        }
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

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {toastPasse && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50
          bg-green-500 text-white px-5 py-3 rounded-full shadow-lg
          font-bold text-sm text-center max-w-[90vw]"
        >
          🍀 Seu passe livre protegeu sua sequência no dia {toastPasse}!
        </div>
      )}

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

        {/* Calendário */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-3">Últimos 7 dias</h2>
          <div className="flex justify-between">
            {calendario.map((dia) => (
              <div key={dia.data} className="flex flex-col items-center gap-2">
                {dia.cor === "protegido" ? (
                  <div
                    className="w-8 h-8 rounded-full bg-green-50 border-2 border-green-300
                      flex items-center justify-center text-sm"
                    title="Protegido por Passe Livre"
                  >
                    🍀
                  </div>
                ) : (
                  <div
                    className={`w-8 h-8 rounded-full ${CORES_CALENDARIO[dia.cor]}`}
                  />
                )}
                <span className="text-xs text-gray-400">{dia.diaSemana}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
