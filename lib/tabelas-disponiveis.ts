export interface TabelaDisponivel {
  id: string;
  nome: string;
  operadora: string;
  arquivo: string;
  descricao?: string;
}

export const tabelasDisponiveis: TabelaDisponivel[] = [
  {
    "id": "biovida-sa-de-spabc-copart-parcial-html",
    "nome": "Geral - BIOVIDA SAÚDE-SPABC-COPART-PARCIAL",
    "operadora": "Geral",
    "arquivo": "/tabelas-html/BIOVIDA SAÚDE-SPABC-COPART-PARCIAL.html",
    "descricao": "Atualizado em 21/01/2026, 22:39:10"
  }
];

export function getOperadorasDisponiveis() { return Array.from(new Set(tabelasDisponiveis.map(t => t.operadora))).sort(); }
export function filtrarPorOperadora(op: string) { return (!op || op === 'Todos') ? tabelasDisponiveis : tabelasDisponiveis.filter(t => t.operadora === op); }
export function buscarTabelaPorId(id: string) { return tabelasDisponiveis.find(t => t.id === id); }
export function buscarTabelas(termo: string) { 
  if (!termo) return tabelasDisponiveis;
  const t = termo.toLowerCase(); 
  return tabelasDisponiveis.filter(x => x.nome.toLowerCase().includes(t) || x.operadora.toLowerCase().includes(t)); 
}