import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// ── Extrai texto bruto do PDF ─────────────────────────
export async function extrairTextoPDF(arquivo: File): Promise<string> {
  const arrayBuffer = await arquivo.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let textoCompleto = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const pagina = await pdf.getPage(i);
    const conteudo = await pagina.getTextContent();
    const textoPagina = conteudo.items
      .map((item: Record<string, unknown>) =>
        typeof item["str"] === "string" ? item["str"] : "",
      )
      .join(" ");
    textoCompleto += textoPagina + "\n";
  }

  return textoCompleto;
}

// ── Chama o Groq com um prompt ──────────────────────
async function chamarGroq(prompt: string): Promise<string> {
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1500,
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Erro Groq:", data);
    throw new Error(data?.error?.message ?? `Erro HTTP ${response.status}`);
  }

  return data.choices?.[0]?.message?.content ?? "";
}

// ── Lê anamnese com IA ────────────────────────────────
export async function extrairDadosAnamneseComIA(texto: string) {
  const prompt = `Você é um assistente especializado em nutrição clínica.
Analise o texto abaixo de uma anamnese nutricional e extraia as informações estruturadas.
O texto pode vir de qualquer software de nutrição (Webdiet, Dietbox, NutriSoft, etc).
Responda APENAS com JSON válido, sem markdown, sem texto adicional.

TEXTO DA ANAMNESE:
${texto.slice(0, 3000)}

Retorne exatamente neste formato:
{
  "nome": "nome completo do paciente",
  "peso": 70,
  "altura": 1.70,
  "idade": 30,
  "objetivo": "emagrecer",
  "dificuldades": {
    "agua": false,
    "refeicoes": false,
    "tempo": false,
    "atividade": false
  },
  "alimento_favorito": "",
  "nao_come": "",
  "atividade_fisica": "",
  "ingestao_agua": "",
  "observacoes_relevantes": ""
}

Regras importantes:
- nome: nome completo conforme aparece no documento
- peso: número em kg (ex: 70), sem unidade
- altura: número em metros com decimais (ex: 1.58), sem unidade
- idade: número inteiro, 0 se não encontrado
- objetivo: "emagrecer" se quer perder peso/gordura, "ganhar" se quer massa muscular/hipertrofia, "manter" nos demais casos
- dificuldades.agua: true se bebe menos de 2L por dia OU menciona dificuldade com hidratação
- dificuldades.refeicoes: true se tem dificuldade de regularidade, pula refeições ou não sabe as quantidades certas
- dificuldades.tempo: true se menciona falta de tempo como dificuldade cotidiana
- dificuldades.atividade: true se é sedentário ou não pratica nenhuma atividade física
- alimento_favorito: alimento favorito/indispensável mencionado
- nao_come: alimento que não come de jeito nenhum
- atividade_fisica: descreva a atividade e frequência mencionadas
- ingestao_agua: quanto bebe de água por dia conforme relatado
- observacoes_relevantes: resumo em 1 frase das principais informações clínicas (diagnósticos, medicamentos, restrições)`;

  const resposta = await chamarGroq(prompt);

  try {
    const limpo = resposta.replace(/```json|```/g, "").trim();
    return JSON.parse(limpo);
  } catch {
    console.error("Erro ao parsear resposta do Groq:", resposta);
    return null;
  }
}

// ── Gera missões personalizadas com IA ────────────────
export async function gerarMissoesComIA(
  pacienteId: string,
  dadosAnamnese: Record<string, unknown>,
  textoBruto: string,
): Promise<MissaoGerada[]> {
  const prompt = `Você é uma nutricionista experiente criando missões gamificadas para engajar pacientes.
Com base na anamnese abaixo, crie missões diárias personalizadas no estilo Duolingo.
Responda APENAS com JSON válido, sem markdown, sem texto adicional.

DADOS DO PACIENTE:
${JSON.stringify(dadosAnamnese, null, 2)}

TRECHOS RELEVANTES DA ANAMNESE:
${textoBruto.slice(0, 1500)}

Crie entre 6 e 8 missões personalizadas. Retorne um array JSON:
[
  {
    "titulo": "título curto e motivador",
    "descricao": "instrução clara e específica para este paciente",
    "tipo": "hidratacao",
    "icone": "💧",
    "xp_recompensa": 15,
    "prioridade": 8
  }
]

Regras:
- tipo: apenas "hidratacao", "alimentacao", "atividade" ou "educacional"
- icone: emoji relevante para a missão
- xp_recompensa: entre 10 e 40 XP, mais difícil = mais XP
- prioridade: entre 1 e 10, baseada nas dificuldades do paciente (dificuldades detectadas = prioridade alta)
- Personalize as missões com base nas dificuldades reais do paciente
- Se bebe pouco água: priorize missões de hidratação com xp alto
- Se tem dificuldade com refeições: priorize registro e regularidade
- Se pratica musculação: inclua missão de alimentação pós-treino
- Se tem pouco tempo: sugira missões práticas e rápidas
- Inclua pelo menos 1 missão educacional
- Use linguagem motivadora e direta, como um coach`;

  const resposta = await chamarGroq(prompt);

  try {
    const limpo = resposta.replace(/```json|```/g, "").trim();
    const missoes = JSON.parse(limpo) as MissaoGerada[];

    return missoes.map((m) => ({
      ...m,
      paciente_id: pacienteId,
      aprovada_nutri: false,
      ativa: true,
    }));
  } catch {
    console.error("Erro ao parsear missões do Groq:", resposta);
    return [];
  }
}

export interface MissaoGerada {
  paciente_id: string;
  titulo: string;
  descricao: string;
  tipo: "hidratacao" | "alimentacao" | "atividade" | "educacional";
  icone: string;
  xp_recompensa: number;
  prioridade: number;
  aprovada_nutri: boolean;
  ativa: boolean;
  id?: string;
}

// ── Extrai refeições do plano alimentar com IA ────────
export async function extrairRefeicoesComIA(texto: string) {
  const prompt = `Você é um assistente de nutrição.
Analise o texto abaixo de um plano alimentar e extraia as refeições estruturadas.
O texto pode vir de qualquer software (Webdiet, Dietbox, etc).
Responda APENAS com JSON válido, sem markdown.

TEXTO DO PLANO:
${texto.slice(0, 8000)}

Retorne um array de refeições:
[
  {
    "tipo": "cafe",
    "horario": "06:30",
    "opcoes": [
      {
        "numero": 1,
        "itens": [
          { "nome": "Leite desnatado", "quantidade": "200ml" },
          { "nome": "Pão integral", "quantidade": "1 fatia (25g)" }
        ],
        "observacoes": "opcional"
      }
    ],
    "observacoes": "observações gerais da refeição"
  }
]

Regras:
- tipo: apenas "cafe", "almoco", "lanche" ou "jantar"
- Inclua todas as opções de cada refeição (Opção 1, Opção 2, etc)
- horario: no formato HH:MM
- Se não encontrar o horário, use: cafe=06:30, almoco=12:00, lanche=15:30, jantar=19:30`;

  const resposta = await chamarGroq(prompt);

  try {
    const limpo = resposta.replace(/```json|```/g, "").trim();
    return JSON.parse(limpo);
  } catch {
    console.error("Erro ao parsear refeições do Groq:", resposta);
    return [];
  }
}
