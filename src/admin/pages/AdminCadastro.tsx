import { useState } from "react";
import { cadastrarNutricionista } from "../../services/nutricionistaService";
import type { Nutricionista } from "../../lib/supabase";

interface Props {
  onVoltar: () => void;
  onCadastrado: (nutri: Nutricionista) => void;
}

export default function AdminCadastro({ onVoltar, onCadastrado }: Props) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [crn, setCrn] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [cadastrando, setCadastrando] = useState(false);

  async function cadastrar() {
    setErro("");

    if (!nome || !email || !crn || !senha) {
      setErro("Preencha nome, email, CRN e senha.");
      return;
    }
    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setCadastrando(true);
    const { nutri, erro: erroCadastro } = await cadastrarNutricionista({
      nome,
      email,
      crn,
      whatsapp,
      senha,
    });
    setCadastrando(false);

    if (erroCadastro || !nutri) {
      setErro(erroCadastro ?? "Erro ao cadastrar.");
      return;
    }

    onCadastrado(nutri);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <button
            onClick={onVoltar}
            className="text-gray-400 hover:text-gray-600 text-sm mb-4"
          >
            ← Voltar para login
          </button>

          <h1 className="font-bold text-gray-800 text-xl mb-1">
            🥦 Criar conta de nutricionista
          </h1>
          <p className="text-xs text-gray-400 mb-6">
            Comece grátis com 1 paciente. Assine quando quiser cadastrar mais.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400">Nome completo</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 mt-1 outline-none focus:border-green-400 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 mt-1 outline-none focus:border-green-400 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400">CRN</label>
                <input
                  value={crn}
                  onChange={(e) => setCrn(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 mt-1 outline-none focus:border-green-400 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">WhatsApp</label>
                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="51 999999999"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 mt-1 outline-none focus:border-green-400 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 mt-1 outline-none focus:border-green-400 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400">Confirmar senha</label>
              <input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 mt-1 outline-none focus:border-green-400 text-sm"
              />
            </div>
          </div>

          {erro && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-red-600 text-sm text-center">{erro}</p>
            </div>
          )}

          <button
            onClick={cadastrar}
            disabled={cadastrando}
            className="w-full mt-5 bg-green-500 text-white font-bold py-3 rounded-2xl shadow-md active:scale-95 transition-all disabled:opacity-50"
          >
            {cadastrando ? "Criando conta..." : "Criar conta grátis"}
          </button>
        </div>
      </div>
    </div>
  );
}
