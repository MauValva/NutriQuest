import { useEffect, useState } from "react";
import type { Paciente } from "../../lib/supabase";
import {
  buscarHistoricoPacienteData,
  buscarResumoAdesao,
  type HistoricoItemRefeicao,
  type ResumoAdesao,
} from "../../services/nutricionistaService";

interface Props {
  paciente: Paciente;
  onVoltar: () => void;
}

const ICONES: Record<string, string> = {
  cafe: "🌅",
  almoco: "🍽️",
  lanche: "🥪",
  jantar: "🌙",
  sobremesa: "🍫",
  complemento: "➕",
};

function dataHojeStr(): string {
  return new Date().toISOString().split("T")[0];
}

function formatarDataBr(dataStr: string): string {
  const [ano, mes, dia] = dataStr.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default function AdminHistoricoPaciente({ paciente, onVoltar }: Props) {
  const [data, setData] = useState(dataHojeStr());
  const [historico, setHistorico] = useState<HistoricoItemRefeicao[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [resumo, setResumo] = useState<ResumoAdesao | null>(null);

  useEffect(() => {
    buscarResumoAdesao(paciente).then(setResumo);
  }, [paciente]);

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      const resultado = await buscarHistoricoPacienteData(paciente.id, data);
      setHistorico(resultado);
      setCarregando(false);
    }
    carregar();
  }, [paciente.id, data]);

  const totalPontos = historico.reduce(
    (soma, item) => soma + (item.pontosGanhos ?? 0),
    0,
  );

  function statusInfo(item: HistoricoItemRefeicao) {
    if (!item.feita)
      return { texto: "Não feita", cor: "text-gray-400 bg-gray-50" };
    if (item.tipoConclusao === "completa")
      return { texto: "Completa", cor: "text-green-700 bg-green-50" };
    if (item.tipoConclusao === "parcial")
      return { texto: "Parcial", cor: "text-yellow-700 bg-yellow-50" };
    return { texto: "Fora do plano", cor: "text-orange-700 bg-orange-50" };
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button
          onClick={onVoltar}
          className="text-gray-400 hover:text-gray-600 text-xl"
        >
          ←
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-gray-800">📅 Histórico de refeições</h1>
          <p className="text-xs text-gray-400">{paciente.nome}</p>
        </div>
      </div>

      {resumo && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-3">📊 Resumo geral</h2>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-gray-800">
                {resumo.completas + resumo.parciais + resumo.extras}/
                {resumo.refeicoesEsperadas}
              </p>
              <p className="text-xs text-gray-400">refeições registradas</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-green-600">
                {resumo.percentualAdesao}%
              </p>
              <p className="text-xs text-gray-400">de adesão ao plano</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">
              ✅ {resumo.completas} completas
            </span>
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
              🟡 {resumo.parciais} parciais
            </span>
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-orange-100 text-orange-700">
              📝 {resumo.extras} fora do plano
            </span>
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-500">
              ⬜ {resumo.naoRegistradas} não registradas
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-50 pt-3">
            <span>
              🔥 Streak atual:{" "}
              <span className="font-bold text-gray-600">
                {resumo.streakAtual} dias
              </span>
            </span>
            <span>
              Última refeição:{" "}
              <span className="font-bold text-gray-600">
                {resumo.ultimaRefeicaoData
                  ? formatarDataBr(resumo.ultimaRefeicaoData)
                  : "—"}
              </span>
            </span>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
          <input
            type="date"
            value={data}
            max={dataHojeStr()}
            onChange={(e) => setData(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm flex-1"
          />
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-400">Pontos no dia</p>
            <p className="font-bold text-green-600">{totalPontos}</p>
          </div>
        </div>

        {carregando ? (
          <div className="text-center py-12 text-gray-300">
            <p className="text-4xl mb-2">⏳</p>
            <p className="text-sm">Carregando histórico...</p>
          </div>
        ) : historico.length === 0 ? (
          <div className="text-center py-12 text-gray-300">
            <p className="text-4xl mb-2">🍽️</p>
            <p className="text-sm">Nenhuma refeição cadastrada no plano</p>
          </div>
        ) : (
          <div className="space-y-3">
            {historico.map((item) => {
              const status = statusInfo(item);
              return (
                <div
                  key={item.tipo}
                  className="bg-white rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {ICONES[item.tipo] ?? "🍽️"}
                      </span>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {item.label}
                        </p>
                        <p className="text-xs text-gray-400">
                          {item.horarioPlanejado || "Sem horário fixo"}
                          {item.feita && item.opcaoNumero
                            ? ` · Opção ${item.opcaoNumero}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-full ${status.cor}`}
                      >
                        {status.texto}
                      </span>
                      {item.feita && (
                        <p className="text-xs text-gray-400 mt-1">
                          +{item.pontosGanhos ?? 0} pts
                        </p>
                      )}
                    </div>
                  </div>

                  {item.observacaoPaciente && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-3">
                      <p className="text-xs text-amber-700">
                        💬 {item.observacaoPaciente}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
