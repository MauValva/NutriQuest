import { useState } from "react";
import { cadastrarPaciente } from "../../services/nutricionistaService";
import type { Nutricionista } from "../../lib/supabase";

interface Props {
  nutri: Nutricionista;
  onVoltar: () => void;
  onCadastrado: () => void;
}

export default function AdminNovoPaciente({
  nutri,
  onVoltar,
  onCadastrado,
}: Props) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [idade, setIdade] = useState("");
  const [objetivo, setObjetivo] = useState<"emagrecer" | "manter" | "ganhar">(
    "manter",
  );
  const [senha, setSenha] = useState(() =>
    Math.random().toString(36).slice(2, 8).toUpperCase(),
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    if (!nome || !email || !senha) {
      setErro("Nome, email e senha são obrigatórios");
      return;
    }
    setErro("");
    setSalvando(true);

    const paciente = await cadastrarPaciente(nutri.id, {
      nome,
      email,
      senha_temp: senha,
      peso: Number(peso),
      altura: Number(altura),
      idade: Number(idade),
      objetivo,
      observacoes_anamnese: "",
    });

    setSalvando(false);

    if (!paciente) {
      setErro("Erro ao cadastrar — email já pode estar em uso");
      return;
    }

    onCadastrado();
  }

  function gerarNovaSenha() {
    setSenha(Math.random().toString(36).slice(2, 8).toUpperCase());
  }

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
          <h1 className="font-bold text-gray-800">Novo Paciente</h1>
          <p className="text-xs text-gray-400">Preencha os dados básicos</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Dados pessoais */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-4">Dados Pessoais</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase">
                Nome completo
              </label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Milene Azambuja"
                className="w-full mt-1 border border-gray-200 rounded-xl px-4 py-3
                  outline-none focus:border-green-400 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="paciente@email.com"
                className="w-full mt-1 border border-gray-200 rounded-xl px-4 py-3
                  outline-none focus:border-green-400 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Dados físicos */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-4">Dados Físicos</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Peso (kg)",
                value: peso,
                setter: setPeso,
                placeholder: "70",
              },
              {
                label: "Altura (m)",
                value: altura,
                setter: setAltura,
                placeholder: "1.70",
              },
              {
                label: "Idade",
                value: idade,
                setter: setIdade,
                placeholder: "30",
              },
            ].map((f) => (
              <div key={f.label}>
                <label className="text-xs text-gray-400">{f.label}</label>
                <input
                  type="number"
                  value={f.value}
                  onChange={(e) => f.setter(e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2
                    outline-none focus:border-green-400 text-sm text-center"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Objetivo */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-4">Objetivo</h2>
          <div className="flex gap-2">
            {[
              { tipo: "emagrecer" as const, icone: "📉", label: "Emagrecer" },
              { tipo: "manter" as const, icone: "⚖️", label: "Manter" },
              { tipo: "ganhar" as const, icone: "📈", label: "Ganhar" },
            ].map((o) => (
              <button
                key={o.tipo}
                onClick={() => setObjetivo(o.tipo)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl
                  border-2 transition-all text-sm
                  ${
                    objetivo === o.tipo
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-100 text-gray-400"
                  }`}
              >
                <span className="text-xl">{o.icone}</span>
                <span className="text-xs font-medium">{o.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Senha gerada */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <h2 className="font-bold text-gray-700 mb-1">Senha de acesso</h2>
          <p className="text-xs text-gray-400 mb-3">
            Envie essa senha para o paciente junto com o email
          </p>
          <div className="flex items-center gap-3">
            <div
              className="flex-1 bg-white border border-green-300 rounded-xl
              px-4 py-3 text-center font-mono font-bold text-xl tracking-widest
              text-green-700"
            >
              {senha}
            </div>
            <button
              onClick={gerarNovaSenha}
              className="bg-green-500 text-white px-4 py-3 rounded-xl text-sm font-bold"
            >
              🔄 Gerar
            </button>
          </div>
        </div>

        {/* Erro */}
        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-600 text-sm text-center">{erro}</p>
          </div>
        )}

        {/* Botão salvar */}
        <button
          onClick={salvar}
          disabled={salvando}
          className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl
            shadow-md active:scale-95 transition-all"
        >
          {salvando ? "💾 Salvando..." : "Cadastrar Paciente"}
        </button>
      </div>
    </div>
  );
}
