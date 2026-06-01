import type { Paciente } from "../../lib/supabase";

interface Props {
  paciente: Paciente;
  onVoltar: () => void;
}

export default function AdminPaciente({ paciente, onVoltar }: Props) {
  const primeiroNome = paciente.nome.split(" ")[0];

  const objetivoLabel = {
    emagrecer: { label: "Emagrecer 📉", cor: "bg-blue-100 text-blue-700" },
    manter: { label: "Manter ⚖️", cor: "bg-green-100 text-green-700" },
    ganhar: { label: "Ganhar 📈", cor: "bg-orange-100 text-orange-700" },
  };

  const obj = paciente.objetivo ? objetivoLabel[paciente.objetivo] : null;

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
          flex items-center justify-center font-bold text-green-600 text-lg"
        >
          {paciente.nome.charAt(0)}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Card de dados */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-4">Dados do Paciente</h2>

          <div className="grid grid-cols-2 gap-3">
            {paciente.peso > 0 && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Peso</p>
                <p className="font-bold text-gray-800">{paciente.peso} kg</p>
              </div>
            )}
            {paciente.altura > 0 && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Altura</p>
                <p className="font-bold text-gray-800">{paciente.altura} m</p>
              </div>
            )}
            {paciente.idade > 0 && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Idade</p>
                <p className="font-bold text-gray-800">{paciente.idade} anos</p>
              </div>
            )}
            {obj && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Objetivo</p>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full ${obj.cor}`}
                >
                  {obj.label}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Acesso */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-4">Dados de Acesso</h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-3">
              <span className="text-xs text-gray-400">Email</span>
              <span className="text-sm font-bold text-gray-700">
                {paciente.email}
              </span>
            </div>
            <div className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-3">
              <span className="text-xs text-gray-400">Senha</span>
              <span className="font-mono font-bold text-green-600 tracking-widest">
                {paciente.senha_temp}
              </span>
            </div>
            <div className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-3">
              <span className="text-xs text-gray-400">App</span>
              <span className="text-sm font-bold text-blue-600">
                nutriquestrs.vercel.app
              </span>
            </div>
          </div>
        </div>

        {/* Observações */}
        {paciente.observacoes_anamnese && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-700 mb-3">
              Observações da Anamnese
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed line-clamp-4">
              {paciente.observacoes_anamnese}
            </p>
          </div>
        )}

        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
          <p className="text-sm text-green-700">
            {primeiroNome} está cadastrada e pode acessar o app com os dados
            acima.
          </p>
        </div>
      </div>
    </div>
  );
}
