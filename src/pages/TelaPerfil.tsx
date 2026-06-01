import { useApp } from "../contexts/useApp";
import { carregarPerfil } from "../utils/storage";

export default function TelaPerfil() {
  const { xpTotal, nivel, streakDias, paciente } = useApp();
  const perfil = carregarPerfil();

  const nome = perfil?.nome ?? paciente.nome;
  const email = paciente.email;
  const peso = perfil?.peso ?? paciente.peso ?? "";
  const altura = perfil?.altura ?? paciente.altura ?? "";

  const objetivoConfig = {
    emagrecer: {
      icone: "📉",
      titulo: "Emagrecimento",
      desc: "Seu foco é perder gordura corporal com saúde e disposição.",
      cor: "from-blue-500 to-blue-600",
      bg: "bg-blue-50",
      texto: "text-blue-700",
    },
    ganhar: {
      icone: "💪",
      titulo: "Ganho de Massa",
      desc: "Seu foco é construir massa muscular com nutrição de qualidade.",
      cor: "from-orange-500 to-orange-600",
      bg: "bg-orange-50",
      texto: "text-orange-700",
    },
    manter: {
      icone: "⚖️",
      titulo: "Manutenção",
      desc: "Seu foco é manter o peso atual com hábitos alimentares equilibrados.",
      cor: "from-green-500 to-green-600",
      bg: "bg-green-50",
      texto: "text-green-700",
    },
  };

  const obj = objetivoConfig[paciente.objetivo ?? "manter"];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm px-5 pt-12 pb-5">
        <h1 className="text-xl font-bold text-gray-800">Meu Perfil 👤</h1>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icone: "⭐", valor: xpTotal, label: "XP Total" },
            { icone: "🏅", valor: `Nv ${nivel}`, label: "Nível" },
            { icone: "🔥", valor: `${streakDias}d`, label: "Streak" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl p-3 text-center shadow-sm"
            >
              <p className="text-xl">{s.icone}</p>
              <p className="font-bold text-gray-800">{s.valor}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Objetivo */}
        <div className={`${obj.bg} rounded-2xl p-5 border border-opacity-20`}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
            Meu Objetivo
          </p>

          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${obj.cor}
              flex items-center justify-center text-2xl shadow-md`}
            >
              {obj.icone}
            </div>

            <div className="flex-1">
              <p className={`font-bold text-lg ${obj.texto}`}>{obj.titulo}</p>
              <p className="text-sm text-gray-500 leading-snug mt-0.5">
                {obj.desc}
              </p>
            </div>
          </div>
        </div>

        {/* Dados pessoais */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">
            Dados Pessoais
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400">Nome</label>
              <div
                className="w-full mt-1 border border-gray-100 rounded-xl px-4 py-2.5
                bg-gray-50 text-sm text-gray-600 font-medium"
              >
                {nome}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400">Email</label>
              <div
                className="w-full mt-1 border border-gray-100 rounded-xl px-4 py-2.5
                bg-gray-50 text-sm text-gray-600"
              >
                {email}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400">Peso (kg)</label>
                <div
                  className="w-full mt-1 border border-gray-100 rounded-xl px-4 py-2.5
                  bg-gray-50 text-sm text-center font-medium text-gray-600"
                >
                  {peso}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400">Altura (m)</label>
                <div
                  className="w-full mt-1 border border-gray-100 rounded-xl px-4 py-2.5
                  bg-gray-50 text-sm text-center font-medium text-gray-600"
                >
                  {altura}
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-2">
              Informações atualizadas pela nutricionista.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
