import { useState } from "react";
import type { Paciente } from "../../lib/supabase";
import {
  extrairTextoPDF,
  extrairDadosAnamnese,
  gerarMissoesSugeridas,
  extrairRefeicoes,
} from "../../services/pdfService";
import {
  salvarMissoes,
  atualizarMissao,
  deletarMissao,
  salvarPlanoAlimentar,
} from "../../services/nutricionistaService";

interface MissaoSugerida {
  paciente_id: string;
  titulo: string;
  descricao: string;
  tipo: "hidratacao" | "alimentacao" | "atividade" | "educacional";
  icone: string;
  xp_recompensa: number;
  prioridade: number;
  aprovada_nutri: boolean;
  ativa: boolean;
  id?: string;
}

interface DadosAnamnese {
  nome: string;
  peso: number;
  altura: number;
  objetivo: "emagrecer" | "manter" | "ganhar";
  dificuldades: {
    agua: boolean;
    refeicoes: boolean;
    tempo: boolean;
    atividade: boolean;
  };
  alimento_favorito: string;
  nao_come: string;
  atividade_fisica: string;
  ingestao_agua: string;
  texto_completo: string;
}

interface Props {
  paciente: Paciente;
  onVoltar: () => void;
}

type Etapa = "inicio" | "processando" | "revisao" | "salvo";

const TIPO_LABEL: Record<string, { label: string; cor: string }> = {
  hidratacao: { label: "Hidratação", cor: "bg-blue-100 text-blue-700" },
  alimentacao: { label: "Alimentação", cor: "bg-green-100 text-green-700" },
  atividade: { label: "Atividade", cor: "bg-orange-100 text-orange-700" },
  educacional: { label: "Educacional", cor: "bg-purple-100 text-purple-700" },
};

export default function AdminPaciente({ paciente, onVoltar }: Props) {
  const [etapa, setEtapa] = useState<Etapa>("inicio");
  const [missoes, setMissoes] = useState<MissaoSugerida[]>([]);
  const [dadosExtraidos, setDadosExtraidos] = useState<DadosAnamnese | null>(
    null,
  );
  const [arquivoAnamnese, setArquivoAnamnese] = useState<File | null>(null);
  const [arquivoPlano, setArquivoPlano] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function processarPDFs() {
    if (!arquivoAnamnese && !arquivoPlano) {
      setErro("Selecione pelo menos um PDF");
      return;
    }
    setErro("");
    setEtapa("processando");

    try {
      let dadosAnamnese: DadosAnamnese | null = null;

      if (arquivoAnamnese) {
        const texto = await extrairTextoPDF(arquivoAnamnese);
        dadosAnamnese = extrairDadosAnamnese(texto) as DadosAnamnese;
        setDadosExtraidos(dadosAnamnese);
      }

      if (arquivoPlano) {
        const texto = await extrairTextoPDF(arquivoPlano);
        const refeicoes = extrairRefeicoes(texto);
        if (refeicoes.length > 0) {
          await salvarPlanoAlimentar(paciente.id, refeicoes);
        }
      }

      if (dadosAnamnese) {
        const sugeridas = gerarMissoesSugeridas(
          paciente.id,
          dadosAnamnese,
        ) as MissaoSugerida[];
        await salvarMissoes(sugeridas);
        setMissoes(sugeridas);
      }

      setEtapa("revisao");
    } catch (e) {
      console.error(e);
      setErro("Erro ao processar PDF. Tente novamente.");
      setEtapa("inicio");
    }
  }

  function aprovarMissao(index: number) {
    setMissoes((prev) =>
      prev.map((m, i) => (i === index ? { ...m, aprovada_nutri: true } : m)),
    );
  }

  function reprovarMissao(index: number) {
    setMissoes((prev) =>
      prev.map((m, i) => (i === index ? { ...m, aprovada_nutri: false } : m)),
    );
  }

  function removerMissao(index: number) {
    setMissoes((prev) => prev.filter((_, i) => i !== index));
  }

  async function salvarAprovadas() {
    setSalvando(true);

    for (const missao of missoes) {
      if (missao.id) {
        if (missao.aprovada_nutri) {
          await atualizarMissao(missao.id, { aprovada_nutri: true });
        } else {
          await deletarMissao(missao.id);
        }
      }
    }

    setSalvando(false);
    setEtapa("salvo");
  }

  const aprovadas = missoes.filter((m) => m.aprovada_nutri).length;
  const primeiroNome = paciente.nome.split(" ")[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-6 py-4 flex items-center gap-4">
        <button
          onClick={onVoltar}
          className="text-gray-400 hover:text-gray-600 text-xl"
        >
          ←
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-gray-800">{paciente.nome}</h1>
          <p className="text-xs text-gray-400">{paciente.email}</p>
        </div>
        <div
          className="w-10 h-10 rounded-full bg-green-100
          flex items-center justify-center font-bold text-green-600"
        >
          {paciente.nome.charAt(0)}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* UPLOAD */}
        {etapa === "inicio" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-gray-700 mb-1">
                📄 Upload dos PDFs de {primeiroNome}
              </h2>
              <p className="text-xs text-gray-400 mb-5">
                Exporte do Webdiet e faça o upload aqui. O sistema vai ler e
                sugerir missões personalizadas.
              </p>

              <div className="space-y-3">
                <label
                  className={`block border-2 border-dashed rounded-2xl p-5
                  text-center cursor-pointer transition-all
                  ${
                    arquivoAnamnese
                      ? "border-green-400 bg-green-50"
                      : "border-gray-200 hover:border-green-300"
                  }`}
                >
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) =>
                      setArquivoAnamnese(e.target.files?.[0] ?? null)
                    }
                  />
                  <p className="text-2xl mb-2">
                    {arquivoAnamnese ? "✅" : "📋"}
                  </p>
                  <p className="font-medium text-sm text-gray-700">
                    {arquivoAnamnese ? arquivoAnamnese.name : "Anamnese (PDF)"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {arquivoAnamnese
                      ? "Clique para trocar"
                      : "Clique para selecionar"}
                  </p>
                </label>

                <label
                  className={`block border-2 border-dashed rounded-2xl p-5
                  text-center cursor-pointer transition-all
                  ${
                    arquivoPlano
                      ? "border-green-400 bg-green-50"
                      : "border-gray-200 hover:border-green-300"
                  }`}
                >
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) =>
                      setArquivoPlano(e.target.files?.[0] ?? null)
                    }
                  />
                  <p className="text-2xl mb-2">{arquivoPlano ? "✅" : "🥗"}</p>
                  <p className="font-medium text-sm text-gray-700">
                    {arquivoPlano ? arquivoPlano.name : "Plano Alimentar (PDF)"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {arquivoPlano
                      ? "Clique para trocar"
                      : "Clique para selecionar"}
                  </p>
                </label>
              </div>

              {erro && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-red-600 text-sm text-center">{erro}</p>
                </div>
              )}
            </div>

            <button
              onClick={processarPDFs}
              disabled={!arquivoAnamnese && !arquivoPlano}
              className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl
                shadow-md active:scale-95 transition-all disabled:opacity-40"
            >
              🤖 Ler PDFs e gerar missões
            </button>
          </div>
        )}

        {/* PROCESSANDO */}
        {etapa === "processando" && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 animate-bounce">🤖</div>
            <h2 className="font-bold text-gray-700 text-lg mb-2">
              Lendo os PDFs...
            </h2>
            <p className="text-gray-400 text-sm">
              Extraindo dados e gerando missões personalizadas
            </p>
          </div>
        )}

        {/* REVISÃO */}
        {etapa === "revisao" && (
          <div className="space-y-4">
            {/* Dados extraídos */}
            {dadosExtraidos && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h2 className="font-bold text-gray-700 mb-3">
                  ✅ Dados extraídos da Anamnese
                </h2>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {dadosExtraidos.peso > 0 && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Peso</p>
                      <p className="font-bold">{dadosExtraidos.peso} kg</p>
                    </div>
                  )}
                  {dadosExtraidos.altura > 0 && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Altura</p>
                      <p className="font-bold">{dadosExtraidos.altura} m</p>
                    </div>
                  )}
                  {dadosExtraidos.objetivo && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Objetivo</p>
                      <p className="font-bold capitalize">
                        {dadosExtraidos.objetivo}
                      </p>
                    </div>
                  )}
                  {dadosExtraidos.atividade_fisica && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Atividade física</p>
                      <p className="font-bold text-xs">
                        {dadosExtraidos.atividade_fisica}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-2">
                    Dificuldades detectadas:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {dadosExtraidos.dificuldades.agua && (
                      <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full">
                        💧 Hidratação insuficiente
                      </span>
                    )}
                    {dadosExtraidos.dificuldades.refeicoes && (
                      <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full">
                        🍽️ Regularidade nas refeições
                      </span>
                    )}
                    {dadosExtraidos.dificuldades.tempo && (
                      <span className="bg-orange-100 text-orange-700 text-xs px-3 py-1 rounded-full">
                        ⏰ Falta de tempo
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Missões */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-gray-700 mb-1">
                🎯 Missões sugeridas — revise e aprove
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Aprovadas pelo sistema com base na anamnese. Revise antes de
                enviar ao paciente.
              </p>

              <div className="space-y-3">
                {missoes.map((missao, index) => (
                  <div
                    key={index}
                    className={`rounded-xl p-4 border-2 transition-all
                      ${
                        missao.aprovada_nutri
                          ? "border-green-400 bg-green-50"
                          : "border-gray-100 bg-gray-50"
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{missao.icone}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-semibold text-gray-800 text-sm">
                            {missao.titulo}
                          </p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full
                            ${TIPO_LABEL[missao.tipo]?.cor}`}
                          >
                            {TIPO_LABEL[missao.tipo]?.label}
                          </span>
                        </div>
                        <p className="text-gray-500 text-xs">
                          {missao.descricao}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-green-600 text-xs font-bold">
                            +{missao.xp_recompensa} XP
                          </span>
                          <span className="text-gray-300 text-xs">
                            Prioridade: {missao.prioridade}/10
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() =>
                            missao.aprovada_nutri
                              ? reprovarMissao(index)
                              : aprovarMissao(index)
                          }
                          className={`w-8 h-8 rounded-full border-2 flex items-center
                            justify-center text-sm transition-all
                            ${
                              missao.aprovada_nutri
                                ? "bg-green-500 border-green-500 text-white"
                                : "border-gray-300 hover:border-green-400"
                            }`}
                        >
                          {missao.aprovada_nutri ? "✓" : ""}
                        </button>
                        <button
                          onClick={() => removerMissao(index)}
                          className="w-8 h-8 rounded-full border-2 border-red-200
                            text-red-300 hover:bg-red-50 hover:text-red-500
                            flex items-center justify-center text-sm transition-all"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <p className="text-sm text-green-700">
                <b>{aprovadas}</b> missões aprovadas de <b>{missoes.length}</b>{" "}
                sugeridas
              </p>
            </div>

            <button
              onClick={salvarAprovadas}
              disabled={salvando || aprovadas === 0}
              className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl
                shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {salvando
                ? "💾 Salvando..."
                : `Enviar ${aprovadas} missões para ${primeiroNome}`}
            </button>
          </div>
        )}

        {/* SUCESSO */}
        {etapa === "salvo" && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="font-bold text-gray-800 text-xl mb-2">
              Missões enviadas!
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              {primeiroNome} já pode acessar o app e ver as missões
            </p>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 text-left">
              <p className="text-sm font-bold text-green-700 mb-2">
                Dados de acesso:
              </p>
              <p className="text-sm text-gray-600">
                📧 Email: <b>{paciente.email}</b>
              </p>
              <p className="text-sm text-gray-600">
                🔑 Senha: <b>{paciente.senha_temp}</b>
              </p>
            </div>
            <button
              onClick={onVoltar}
              className="bg-green-500 text-white font-bold px-8 py-3 rounded-2xl"
            >
              ← Voltar aos pacientes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
