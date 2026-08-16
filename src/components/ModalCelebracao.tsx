interface Props {
  tipo: "streak" | "passe" | "perdido";
  dias?: number;
  dataProtegida?: string;
  onFechar: () => void;
}

function formatarDataBr(dataStr: string): string {
  const [ano, mes, dia] = dataStr.split("-");
  return `${dia}/${mes}/${ano}`;
}

const CONFIG = {
  streak: {
    icone: "🔥",
    corFundo: "from-orange-500 to-red-500",
    titulo: (dias?: number) => `${dias} dias de sequência!`,
    descricao: () => "Você bateu sua meta do dia. Continue assim amanhã!",
  },
  passe: {
    icone: "🍀",
    corFundo: "from-green-500 to-emerald-500",
    titulo: () => "Passe livre usado!",
    descricao: (dataProtegida?: string) =>
      `Para não perder sua sequência, usamos seu passe livre no dia ${
        dataProtegida ? formatarDataBr(dataProtegida) : ""
      }.`,
  },
  perdido: {
    icone: "💔",
    corFundo: "from-gray-500 to-gray-600",
    titulo: () => "Sequência perdida",
    descricao: () =>
      "Você não completou o mínimo de refeições por alguns dias e sua sequência voltou a zero. Bora recomeçar!",
  },
  missoes: {
    icone: "🎯",
    corFundo: "from-purple-500 to-indigo-500",
    titulo: () => "Todas as missões concluídas!",
    descricao: () =>
      "Você completou suas missões de hoje. Volte amanhã para mais!",
  },
};

export default function ModalCelebracao({
  tipo,
  dias,
  dataProtegida,
  onFechar,
}: Props) {
  const cfg = CONFIG[tipo];

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center px-6"
      onClick={onFechar}
    >
      <div
        className={`bg-linear-to-br ${cfg.corFundo} rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="text-7xl mb-4 animate-bounce"
          style={{ animationDuration: "1s" }}
        >
          {cfg.icone}
        </div>
        <h2 className="text-white font-bold text-2xl mb-2">
          {tipo === "streak" ? cfg.titulo(dias) : cfg.titulo()}
        </h2>
        <p className="text-white/90 text-sm leading-relaxed mb-6">
          {tipo === "passe" ? cfg.descricao(dataProtegida) : cfg.descricao()}
        </p>
        <button
          onClick={onFechar}
          className="w-full bg-white/20 hover:bg-white/30 text-white font-bold py-3 rounded-2xl transition-all active:scale-95"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
