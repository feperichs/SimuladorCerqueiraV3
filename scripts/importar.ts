import * as fs from 'fs';
import * as path from 'path';

// --- CONFIGURAÇÃO ---
// Arquivo onde os dados serão INSERIDOS (o banco de dados principal)
const ARQUIVO_DESTINO = path.join(process.cwd(), 'lib', 'planos-completos.ts');

const executar = () => {
    // 1. Pegar o caminho do arquivo passado no comando
    const caminhoRelativo = process.argv[2];

    if (!caminhoRelativo) {
        console.error('❌ ERRO: Informe o caminho do arquivo .ts que contém os novos planos.');
        console.log('👉 Exemplo: npx ts-node scripts/importar.ts valores/amil/amilbronze.ts');
        process.exit(1);
    }

    const caminhoOrigem = path.resolve(process.cwd(), caminhoRelativo);

    // 2. Validar se o arquivo de origem existe
    if (!fs.existsSync(caminhoOrigem)) {
        console.error(`❌ ERRO: Arquivo não encontrado: ${caminhoOrigem}`);
        process.exit(1);
    }

    console.log(`📂 Lendo arquivo de origem: ${caminhoRelativo}...`);
    
    // 3. Ler e Limpar o conteúdo (remover comentários //)
    let conteudoNovosPlanos = fs.readFileSync(caminhoOrigem, 'utf-8');

    // Remove linhas que começam com // (comentários)
    conteudoNovosPlanos = conteudoNovosPlanos.replace(/\/\/.*$/gm, '');
    
    // Remove espaços em branco excessivos no começo e fim
    conteudoNovosPlanos = conteudoNovosPlanos.trim();

    // Remove vírgula no final se houver (para evitar duplicidade na injeção)
    if (conteudoNovosPlanos.endsWith(',')) {
        conteudoNovosPlanos = conteudoNovosPlanos.slice(0, -1);
    }

    if (conteudoNovosPlanos.length < 10) {
        console.error('⚠️ O arquivo parece estar vazio ou não contém dados válidos.');
        process.exit(1);
    }

    // 4. Ler o arquivo de Destino (planos-completos.ts)
    if (!fs.existsSync(ARQUIVO_DESTINO)) {
        console.error('❌ ERRO CRÍTICO: O arquivo lib/planos-completos.ts não foi encontrado.');
        process.exit(1);
    }

    const conteudoDestino = fs.readFileSync(ARQUIVO_DESTINO, 'utf-8');

    // --- LÓGICA INTELIGENTE DE INJEÇÃO ---
    // Encontrar onde começa o array: export const planos = [
    const regexInicio = /export\s+const\s+planos\s*(:\s*\w+\[\])?\s*=\s*\[/;
    const matchInicio = conteudoDestino.match(regexInicio);

    if (!matchInicio || matchInicio.index === undefined) {
        console.error('❌ ERRO: Não encontrei a lista "export const planos = [" no arquivo de destino.');
        process.exit(1);
    }

    const indexInicioArray = matchInicio.index + matchInicio[0].length;

    // Contar colchetes para achar o fechamento correto ]
    let contador = 1; 
    let indexFechamento = -1;

    for (let i = indexInicioArray; i < conteudoDestino.length; i++) {
        if (conteudoDestino[i] === '[') contador++;
        if (conteudoDestino[i] === ']') contador--;

        if (contador === 0) {
            indexFechamento = i;
            break;
        }
    }

    if (indexFechamento === -1) {
        console.error('❌ ERRO: Estrutura do arquivo de destino inválida (colchetes não fecham).');
        process.exit(1);
    }

    // 5. Preparar a injeção
    const dataHoje = new Date().toLocaleString('pt-BR');
    const nomeArquivo = path.basename(caminhoOrigem);
    
    // Adiciona um comentário para separar a importação
    const cabecalho = `\n\n  // --- IMPORTADO DE: ${nomeArquivo} em ${dataHoje} --- \n`;
    
    // Verifica se precisa de vírgula antes (se o array não estava vazio)
    const textoAntes = conteudoDestino.substring(indexInicioArray, indexFechamento).trim();
    const precisaVirgula = (textoAntes.length > 0 && !textoAntes.endsWith(',')) ? ',' : '';

    // Monta o novo conteúdo
    const novoArquivoFinal = 
        conteudoDestino.slice(0, indexFechamento) + 
        precisaVirgula + 
        cabecalho + 
        conteudoNovosPlanos + 
        conteudoDestino.slice(indexFechamento);

    // 6. Salvar
    fs.writeFileSync(ARQUIVO_DESTINO, novoArquivoFinal, 'utf-8');

    console.log(`✅ SUCESSO! Conteúdo de "${nomeArquivo}" injetado em "planos-completos.ts".`);
};

executar();