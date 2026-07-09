export type TipoConclusao = "completa" | "parcial" | "extra";

const PERCENTUAIS: Record<TipoConclusao, number> = {
  completa: 1,
  parcial: 0.5,
  extra: 0.2,
};

export function calcularTipoConclusao(
  opcaoEscolhida: boolean,
  observacao: string,
): TipoConclusao {
  if (!opcaoEscolhida) return "extra";
  return observacao.trim() ? "parcial" : "completa";
}

export function calcularPontos(
  pontosBase: number,
  tipoConclusao: TipoConclusao,
): number {
  return Math.round(pontosBase * PERCENTUAIS[tipoConclusao]);
}
