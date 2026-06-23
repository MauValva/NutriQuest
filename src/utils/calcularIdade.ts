export function calcularIdade(nascimento?: string | null) {
  if (!nascimento) return "";

  const hoje = new Date();
  const nasc = new Date(nascimento);

  let idade = hoje.getFullYear() - nasc.getFullYear();

  const mes = hoje.getMonth() - nasc.getMonth();

  if (mes < 0 || (mes === 0 && hoje.getDate() < nasc.getDate())) {
    idade--;
  }

  return String(idade);
}
