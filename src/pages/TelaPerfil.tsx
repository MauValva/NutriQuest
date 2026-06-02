import { useApp } from "../contexts/useApp";

export default function TelaPerfil() {
  const { xpTotal, nivel, streakDias, paciente } = useApp();

  const xpNoNivel = xpTotal % 200;
  const progressoNivel = xpNoNivel / 200;

  const objetivoConfig = {
    emagrecer: {
      icone: "📉",
      titulo: "Emagrecimento",
      subtitulo: "Transformando hábitos em resultados",
      desc: "Cada escolha saudável te aproxima do seu melhor peso. Você está no caminho certo!",
      gradiente: "from-blue-500 to-cyan-400",
      bg: "from-blue-50 to-cyan-50",
      borda: "border-blue-200",
      texto: "text-blue-700",
      sub: "text-blue-500",
    },
    ganhar: {
      icone: "💪",
      titulo: "Ganho de Massa",
      subtitulo: "Construindo força com nutrição",
      desc: "Seu corpo está evoluindo. Cada refeição certa é um tijolo na construção do seu físico!",
      gradiente: "from-orange-500 to-amber-400",
      bg: "from-orange-50 to-amber-50",
      borda: "border-orange-200",
      texto: "text-orange-700",
      sub: "text-orange-500",
    },
    manter: {
      icone: "⚖️",
      titulo: "Manutenção",
      subtitulo: "Equilíbrio é o seu superpoder",
      desc: "Manter a saúde é uma conquista diária. Continue com seus ótimos hábitos alimentares!",
      gradiente: "from-green-500 to-emerald-400",
      bg: "from-green-50 to-emerald-50",
      borda: "border-green-200",
      texto: "text-green-700",
      sub: "text-green-500",
    },
  };

  const obj = objetivoConfig[paciente.objetivo ?? "manter"];
  const primeiroNome = paciente.nome?.split(" ")[0] ?? "Paciente";

  const dadosPessoais = [
    { icone: "👤", label: "Nome", valor: paciente.nome },
    { icone: "📧", label: "Email", valor: paciente.email },
    {
      icone: "⚖️",
      label: "Peso",
      valor: paciente.peso ? `${paciente.peso} kg` : "—",
    },
    {
      icone: "📏",
      label: "Altura",
      valor: paciente.altura ? `${paciente.altura} m` : "—",
    },
    {
      icone: "🎂",
      label: "Idade",
      valor: paciente.idade ? `${paciente.idade} anos` : "—",
    },
  ];

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
              <p className="text-2xl">{s.icone}</p>
              <p className="font-bold text-gray-800 text-lg">{s.valor}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Objetivo — card motivacional animado */}
        <div
          className={`bg-gradient-to-br ${obj.bg} border ${obj.borda}
          rounded-3xl p-5 overflow-hidden relative`}
        >
          {/* Círculos decorativos de fundo */}
          <div
            className={`absolute -top-6 -right-6 w-24 h-24 rounded-full
            bg-gradient-to-br ${obj.gradiente} opacity-10`}
          />
          <div
            className={`absolute -bottom-4 -left-4 w-16 h-16 rounded-full
            bg-gradient-to-br ${obj.gradiente} opacity-10`}
          />

          <p
            className={`text-xs font-bold uppercase tracking-widest ${obj.sub} mb-3`}
          >
            Meu Objetivo
          </p>

          <div className="flex items-start gap-4">
            {/* Ícone animado */}
            <div
              className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${obj.gradiente}
              flex items-center justify-center text-3xl shadow-lg
              animate-bounce mt-4`}
              style={{ animationDuration: "2s" }}
            >
              {obj.icone}
            </div>

            <div className="flex-1">
              <p className={`font-bold text-xl ${obj.texto}`}>{obj.titulo}</p>
              <p className={`text-xs font-medium ${obj.sub} mb-2`}>
                {obj.subtitulo}
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                {obj.desc}
              </p>
            </div>
          </div>

          {/* Barra de progresso do nível */}
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className={obj.sub}>Progresso nível {nivel}</span>
              <span className={`font-bold ${obj.texto}`}>
                {xpNoNivel}/200 XP
              </span>
            </div>
            <div className="bg-white/60 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full bg-gradient-to-r ${obj.gradiente}
                  transition-all duration-700`}
                style={{ width: `${progressoNivel * 100}%` }}
              />
            </div>
            <p className={`text-xs ${obj.sub} mt-1 text-right`}>
              Faltam {200 - xpNoNivel} XP para o nível {nivel + 1}
            </p>
          </div>
        </div>

        {/* Dados pessoais — somente leitura, visual limpo */}
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Dados Pessoais
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Gerenciado pela sua nutricionista
            </p>
          </div>

          <div className="divide-y divide-gray-50">
            {dadosPessoais.map((dado) => (
              <div
                key={dado.label}
                className="flex items-center gap-4 px-5 py-3.5"
              >
                <div
                  className="w-9 h-9 rounded-xl bg-gray-50
                  flex items-center justify-center text-lg flex-shrink-0"
                >
                  {dado.icone}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">{dado.label}</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {dado.valor}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-3 bg-gray-50 flex items-center gap-2">
            <span className="text-xs">🩺</span>
            <p className="text-xs text-gray-400">
              Para atualizar seus dados, fale com{" "}
              <span className="font-medium text-gray-600">
                sua nutricionista
              </span>
            </p>
          </div>
        </div>

        {/* Mensagem motivacional */}
        <div
          className={`bg-gradient-to-r ${obj.gradiente}
          rounded-2xl p-4 text-center shadow-md`}
        >
          <p className="text-white font-bold text-sm">
            💪 Continue assim, {primeiroNome}!
          </p>
          <p className="text-white/80 text-xs mt-1">
            Você está construindo hábitos que vão durar a vida toda.
          </p>
        </div>
      </div>
    </div>
  );
}
