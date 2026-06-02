import { useState } from "react";
import type { Nutricionista, Paciente } from "../../lib/supabase";
import {
  extrairTextoPDF,
  extrairDadosAnamneseComIA,
  gerarMissoesComIA,
  extrairRefeicoesComIA,
  type MissaoGerada,
} from "../../services/pdfService";
import {
  cadastrarPaciente,
  salvarMissoes,
  atualizarMissao,
  deletarMissao,
  salvarPlanoAlimentar,
} from "../../services/nutricionistaService";

type MissaoSugerida = MissaoGerada;

interface DadosExtraidos {
  nome: string;
  peso: number;
  altura: number;
  idade: number;
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
  observacoes_relevantes: string;
  [key: string]: unknown;
}

interface Props {
  nutri: Nutricionista;
  onVoltar: () => void;
  onConcluido: () => void;
}

type Etapa = "upload" | "processando" | "revisao" | "salvo";

const TIPO_LABEL: Record<string, { label: string; cor: string }> = {
  hidratacao: { label: "Hidratação", cor: "bg-blue-100 text-blue-700" },
  alimentacao: { label: "Alimentação", cor: "bg-green-100 text-green-700" },
  atividade: { label: "Atividade", cor: "bg-orange-100 text-orange-700" },
  educacional: { label: "Educacional", cor: "bg-purple-100 text-purple-700" },
};

function gerarEmailSugerido(nome: string): string {
  const partes = nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/);

  const primeiro = partes[0] ?? "paciente";
  const segundo = partes[1] ?? "";
  const emailBase = segundo ? `${primeiro}${segundo}` : primeiro;

  return `${emailBase}@nutriquest.com`;
}

function gerarSenha(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function AdminUploadPaciente({
  nutri,
  onVoltar,
  onConcluido,
}: Props) {
  const [etapa, setEtapa] = useState<Etapa>("upload");
  const [arquivoAnamnese, setArquivoAnamnese] = useState<File | null>(null);
  const [arquivoPlano, setArquivoPlano] = useState<File | null>(null);
  const [dados, setDados] = useState<DadosExtraidos | null>(null);
  const [missoes, setMissoes] = useState<MissaoSugerida[]>([]);
  const [pacienteCriado, setPacienteCriado] = useState<Paciente | null>(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [progressoMsg, setProgressoMsg] = useState("Processando...");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [idade, setIdade] = useState("");
  const [objetivo, setObjetivo] = useState<"emagrecer" | "manter" | "ganhar">(
    "manter",
  );

  async function processarPDFs() {
    if (!arquivoAnamnese) {
      setErro("A Anamnese é obrigatória para cadastrar o paciente");
      return;
    }
    setErro("");
    setEtapa("processando");
    setProgressoMsg("📋 Lendo anamnese...");

    try {
      // ETAPA 1 — Anamnese
      const textoAnamnese = await extrairTextoPDF(arquivoAnamnese);
      const dadosAnamnese = (await extrairDadosAnamneseComIA(
        textoAnamnese,
      )) as DadosExtraidos;

      if (!dadosAnamnese) {
        setErro("A IA não conseguiu ler a anamnese. Tente novamente.");
        setEtapa("upload");
        return;
      }

      setDados(dadosAnamnese);
      const emailGerado = gerarEmailSugerido(dadosAnamnese.nome);
      const senhaGerada = gerarSenha();
      setNome(dadosAnamnese.nome);
      setEmail(emailGerado);
      setSenha(senhaGerada);
      setPeso(dadosAnamnese.peso > 0 ? String(dadosAnamnese.peso) : "");
      setAltura(dadosAnamnese.altura > 0 ? String(dadosAnamnese.altura) : "");
      setIdade(dadosAnamnese.idade > 0 ? String(dadosAnamnese.idade) : "");
      setObjetivo(dadosAnamnese.objetivo);

      // ETAPA 2 — Cadastrar paciente
      setProgressoMsg("👤 Cadastrando paciente...");
      const paciente = await cadastrarPaciente(nutri.id, {
        nome: dadosAnamnese.nome,
        email: emailGerado,
        senha_temp: senhaGerada,
        peso: dadosAnamnese.peso,
        altura: dadosAnamnese.altura,
        idade: dadosAnamnese.idade ?? 0,
        objetivo: dadosAnamnese.objetivo,
        observacoes_anamnese: textoAnamnese.slice(0, 2000),
      });

      if (!paciente) {
        setErro("Erro ao criar paciente. Email pode já estar em uso.");
        setEtapa("upload");
        return;
      }

      setPacienteCriado(paciente);

      // ETAPA 3 — Plano alimentar (separado da anamnese)
      if (arquivoPlano) {
        setProgressoMsg("🥗 Lendo plano alimentar... (pode levar ~30s)");
        try {
          const textoPlano = await extrairTextoPDF(arquivoPlano);
          const refeicoes = await extrairRefeicoesComIA(textoPlano);
          if (refeicoes.length > 0) {
            await salvarPlanoAlimentar(paciente.id, refeicoes);
          }
        } catch (e) {
          console.warn(
            "Erro ao processar plano alimentar — continuando sem ele:",
            e,
          );
          // Não bloqueia o fluxo — missões ainda serão geradas
        }
      }

      // ETAPA 4 — Missões com IA
      setProgressoMsg("🎯 Gerando missões personalizadas...");
      const sugeridas = await gerarMissoesComIA(paciente.id, dadosAnamnese);
      await salvarMissoes(sugeridas);
      setMissoes(sugeridas);
      setEtapa("revisao");
    } catch (e) {
      console.error(e);
      setErro("Erro ao processar. Verifique os arquivos e tente novamente.");
      setEtapa("upload");
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

  async function salvarTudo() {
    if (!pacienteCriado) return;
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
  const primeiroNome = nome.split(" ")[0] || "Paciente";

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
        <div>
          <h1 className="font-bold text-gray-800">Novo Paciente via PDF</h1>
          <p className="text-xs text-gray-400">
            Faça upload da anamnese e o sistema cuida do resto
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* ── UPLOAD ──────────────────────────────────────── */}
        {etapa === "upload" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-gray-700 mb-1">
                📄 Upload dos PDFs
              </h2>
              <p className="text-xs text-gray-400 mb-5">
                A anamnese é obrigatória — o sistema extrai nome, peso, altura e
                objetivo automaticamente. O plano alimentar é opcional.
              </p>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-1">
                    ANAMNESE <span className="text-red-400">*obrigatório</span>
                  </p>
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
                      {arquivoAnamnese
                        ? arquivoAnamnese.name
                        : "Anamnese (PDF)"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {arquivoAnamnese
                        ? "Clique para trocar"
                        : "Clique para selecionar"}
                    </p>
                  </label>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-500 mb-1">
                    PLANO ALIMENTAR{" "}
                    <span className="text-gray-400">(opcional)</span>
                  </p>
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
                    <p className="text-2xl mb-2">
                      {arquivoPlano ? "✅" : "🥗"}
                    </p>
                    <p className="font-medium text-sm text-gray-700">
                      {arquivoPlano
                        ? arquivoPlano.name
                        : "Plano Alimentar (PDF)"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {arquivoPlano
                        ? "Clique para trocar"
                        : "Clique para selecionar"}
                    </p>
                  </label>
                </div>
              </div>

              {erro && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-red-600 text-sm text-center">{erro}</p>
                </div>
              )}
            </div>

            <button
              onClick={processarPDFs}
              disabled={!arquivoAnamnese}
              className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl
                shadow-md active:scale-95 transition-all disabled:opacity-40"
            >
              🤖 Ler PDFs e cadastrar paciente
            </button>
          </div>
        )}

        {/* ── PROCESSANDO ─────────────────────────────────── */}
        {etapa === "processando" && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 animate-bounce">🤖</div>
            <h2 className="font-bold text-gray-700 text-lg mb-2">
              {progressoMsg}
            </h2>
            <p className="text-gray-400 text-sm">
              A IA está analisando os documentos
            </p>
            <div className="mt-6 flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-green-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── REVISÃO ─────────────────────────────────────── */}
        {etapa === "revisao" && (
          <div className="space-y-4">
            {/* Dados editáveis */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-gray-700 mb-1">
                ✅ Paciente cadastrado — revise os dados
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Dados extraídos automaticamente. Corrija se necessário.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">
                    Nome
                  </label>
                  <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full mt-1 border border-gray-200 rounded-xl px-4 py-2
                      outline-none focus:border-green-400 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">
                    Email de acesso
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full mt-1 border border-gray-200 rounded-xl px-4 py-2
                      outline-none focus:border-green-400 text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Sugerido automaticamente — confirme com a paciente
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Peso (kg)", value: peso, setter: setPeso },
                    { label: "Altura (m)", value: altura, setter: setAltura },
                    { label: "Idade", value: idade, setter: setIdade },
                  ].map((f) => (
                    <div key={f.label}>
                      <label className="text-xs text-gray-400">{f.label}</label>
                      <input
                        type="number"
                        value={f.value}
                        onChange={(e) => f.setter(e.target.value)}
                        className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2
                          outline-none focus:border-green-400 text-sm text-center"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">
                    Objetivo
                  </label>
                  <div className="flex gap-2 mt-2">
                    {[
                      {
                        tipo: "emagrecer" as const,
                        icone: "📉",
                        label: "Emagrecer",
                      },
                      { tipo: "manter" as const, icone: "⚖️", label: "Manter" },
                      { tipo: "ganhar" as const, icone: "📈", label: "Ganhar" },
                    ].map((o) => (
                      <button
                        key={o.tipo}
                        onClick={() => setObjetivo(o.tipo)}
                        className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl
                          border-2 transition-all text-xs
                          ${
                            objetivo === o.tipo
                              ? "border-green-500 bg-green-50 text-green-700"
                              : "border-gray-100 text-gray-400"
                          }`}
                      >
                        <span className="text-lg">{o.icone}</span>
                        <span>{o.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    Senha de acesso
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <p
                      className="flex-1 font-mono font-bold text-xl text-green-700
                      tracking-widest text-center"
                    >
                      {senha}
                    </p>
                    <button
                      onClick={() => setSenha(gerarSenha())}
                      className="bg-green-500 text-white px-3 py-1 rounded-lg text-xs"
                    >
                      🔄
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-center">
                    Envie essa senha para a paciente junto com o email
                  </p>
                </div>

                {dados && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">
                      Dificuldades detectadas
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {dados.dificuldades.agua && (
                        <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full">
                          💧 Hidratação insuficiente
                        </span>
                      )}
                      {dados.dificuldades.refeicoes && (
                        <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full">
                          🍽️ Regularidade nas refeições
                        </span>
                      )}
                      {dados.dificuldades.tempo && (
                        <span className="bg-orange-100 text-orange-700 text-xs px-3 py-1 rounded-full">
                          ⏰ Falta de tempo
                        </span>
                      )}
                      {dados.alimento_favorito && (
                        <span className="bg-purple-100 text-purple-700 text-xs px-3 py-1 rounded-full">
                          ❤️ Favorito: {dados.alimento_favorito}
                        </span>
                      )}
                      {dados.nao_come && (
                        <span className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full">
                          ❌ Não come: {dados.nao_come}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Missões sugeridas */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-gray-700 mb-1">
                🎯 Missões sugeridas — revise e aprove
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Geradas com IA com base na anamnese. Clique no círculo para
                aprovar, no ✕ para remover.
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
              onClick={salvarTudo}
              disabled={salvando || aprovadas === 0}
              className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl
                shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {salvando
                ? "💾 Salvando..."
                : `Confirmar e enviar ${aprovadas} missões para ${primeiroNome}`}
            </button>
          </div>
        )}

        {/* ── SUCESSO ─────────────────────────────────────── */}
        {etapa === "salvo" && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="font-bold text-gray-800 text-xl mb-2">
              {primeiroNome} está pronta!
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              Perfil criado e missões aprovadas. Envie os dados de acesso para
              ela.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6 text-left">
              <p className="text-sm font-bold text-green-700 mb-3">
                📲 Dados de acesso — envie para a paciente:
              </p>
              <div className="space-y-2">
                <div className="bg-white rounded-xl px-4 py-3 flex justify-between">
                  <span className="text-xs text-gray-400">Email</span>
                  <span className="text-sm font-bold text-gray-700">
                    {email}
                  </span>
                </div>
                <div className="bg-white rounded-xl px-4 py-3 flex justify-between">
                  <span className="text-xs text-gray-400">Senha</span>
                  <span className="text-sm font-bold text-green-600 font-mono tracking-widest">
                    {senha}
                  </span>
                </div>
                <div className="bg-white rounded-xl px-4 py-3 flex justify-between">
                  <span className="text-xs text-gray-400">App</span>
                  <span className="text-sm font-bold text-blue-600">
                    nutriquestrs.vercel.app
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onConcluido}
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
