import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

// --- CONFIGURAÇÕES DE DIRETÓRIOS ---
const PASTA_HTML_PUBLIC = path.join(process.cwd(), 'public', 'tabelas-html'); // Lê daqui
const PASTA_SAIDA_VALORES = path.join(process.cwd(), 'valores');              // Salva backup aqui
const ARQUIVO_SISTEMA = path.join(process.cwd(), 'lib', 'planos-completos.ts'); // Injega aqui

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
    console.log('🚀 Iniciando Processo Híbrido: Extração + Injeção...');

    // 1. Validações de Pastas
    if (!fs.existsSync(PASTA_HTML_PUBLIC)) {
        console.error('❌ Erro: Pasta public/tabelas-html não encontrada.');
        process.exit(1);
    }
    if (!fs.existsSync(ARQUIVO_SISTEMA)) {
        console.error('❌ Erro: Arquivo lib/planos-completos.ts não encontrado.');
        process.exit(1);
    }
    if (!fs.existsSync(PASTA_SAIDA_VALORES)) {
        console.log(`📁 Criando pasta 'valores' para backup...`);
        fs.mkdirSync(PASTA_SAIDA_VALORES, { recursive: true });
    }

    const arquivos = fs.readdirSync(PASTA_HTML_PUBLIC).filter(f => f.endsWith('.html'));
    
    if (arquivos.length === 0) {
        console.log('⚠️ Nenhum HTML encontrado em public/tabelas-html.');
        return;
    }

    console.log(`📦 Processando ${arquivos.length} arquivos...`);

    const todosOsPlanosParaInjecao: any[] = [];

    // 2. Loop de Processamento
    arquivos.forEach(arquivo => {
        const html = fs.readFileSync(path.join(PASTA_HTML_PUBLIC, arquivo), 'utf-8');
        const $ = cheerio.load(html);

        let operadoraNome = "Operadora";
        const logoTexto = $('.operadora .bloco .logotipo p.fz-12').first().text();
        if (logoTexto) operadoraNome = logoTexto.split('-')[0].trim();

        const planosDesteArquivo: any[] = [];

        // Extrai Tabelas
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
                if (Object.keys(p.precos).length > 0) {
                    planosDesteArquivo.push(p);
                    todosOsPlanosParaInjecao.push(p); // Adiciona na lista geral
                }
            });
        });

        // 3. SALVAR NA PASTA VALORES (O PEDIDO IMPORTANTE)
        if (planosDesteArquivo.length > 0) {
            const nomeTs = arquivo.replace('.html', '.ts');
            const caminhoValor = path.join(PASTA_SAIDA_VALORES, nomeTs);
            const conteudoTs = planosDesteArquivo.map(p => JSON.stringify(p, null, 2)).join(',\n\n');
            
            fs.writeFileSync(caminhoValor, conteudoTs);
            console.log(`   ✅ Backup criado: valores/${nomeTs}`);
        }
    });

    if (todosOsPlanosParaInjecao.length === 0) {
        console.log('⚠️ Nenhum dado válido extraído.');
        return;
    }

    // 4. INJETAR NO PLANOS-COMPLETOS.TS (O PEDIDO FUNCIONAL)
    console.log(`💾 Injetando ${todosOsPlanosParaInjecao.length} planos no arquivo principal...`);
    
    const conteudoAtual = fs.readFileSync(ARQUIVO_SISTEMA, 'utf-8');
    const regexInicio = /export\s+const\s+planos\s*(:\s*\w+\[\])?\s*=\s*\[/;
    const matchInicio = conteudoAtual.match(regexInicio);

    if (!matchInicio || matchInicio.index === undefined) {
        console.error('❌ Erro crítico: Não achei a lista de planos no arquivo .ts');
        process.exit(1);
    }

    const indexInicioArray = matchInicio.index + matchInicio[0].length;
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
        console.error('❌ Erro: Estrutura do arquivo inválida.');
        process.exit(1);
    }

    // Formata o JSON removendo os colchetes externos para concatenar
    let jsonFinal = JSON.stringify(todosOsPlanosParaInjecao, null, 2);
    jsonFinal = jsonFinal.substring(1, jsonFinal.length - 1); // Tira [ e ]

    const dataHoje = new Date().toLocaleString('pt-BR');
    const cabecalho = `\n\n  // --- IMPORTAÇÃO AUTOMÁTICA: ${dataHoje} --- \n`;

    const textoAntes = conteudoAtual.substring(indexInicioArray, indexFechamento).trim();
    const precisaVirgula = (textoAntes.length > 0 && !textoAntes.endsWith(',')) ? ',' : '';

    const novoConteudo = 
        conteudoAtual.slice(0, indexFechamento) + 
        precisaVirgula + 
        cabecalho + 
        jsonFinal + 
        conteudoAtual.slice(indexFechamento);

    fs.writeFileSync(ARQUIVO_SISTEMA, novoConteudo, 'utf-8');

    console.log(`🎉 SUCESSO TOTAL!`);
    console.log(`1. Arquivos individuais salvos em: /valores`);
    console.log(`2. Sistema atualizado em: lib/planos-completos.ts`);
};

executar();