import { useLocation, useNavigate } from "react-router-dom";

const abas = [
  { path: "/", icone: "🎯", label: "Missões" },
  { path: "/refeicoes", icone: "🍽️", label: "Refeições" },
  { path: "/progresso", icone: "📊", label: "Progresso" },
  { path: "/perfil", icone: "👤", label: "Perfil" },
];

export default function NavegacaoInferior() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px]
      bg-white border-t border-gray-100 shadow-lg z-40"
    >
      <div className="flex">
        {abas.map((aba) => {
          const ativa = location.pathname === aba.path;
          return (
            <button
              key={aba.path}
              onClick={() => navigate(aba.path)}
              className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-all
                ${ativa ? "text-green-600" : "text-gray-400"}`}
            >
              <span className="text-2xl">{aba.icone}</span>
              <span
                className={`text-xs font-medium ${ativa ? "text-green-600" : "text-gray-400"}`}
              >
                {aba.label}
              </span>
              {ativa && (
                <div className="w-1 h-1 rounded-full bg-green-500 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
