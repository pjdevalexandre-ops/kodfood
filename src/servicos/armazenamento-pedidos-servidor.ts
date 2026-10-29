import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Fallback em memória para ambientes serverless
declare global {
  // eslint-disable-next-line no-var
  var __kodfood_pedidos_memoria: any[] | undefined;
}

if (!globalThis.__kodfood_pedidos_memoria) {
  globalThis.__kodfood_pedidos_memoria = [];
}

function obterCaminhoArquivo(): string {
  // Se for ambiente local, tenta usar ./dados/pedidos.json
  const caminhoLocal = join(process.cwd(), 'dados', 'pedidos.json');
  try {
    const dirDados = join(process.cwd(), 'dados');
    if (!existsSync(dirDados)) {
      mkdirSync(dirDados, { recursive: true });
    }
    return caminhoLocal;
  } catch {
    // Se falhar (ex.: sistema de arquivos somente-leitura na Vercel), usa /tmp
    return join(tmpdir(), 'kodfood-pedidos.json');
  }
}

export function lerPedidosDoServidor(): any[] {
  try {
    const caminho = obterCaminhoArquivo();
    if (existsSync(caminho)) {
      const conteudo = readFileSync(caminho, 'utf-8');
      const parsed = JSON.parse(conteudo);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Fallback para memória na leitura de pedidos:', e);
  }
  return globalThis.__kodfood_pedidos_memoria || [];
}

export function salvarPedidosNoServidor(pedidos: any[]): void {
  globalThis.__kodfood_pedidos_memoria = pedidos;
  try {
    const caminho = obterCaminhoArquivo();
    writeFileSync(caminho, JSON.stringify(pedidos, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Escrita em disco não permitida (ambiente serverless), salvo em memória:', e);
  }
}
