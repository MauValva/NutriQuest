import { useState } from "react";

interface Props {
  onConcluir: (email: string, senha: string) => Promise<boolean>;
}

export default function TelaOnboarding({ onConcluir }: Props) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  function validarEmail(e: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  async function entrar() {
    if (!validarEmail(email)) {
      setErro("Digite um email válido");
      return;
    }
    if (senha.length < 4) {
      setErro("Senha muito curta");
      return;
    }
    setErro("");
    setCarregando(true);

    const sucesso = await onConcluir(email, senha);

    setCarregando(false);
    if (!sucesso) {
      setErro("Email ou senha incorretos. Verifique com sua nutricionista.");
    }
  }

  return (
    <div
      className="min-h-screen bg-linear-to-b from-green-600 to-green-400
      flex flex-col items-center justify-center px-6 py-12"
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🥦</div>
          <h1 className="text-2xl font-bold text-white mb-2">NutriQuest</h1>
          <p className="text-white/80 text-sm">
            Use o email e a senha que sua nutricionista forneceu
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-white/70 text-xs font-medium mb-1 ml-1">Email</p>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErro("");
              }}
              placeholder="seu@email.com"
              className="w-full bg-white/20 text-white placeholder-white/40
                border-2 border-white/30 focus:border-white rounded-2xl
                px-4 py-4 outline-none transition-all"
            />
          </div>

          <div>
            <p className="text-white/70 text-xs font-medium mb-1 ml-1">
              Senha{" "}
              <span className="font-normal">
                (fornecida pela nutricionista)
              </span>
            </p>
            <div className="relative">
              <input
                type={mostrarSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value);
                  setErro("");
                }}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === "Enter" && entrar()}
                className="w-full bg-white/20 text-white placeholder-white/40
                  border-2 border-white/30 focus:border-white rounded-2xl
                  px-4 py-4 pr-12 outline-none transition-all"
              />
              <button
                onClick={() => setMostrarSenha((p) => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 text-lg"
              >
                {mostrarSenha ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {erro && (
            <div className="bg-red-400/30 border border-red-300/50 rounded-xl px-4 py-3">
              <p className="text-white text-sm text-center">{erro}</p>
            </div>
          )}

          <button
            onClick={entrar}
            disabled={carregando || !email || !senha}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all
              active:scale-95 shadow-lg mt-2
              ${
                carregando || !email || !senha
                  ? "bg-white/30 text-white/50"
                  : "bg-white text-green-600"
              }`}
          >
            {carregando ? "🔍 Verificando..." : "Entrar no NutriQuest 🚀"}
          </button>

          <p className="text-white/50 text-xs text-center pt-2">
            Não tem acesso? Fale com sua nutricionista.
          </p>
        </div>
      </div>
    </div>
  );
}
