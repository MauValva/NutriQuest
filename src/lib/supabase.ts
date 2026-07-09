import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Tipos que espelham as tabelas do banco
export interface Nutricionista {
  id: string;
  nome: string;
  email: string;
  crn: string;
  whatsapp: string;
}

export interface Paciente {
  id: string;
  nutricionista_id: string;
  nome: string;
  email: string;
  senha_temp: string;
  peso: number;
  altura: number;
  data_nascimento?: string | null;
  objetivo:
    | "emagrecer"
    | "manter"
    | "ganhar"
    | "performance"
    | "preparacao_prova";
  observacoes_anamnese: string;
  ativa: boolean;
}

export interface MissaoDB {
  id: string;
  paciente_id: string;
  titulo: string;
  descricao: string;
  tipo: "hidratacao" | "alimentacao" | "atividade" | "educacional";
  icone: string;
  xp_recompensa: number;
  prioridade: number;
  aprovada_nutri: boolean;
  ativa: boolean;
}

export interface RefeicaoPlano {
  id: string;
  paciente_id: string;
  tipo: "cafe" | "almoco" | "sobremesa" | "lanche" | "jantar" | "complemento";
  horario: string;
  opcoes: OpcaoRefeicao[];
  observacoes: string;
}

export interface OpcaoRefeicao {
  numero: number;
  itens: ItemRefeicao[];
  observacoes?: string;
}

export interface ItemRefeicao {
  nome: string;
  quantidade: string;
  titulo?: string;
  observacao?: string;
}

export interface PacienteTag {
  id: string;
  paciente_id: string;
  tag_id: string;
  created_at?: string;

  tags?: {
    id: string;
    nome: string;
    emoji: string;
    categoria: string;
  };
}

export interface Tag {
  id: string;
  nome: string;
  emoji: string;
  categoria: string;
  ativa: boolean;
}
