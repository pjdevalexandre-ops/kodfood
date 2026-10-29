import { HorarioFuncionamento } from '@/tipos';

export function formatarPreco(precoCentavos: number): string {
  const reais = precoCentavos / 100;
  return reais.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatarTelefone(telefone: string): string {
  const apenasNumeros = telefone.replace(/\D/g, '');

  if (apenasNumeros.length === 11) {
    return apenasNumeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }

  if (apenasNumeros.length === 10) {
    return apenasNumeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }

  return telefone;
}

export function aplicarMascaraTelefone(valor: string): string {
  const numeros = valor.replace(/\D/g, '').substring(0, 11);

  if (numeros.length === 0) return '';
  if (numeros.length <= 2) return `(${numeros}`;
  if (numeros.length <= 6) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  if (numeros.length <= 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
}

export function converterTextoMoedaParaCentavos(valorTexto: string): number {
  const limpo = valorTexto.replace(/\D/g, '');
  if (!limpo) return 0;
  return parseInt(limpo, 10);
}

export function formatarMoedaDigitada(valorCentavos: number): string {
  if (valorCentavos <= 0) return '';
  return (valorCentavos / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export interface StatusFuncionamento {
  aberta: boolean;
  rotulo: string;
  mensagem: string;
}

export function obterStatusLoja(
  aberta: boolean,
  horarios: HorarioFuncionamento[] = []
): StatusFuncionamento {
  const agora = new Date();
  const diaSemanaHoje = agora.getDay(); // 0 = domingo

  const horarioHoje = horarios.find((h) => h.dia_semana === diaSemanaHoje);

  if (aberta) {
    if (horarioHoje) {
      return {
        aberta: true,
        rotulo: 'Aberta agora',
        mensagem: `Fecha às ${horarioHoje.fecha.substring(0, 5)}`,
      };
    }
    return {
      aberta: true,
      rotulo: 'Aberta agora',
      mensagem: 'Recebendo pedidos',
    };
  }

  // Se estiver fechada
  if (horarioHoje) {
    const horaAbertura = horarioHoje.abre.substring(0, 5);
    return {
      aberta: false,
      rotulo: 'Fechada no momento',
      mensagem: `Estamos fechados. Abrimos hoje às ${horaAbertura}.`,
    };
  }

  // Se não abre hoje, busca o próximo dia que abre
  for (let offset = 1; offset <= 7; offset++) {
    const proximoDia = (diaSemanaHoje + offset) % 7;
    const horarioProx = horarios.find((h) => h.dia_semana === proximoDia);
    if (horarioProx) {
      const diasNomes = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
      const diaNome = offset === 1 ? 'amanhã' : diasNomes[proximoDia];
      const horaAbertura = horarioProx.abre.substring(0, 5);
      return {
        aberta: false,
        rotulo: 'Fechada no momento',
        mensagem: `Estamos fechados. Abrimos ${diaNome} às ${horaAbertura}.`,
      };
    }
  }

  return {
    aberta: false,
    rotulo: 'Fechada no momento',
    mensagem: 'Estamos fechados no momento.',
  };
}

export function formatarDataHora(dataIso: string): string {
  try {
    const data = new Date(dataIso);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dataIso;
  }
}

