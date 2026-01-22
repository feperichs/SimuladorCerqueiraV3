import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

// --- CONFIGURAÇÕES ---
// Lê os HTMLs que já estão na pasta pública (final)
const PASTA_ORIGEM = path.join(process.cwd(), 'public', 'tabelas-html');
// Salva direto no arquivo do sistema
const ARQUIVO_DESTINO = path.join(process.cwd(), 'lib', 'planos-completos.ts');

// --- FUNÇÕES AUXILIARES ---
const limparPreco = (valor: string): number => {
    if (!valor) return 0;
    return parseFloat(valor.replace('R$', '').trim().replace(/\./g, '').replace(',', '.'));
};

const gerarId = (nome: string, operadora: string): string => {
    const base = `${operadora}-${nome}`.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-');
    return `${base}-${Math.floor(Math.random() * 10000)}`;
};

const mapearFaixaEtaria = (texto: string): string => {
    const numeros = texto.match(/\d+/g);
    if (texto.includes('+') || (numeros && parseInt(numeros[0]) >= 59)) return "59+";
    if (numeros && numeros.length >= 2) return `${numeros[0]}-${numeros[1]}`;
    return "59+"; 
};

// --- PROCESSO PRINCIPAL ---
const executar = () => {
    console.log('🚀 Iniciando Importação Direta (HTML -> Planos Completos)...');

    // 1. Validações
    if (!fs.existsSync(PASTA_ORIGEM)) {
        console.error('❌ Erro: Pasta public/tabelas-html não encontrada.');
        process.exit(1);
    }
    if (!fs.existsSync(ARQUIVO_DESTINO)) {
        console.error('❌ Erro: Arquivo lib/planos-completos.ts não encontrado.');
        process.exit(1);
    }

    const arquivos = fs.readdirSync(PASTA_ORIGEM).filter(f => f.endsWith('.html'));
    
    if (arquivos.length === 0) {
        console.log('⚠️ Nenhum HTML encontrado para importar.');
        return;
    }

    console.log(`📦 Processando ${arquivos.length} arquivos...`);

    const todosNovosPlanos: any[] = [];

    // 2. Extração de Dados
    arquivos.forEach(arquivo => {
        const html = fs.readFileSync(path.join(PASTA_ORIGEM, arquivo), 'utf-8');
        const $ = cheerio.load(html);

        let operadoraNome = "Operadora";
        const logoTexto = $('.operadora .bloco .logotipo p.fz-12').first().text();
        if (logoTexto) operadoraNome = logoTexto.split('-')[0].trim();

        $('table.static.small.ta-c').each((_, tabela) => {
            const linhas = $(tabela).find('tr');
            const cabecalho = $(linhas[0]).text().toLowerCase();
            
            let acomodacao = "Enfermaria";
            if (cabecalho.includes('apartamento') || cabecalho.includes('(a)')) acomodacao = "Apartamento";

            const nomesPlanos: string[] = [];
            $(linhas[1]).find('td').each((idx, col) => {
                if (idx > 0) nomesPlanos.push($(col).text().trim());
            });

            const planosTemp = nomesPlanos.map(nome => ({
                id: gerarId(nome, operadoraNome),
                operadora: operadoraNome,
                nome: nome,
                tipo: "PME",
                acomodacao: acomodacao,
                coparticipacao: "Sem Coparticipação", 
                precos: {} as any
            }));

            linhas.slice(2).each((_, tr) => {
                const colunas = $(tr).find('td');
                const faixaTexto = $(colunas[0]).text().trim();
                if (faixaTexto) {
                    const faixa = mapearFaixaEtaria(faixaTexto);
                    colunas.slice(1).each((idx, td) => {
                        if (planosTemp[idx]) {
                            const val = limparPreco($(td).text());
                            if (val > 0) planosTemp[idx].precos[faixa] = val;
                        }
                    });
                }
            });

            planosTemp.forEach(p => {
                if (Object.keys(p.precos).length > 0) todosNovosPlanos.push(p);
            });
        });
    });

    if (todosNovosPlanos.length === 0) {
        console.log('⚠️ Nenhum dado válido extraído dos HTMLs.');
        return;
    }

    // 3. Injeção no Arquivo TS
    console.log(`💾 Injetando ${todosNovosPlanos.length} novos planos no sistema...`);
    
    const conteudoAtual = fs.readFileSync(ARQUIVO_DESTINO, 'utf-8');

    // Encontra onde começa e termina o array "planos"
    const regexInicio = /export\s+const\s+planos\s*(:\s*\w+\[\])?\s*=\s*\[/;
    const matchInicio = conteudoAtual.match(regexInicio);

    if (!matchInicio || matchInicio.index === undefined) {
        console.error('❌ Erro: Não encontrei a lista "export const planos = [" no arquivo.');
        process.exit(1);
    }

    const indexInicioArray = matchInicio.index + matchInicio[0].length;
    
    // Busca o fechamento correto ]
    let contador = 1;
    let indexFechamento = -1;
    for (let i = indexInicioArray; i < conteudoAtual.length; i++) {
        if (conteudoAtual[i] === '[') contador++;
        if (conteudoAtual[i] === ']') contador--;
        if (contador === 0) {
            indexFechamento = i;
            break;
        }
    }

    if (indexFechamento === -1) {
        console.error('❌ Erro: Estrutura do arquivo TS inválida.');
        process.exit(1);
    }

    // Prepara o texto para inserir
    const dataHoje = new Date().toLocaleString('pt-BR');
    const cabecalhoImportacao = `\n\n  // --- IMPORTAÇÃO MASSIVA: ${dataHoje} --- \n`;
    
    // Remove os colchetes externos do JSON gerado para inserir dentro do array existente
    let jsonNovos = JSON.stringify(todosNovosPlanos, null, 2);
    jsonNovos = jsonNovos.substring(1, jsonNovos.length - 1); // Remove [ e ]

    // Verifica virgula
    const textoAntes = conteudoAtual.substring(indexInicioArray, indexFechamento).trim();
    const precisaVirgula = (textoAntes.length > 0 && !textoAntes.endsWith(',')) ? ',' : '';

    const novoConteudo = 
        conteudoAtual.slice(0, indexFechamento) + 
        precisaVirgula + 
        cabecalhoImportacao + 
        jsonNovos + 
        conteudoAtual.slice(indexFechamento);

    fs.writeFileSync(ARQUIVO_DESTINO, novoConteudo, 'utf-8');

    console.log(`✅ SUCESSO! Todos os planos foram salvos em lib/planos-completos.ts`);
};

executar();