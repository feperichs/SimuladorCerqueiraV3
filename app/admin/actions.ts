'use server'

import { revalidatePath } from 'next/cache';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

// --- TIPAGEM ---
export interface PlanoExtraido {
    id: string;
    operadora: string;
    nome: string;
    tipo: string;
    acomodacao: string;
    coparticipacao: string;
    vidas: string;
    precos: Record<string, number>;
}

export interface ResultadoProcessamento {
    success: boolean;
    message: string;
    details?: string[];
    planos?: PlanoExtraido[];
}

// --- UTILITÁRIOS ---
const limparPreco = (v: string) => {
    if (!v) return 0;
    const limpo = v.replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    const numero = parseFloat(limpo);
    return isNaN(numero) ? 0 : numero;
};

const gerarId = (nome: string, operadora: string, acomodacao: string, vidas: string) => {
    const texto = `${operadora}-${nome}-${acomodacao}-${vidas}`.toLowerCase();
    const clean = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');
    return clean + '-' + Math.floor(Math.random() * 1000);
};

const dataHoje = () => new Date().toLocaleString('pt-BR');

// --- 1. PROCESSAR HTML (VISUAL) ---
const processarHTML = (htmlSujo: string): string => {
    const $ = cheerio.load(htmlSujo);
    
    // Limpeza profunda
    $('script, style, link, meta, iframe, noscript').remove();
    $('*').removeAttr('style').removeAttr('class').removeAttr('width').removeAttr('height').removeAttr('bgcolor').removeAttr('align').removeAttr('valign').removeAttr('border').removeAttr('cellspacing').removeAttr('cellpadding').removeAttr('onclick');

    // CSS PREMIUM
    const estilo = `
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        :root { --primary: #2563eb; --surface: #ffffff; --background: #f8fafc; --border: #e2e8f0; --text-main: #0f172a; --header-bg: #f8fafc; }
        body { font-family: 'Inter', sans-serif; background: var(--background); color: var(--text-main); line-height: 1.5; margin: 0; padding: 40px 20px; }
        .wrapper { max-width: 1200px; margin: 0 auto; background: var(--surface); border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); padding: 40px; }
        h1, h2, h3 { color: var(--text-main); font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; }
        .table-container { width: 100%; overflow-x: auto; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 32px; background: var(--surface); }
        table { width: 100%; border-collapse: collapse; font-size: 0.875rem; white-space: nowrap; }
        thead, tr:first-child { background: var(--header-bg); position: sticky; top: 0; z-index: 10; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border); }
        th, tr:first-child td { font-weight: 600; text-transform: uppercase; font-size: 0.75rem; background: var(--header-bg); }
        td:not(:first-child) { font-family: 'JetBrains Mono', monospace; text-align: center; }
        tr:nth-child(even) { background-color: #fafafa; }
        td:first-child { font-weight: 500; position: sticky; left: 0; background: inherit; z-index: 5; border-right: 1px solid var(--border); }
    </style>`;

    const corpo = $('body').html() || '';
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Tabela</title>${estilo}</head><body><div class="wrapper">${corpo.replace(/<table/g, '<div class="table-container"><table').replace(/<\/table>/g, '</table></div>')}</div></body></html>`;
};

// --- 2. EXTRAÇÃO ---
const extrairPlanosDoHtml = ($: cheerio.CheerioAPI, nomeArquivo: string): PlanoExtraido[] => {
    const planosEncontrados: PlanoExtraido[] = [];
    const textoBody = $('body').text().toLowerCase();
    
    let operadoraGlobal = "Geral";
    if (textoBody.includes('amil') || nomeArquivo.toLowerCase().includes('amil')) operadoraGlobal = "Amil";
    else if (textoBody.includes('bradesco')) operadoraGlobal = "Bradesco";
    else if (textoBody.includes('sulamerica') || textoBody.includes('sul américa')) operadoraGlobal = "SulAmérica";
    else if (textoBody.includes('hapvida')) operadoraGlobal = "Hapvida";
    else if (textoBody.includes('notre')) operadoraGlobal = "NotreDame";

    $('table').each((_, tabela) => {
        const $tabela = $(tabela);
        const linhas = $tabela.find('tr');
        if (linhas.length < 3) return; 

        const contexto = ($tabela.prevAll().slice(0, 8).text() + " " + $(linhas[0]).text()).toLowerCase();
        
        const acomodacao = /apartamento|apto|privativo/i.test(contexto) ? "Apartamento" : "Enfermaria";
        const tipo = /compuls[oó]rio/i.test(contexto) ? "Compulsório" : "Livre Adesão";
        const coparticipacao = /sem copar/i.test(contexto) ? "Sem Coparticipação" : "Com Coparticipação";
        
        let vidas = "02 a 29 vidas"; 
        if (/29/.test(contexto) && !/99/.test(contexto)) vidas = "02 a 29 vidas";
        else if (/99/.test(contexto)) vidas = "30 a 99 vidas";
        else if (/\+/i.test(contexto) || /livre adesão/i.test(contexto)) vidas = "02 a 29 vidas";

        let indexPrecos = -1;
        linhas.each((i, tr) => {
            const txt = $(tr).find('td').first().text().trim();
            if (/^\d{1,2}\s*[-a]\s*\d{1,2}/.test(txt) || /59/.test(txt)) {
                if (indexPrecos === -1) indexPrecos = i;
            }
        });

        if (indexPrecos === -1) return;

        const linhaNomes = $(linhas[indexPrecos - 1]);
        const nomesPlanos: string[] = [];
        
        linhaNomes.find('td, th').each((idx, col) => {
            if (idx > 0) { 
                let n = $(col).text().trim().replace(/\s+/g, ' ');
                if (!n) {
                    const headerAnterior = $(linhas[indexPrecos - 2]).find('td, th').eq(idx).text().trim();
                    n = headerAnterior || `Plano ${idx}`;
                }
                nomesPlanos.push(n);
            }
        });

        const planosTemp = nomesPlanos.map(nome => ({
            id: gerarId(nome, operadoraGlobal, acomodacao, vidas),
            operadora: operadoraGlobal,
            nome: nome,
            tipo, acomodacao, coparticipacao, vidas,
            precos: {} as Record<string, number>
        }));

        let temDados = false;
        linhas.slice(indexPrecos).each((_, tr) => {
            const cols = $(tr).find('td');
            const txtFaixa = $(cols[0]).text().trim();
            let faixaKey = "";
            const nums = txtFaixa.match(/\d+/g);
            
            if (txtFaixa.includes('+') || (nums && parseInt(nums[0]) >= 59)) faixaKey = "59+";
            else if (nums && nums.length >= 2) faixaKey = `${nums[0]}-${nums[1]}`; 

            if (faixaKey) {
                cols.slice(1).each((idx, td) => {
                    if (planosTemp[idx]) {
                        const val = limparPreco($(td).text());
                        if (val > 10) { 
                            planosTemp[idx].precos[faixaKey] = val;
                            temDados = true;
                        }
                    }
                });
            }
        });

        if (temDados) {
            planosTemp.forEach(p => {
                if (Object.keys(p.precos).length > 0) planosEncontrados.push(p);
            });
        }
    });

    return planosEncontrados;
};

// --- AÇÃO PRINCIPAL ---
export async function processarUpload(formData: FormData): Promise<ResultadoProcessamento> {
    const file = formData.get('file') as File;
    if (!file) return { success: false, message: 'Arquivo inválido' };

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const rawHtml = buffer.toString('utf-8');
        const fileName = file.name;

        // PATHS
        const DIR_PUBLIC = path.join(process.cwd(), 'public', 'tabelas-html');
        const FILE_DB_PLANOS = path.join(process.cwd(), 'lib', 'db-planos.json'); // Backup
        const FILE_DB_MENU = path.join(process.cwd(), 'lib', 'db-menu.json');     // Backup
        const FILE_TS_PLANOS = path.join(process.cwd(), 'lib', 'planos-completos.ts'); // ARQUIVO VIVO
        const FILE_TS_MENU = path.join(process.cwd(), 'lib', 'tabelas-disponiveis.ts'); // ARQUIVO VIVO

        if (!fs.existsSync(DIR_PUBLIC)) fs.mkdirSync(DIR_PUBLIC, { recursive: true });

        // 1. Salvar HTML Visual
        const htmlLimpo = processarHTML(rawHtml);
        fs.writeFileSync(path.join(DIR_PUBLIC, fileName), htmlLimpo);

        // 2. Extrair Dados
        const $ = cheerio.load(htmlLimpo);
        const novosPlanos = extrairPlanosDoHtml($, fileName);

        if (novosPlanos.length === 0) {
            return { success: false, message: 'HTML salvo, mas nenhum plano identificado.' };
        }

        // =================================================================================
        // ESTRATÉGIA SEGURA: Dados Puros sem Imports
        // =================================================================================

        // 3. Atualizar Banco JSON (Backup)
        let planosAtuais: any[] = [];
        if (fs.existsSync(FILE_DB_PLANOS)) {
            try { planosAtuais = JSON.parse(fs.readFileSync(FILE_DB_PLANOS, 'utf-8')); } catch (e) {}
        }
        
        // Adiciona novos planos no TOPO e Salva
        const todosPlanos = [...novosPlanos, ...planosAtuais];
        fs.writeFileSync(FILE_DB_PLANOS, JSON.stringify(todosPlanos, null, 2));

        // 4. REESCREVER ARQUIVO TS (planos-completos.ts)
        // ATENÇÃO: Aqui removemos qualquer importação de 'fs' ou 'path'
        const conteudoTS = `
// ARQUIVO GERADO AUTOMATICAMENTE
// NÃO EDITE MANUALMENTE

export interface Plano {
  id: string;
  operadora: string;
  nome: string;
  tipo: string;
  acomodacao: string;
  coparticipacao: string;
  vidas: string;
  precos: Record<string, number>;
}

export const planos: Plano[] = ${JSON.stringify(todosPlanos, null, 2)};
`;
        fs.writeFileSync(FILE_TS_PLANOS, conteudoTS.trim());


        // 5. Atualizar Menu JSON (Backup)
        let menuAtual: any[] = [];
        if (fs.existsSync(FILE_DB_MENU)) {
            try { menuAtual = JSON.parse(fs.readFileSync(FILE_DB_MENU, 'utf-8')); } catch (e) {}
        }

        const link = `/tabelas-html/${fileName}`;
        if (!menuAtual.find((m: any) => m.arquivo === link)) {
            const novoItem = {
                id: fileName.replace(/\./g, '-').toLowerCase(),
                nome: `${novosPlanos[0].operadora} - ${fileName.replace('.html', '')}`,
                operadora: novosPlanos[0].operadora,
                arquivo: link,
                descricao: `Importado em ${dataHoje()}`
            };
            menuAtual.unshift(novoItem);
            fs.writeFileSync(FILE_DB_MENU, JSON.stringify(menuAtual, null, 2));
        }

        // 6. REESCREVER ARQUIVO TS (tabelas-disponiveis.ts)
        // Aqui também usamos dados puros
        const conteudoMenuTS = `
// ARQUIVO GERADO AUTOMATICAMENTE

export interface TabelaDisponivel {
  id: string;
  nome: string;
  operadora: string;
  arquivo: string;
  descricao?: string;
}

export const tabelasDisponiveis: TabelaDisponivel[] = ${JSON.stringify(menuAtual, null, 2)};

export function getOperadorasDisponiveis(): string[] {
  const operadoras = Array.from(new Set(tabelasDisponiveis.map(t => t.operadora)));
  return operadoras.sort();
}

export function filtrarPorOperadora(operadora: string): TabelaDisponivel[] {
  if (operadora === 'Todos' || !operadora) return tabelasDisponiveis;
  return tabelasDisponiveis.filter(t => t.operadora === operadora);
}

export function buscarTabelaPorId(id: string): TabelaDisponivel | undefined {
  return tabelasDisponiveis.find(t => t.id === id);
}

export function buscarTabelas(termo: string): TabelaDisponivel[] {
  if (!termo) return tabelasDisponiveis;
  const termoLower = termo.toLowerCase();
  return tabelasDisponiveis.filter(t => 
    t.nome.toLowerCase().includes(termoLower) ||
    t.operadora.toLowerCase().includes(termoLower)
  );
}
`;
        fs.writeFileSync(FILE_TS_MENU, conteudoMenuTS.trim());

        revalidatePath('/tabelas');
        revalidatePath('/');

        return { 
            success: true, 
            message: 'Importação Concluída!',
            details: [`Tabela salva em ${link}`, `${novosPlanos.length} planos disponíveis.`],
            planos: novosPlanos
        };

    } catch (error: any) {
        console.error(error);
        return { success: false, message: `Erro: ${error.message}` };
    }
}