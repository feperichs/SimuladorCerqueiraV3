import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

// --- CONFIGURAÇÕES DE DIRETÓRIOS ---
const PASTA_ORIGEM_LIMPA = path.join(process.cwd(), 'tabelas-html');
const PASTA_DESTINO_PUBLIC = path.join(process.cwd(), 'public', 'tabelas-html');
const ARQUIVO_TS_CONFIG = path.join(process.cwd(), 'lib', 'tabelas-disponiveis.ts');

const moverESincronizar = () => {
    console.log('🚀 Iniciando processo de Mover e Sincronizar...');

    // --- ETAPA 1: GARANTIR QUE AS PASTAS EXISTEM ---
    if (!fs.existsSync(PASTA_DESTINO_PUBLIC)) {
        console.log(`📁 Criando pasta pública: ${PASTA_DESTINO_PUBLIC}`);
        fs.mkdirSync(PASTA_DESTINO_PUBLIC, { recursive: true });
    }

    if (!fs.existsSync(ARQUIVO_TS_CONFIG)) {
        console.error(`❌ Erro: Arquivo de configuração não encontrado: ${ARQUIVO_TS_CONFIG}`);
        process.exit(1);
    }

    // --- ETAPA 2: MOVER ARQUIVOS DA RAIZ PARA PUBLIC ---
    if (fs.existsSync(PASTA_ORIGEM_LIMPA)) {
        const arquivosNaRaiz = fs.readdirSync(PASTA_ORIGEM_LIMPA).filter(f => f.endsWith('.html'));
        
        if (arquivosNaRaiz.length > 0) {
            console.log(`📦 Movendo ${arquivosNaRaiz.length} arquivos para a pasta Public...`);
            arquivosNaRaiz.forEach(arquivo => {
                const origem = path.join(PASTA_ORIGEM_LIMPA, arquivo);
                const destino = path.join(PASTA_DESTINO_PUBLIC, arquivo);
                fs.copyFileSync(origem, destino);
                fs.unlinkSync(origem);
                console.log(`   -> Movido: ${arquivo}`);
            });
        }
    }

    // --- ETAPA 3: SINCRONIZAR COM O ARQUIVO TS ---
    const arquivosFinais = fs.readdirSync(PASTA_DESTINO_PUBLIC).filter(f => f.endsWith('.html'));
    let conteudoTs = fs.readFileSync(ARQUIVO_TS_CONFIG, 'utf-8');
    
    let novosCadastros = 0;
    const novasEntradas: string[] = [];

    arquivosFinais.forEach(arquivo => {
        const caminhoPublico = `/tabelas-html/${arquivo}`;
        
        // Se já está no TS, ignora
        if (conteudoTs.includes(caminhoPublico)) return;

        console.log(`📝 Cadastrando no sistema: ${arquivo}`);
        
        const pathHtml = path.join(PASTA_DESTINO_PUBLIC, arquivo);
        const htmlContent = fs.readFileSync(pathHtml, 'utf-8');
        const $ = cheerio.load(htmlContent);

        let nomeBonito = $('.operadora .bloco .logotipo p.fz-12').first().text().trim();
        let operadora = "Geral";
        
        if (!nomeBonito) {
            nomeBonito = $('title').text().replace(':: Simulador Online', '').trim() || arquivo.replace('.html', '');
        }

        if (nomeBonito.includes('-')) {
            operadora = nomeBonito.split('-')[0].trim();
        } else if (nomeBonito.includes(' ')) {
            operadora = nomeBonito.split(' ')[0].trim();
        }

        const id = arquivo.replace('.html', '').toLowerCase().replace(/[^a-z0-9]/g, '-');

        const novaEntrada = `
  {
    id: '${id}',
    nome: '${nomeBonito}',
    operadora: '${operadora}',
    arquivo: '${caminhoPublico}',
    descricao: 'Importado em ${new Date().toLocaleDateString()}'
  }`;
        novasEntradas.push(novaEntrada);
        novosCadastros++;
    });

    if (novosCadastros === 0) {
        console.log('✅ Tudo atualizado. Nenhuma tabela nova para registrar.');
        return;
    }

    // --- CORREÇÃO AQUI: REGEX MAIS ROBUSTA ---
    // Agora aceita opcionalmente a parte ": Tipo[]" antes do "="
    // Procura por: export const NOME (: Tipo)? = [
    const regexInicio = /export\s+const\s+\w+(\s*:\s*[^=]+)?\s*=\s*\[/;
    const matchInicio = conteudoTs.match(regexInicio);

    if (!matchInicio || matchInicio.index === undefined) {
        console.error('❌ Erro: Não encontrei a lista "export const ... = [" no arquivo TS.');
        console.log('Verifique se o arquivo tabelas-disponiveis.ts tem a declaração correta da array.');
        process.exit(1);
    }

    const indexInicioArray = matchInicio.index + matchInicio[0].length;
    
    let contador = 1;
    let indexFechamento = -1;
    for (let i = indexInicioArray; i < conteudoTs.length; i++) {
        if (conteudoTs[i] === '[') contador++;
        if (conteudoTs[i] === ']') contador--;
        if (contador === 0) {
            indexFechamento = i;
            break;
        }
    }

    if (indexFechamento === -1) {
        console.error('❌ Erro: Estrutura do arquivo TS inválida (colchetes não fecham).');
        process.exit(1);
    }

    const textoAntes = conteudoTs.substring(indexInicioArray, indexFechamento).trim();
    const precisaVirgula = (textoAntes.length > 0 && !textoAntes.endsWith(',')) ? ',' : '';
    
    const novoConteudo = 
        conteudoTs.slice(0, indexFechamento) + 
        precisaVirgula + 
        novasEntradas.join(',') + '\n' +
        conteudoTs.slice(indexFechamento);

    fs.writeFileSync(ARQUIVO_TS_CONFIG, novoConteudo, 'utf-8');

    console.log(`🎉 SUCESSO! ${novosCadastros} novas tabelas registradas no arquivo TS.`);
};

moverESincronizar();