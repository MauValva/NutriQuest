export type TipoMissao =
  | "hidratacao"
  | "alimentacao"
  | "atividade"
  | "educacional";

export interface Missao {
  id: string;
  titulo: string;
  descricao: string;
  tipo: TipoMissao;
  xpRecompensa: number;
  icone: string;
  concluida: boolean;
}
