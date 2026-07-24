import { useState } from "react";
import type { Nutricionista } from "../../lib/supabase";
import {
  atualizarNutricionista,
  excluirNutricionista,
} from "../../services/nutricionistaService";

interface Props {
  nutri: Nutricionista;
  onAtualizado: (nutri: Nutricionista) => void;
  onContaExcluida: () => void;
}

export default function AdminPerfilNutri({
  nutri,
  onAtualizado,
  onContaExcluida,
}: Props) {
  const [nome, setNome] = useState(nutri.nome);
  const [email, setEmail] = useState(nutri.email);
  const [crn, setCrn] = useState(nutri.crn);
  const [whatsapp, setWhatsapp] = useState(nutri.whatsapp);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const planoInfo =
    (nutri as { plano?: string }).plano === "assinante"
      ? { label: "✨ Premium", cor: "bg-yellow-100 text-yellow-700" }
      : { label: "🌱 Grátis", cor: "bg-gray-100 text-gray-600" };

  async function salvar() {
    setSalvando(true);
    setErro("");
    setSucesso(false);

    const atualizado = await atualizarNutricionista(nutri.id, {
      nome,
      email,
      crn,
      whatsapp,
    });

    setSalvando(false);

    if (!atualizado) {
      setErro("Erro ao salvar alterações.");
      return;
    }

    setSucesso(true);
    onAtualizado(atualizado);
  }

  async function excluirConta() {
    setExcluindo(true);
    const resultado = await excluirNutricionista(nutri.id);
    setExcluindo(false);

    if (!resultado.sucesso) {
      setErro(resultado.erro ?? "Erro ao excluir conta.");
      setConfirmarExclusao(false);
      return;
    }

    onContaExcluida();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-700">Meus dados</h2>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${planoInfo.cor}`}
          >
            {planoInfo.label}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400">Nome</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 mt-1 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 mt-1 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">CRN</label>
              <input
                value={crn}
                onChange={(e) => setCrn(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">WhatsApp</label>
              <input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 mt-1 text-sm"
              />
            </div>
          </div>
        </div>

        {erro && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-600 text-sm text-center">{erro}</p>
          </div>
        )}
        {sucesso && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <p className="text-green-700 text-sm text-center">
              Dados atualizados!
            </p>
          </div>
        )}

        <button
          onClick={salvar}
          disabled={salvando}
          className="w-full mt-4 bg-green-500 text-white font-bold py-3 rounded-xl disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="font-bold text-gray-700 mb-1">Encerrar conta</h2>
        <p className="text-xs text-gray-400 mb-4">
          Isso é permanente. Você só pode excluir sua conta se não tiver
          pacientes cadastrados.
        </p>
        <button
          onClick={() => setConfirmarExclusao(true)}
          className="w-full bg-red-50 text-red-600 border border-red-200 font-bold py-3 rounded-xl"
        >
          🗑️ Excluir minha conta
        </button>
      </div>

      {confirmarExclusao && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="font-bold text-gray-800 text-lg mb-2">
              Excluir sua conta?
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Essa ação é permanente e não pode ser desfeita.
            </p>
            <div className="space-y-2">
              <button
                onClick={excluirConta}
                disabled={excluindo}
                className="w-full bg-red-500 text-white font-bold py-3 rounded-xl"
              >
                {excluindo ? "Excluindo..." : "Confirmar exclusão"}
              </button>
              <button
                onClick={() => setConfirmarExclusao(false)}
                className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-xl"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
