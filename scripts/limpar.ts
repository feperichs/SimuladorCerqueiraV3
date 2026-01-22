import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

// --- CONFIGURAÇÃO DOS DIRETÓRIOS ---
const DIR_ENTRADA = 'C:\\simuladorcerqueirav2\\tabelasuja';
const DIR_SAIDA = 'C:\\simuladorcerqueirav2\\tabelas-html';
const BASE_URL_ORIGINAL = 'https://app.simuladoronline.com';

// --- CSS MODERNO (DESIGN SYSTEM) ---
const MODERN_CSS = `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    /* --- RESET E BASE --- */
    * { box-sizing: border-box; }
    
    body {
      background-color: #f0f2f5; /* Fundo cinza moderno */
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1f2937; /* Cinza chumbo para texto (melhor que preto puro) */
      line-height: 1.6;
      margin: 0;
      padding: 40px 20px;
    }

    /* --- CONTAINER PRINCIPAL (CARD) --- */
    .geral-content, #geral-content, .geral {
      max-width: 1000px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    /* --- CABEÇALHOS --- */
    h1, h2, h3, h4 {
      color: #111827;
      font-weight: 700;
      margin-top: 0;
    }
    
    h4.margin {
      margin-top: 30px;
      margin-bottom: 15px;
      font-size: 1.25rem;
      border-left: 4px solid #2563eb; /* Detalhe azul na esquerda */
      padding-left: 12px;
    }

    /* --- TABELAS MODERNAS --- */
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-bottom: 25px;
      border: 1px solid #e5e7eb;
      border-radius: 8px; /* Arredonda a borda da tabela */
      overflow: hidden;
    }

    /* Células gerais */
    td, th {
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
      text-align: left;
      font-size: 0.9rem;
      vertical-align: middle;
    }

    /* Cabeçalho da Tabela (O HTML original usa .bgGray para headers) */
    .bgGray, tr.bgGray td {
      background-color: #1e293b !important; /* Azul escuro quase preto */
      color: #ffffff !important;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.8rem;
      letter-spacing: 0.05em;
      border-bottom: none;
    }
    
    /* Sub-cabeçalhos dentro do bgGray */
    .bgGray span { color: #fff; }

    /* Efeito zebrado e Hover */
    tr:nth-child(even) { background-color: #f9fafb; }
    tr:hover { background-color: #eff6ff; transition: background 0.2s; }
    
    /* Remove borda da última linha */
    tr:last-child td { border-bottom: none; }

    /* --- UTILITÁRIOS E CORREÇÕES --- */
    img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
    
    /* Centralização forçada para classes antigas */
    .ta-c { text-align: center !important; }
    .ta-l { text-align: left !important; }
    .ta-r { text-align: right !important; }
    
    /* Esconde elementos inúteis visualmente */
    .dn, .chatbot-iframe-container, .chatbot-toggle-button, nav, header .user-info { 
      display: none !important; 
    }
    
    /* Links desativados visualmente */
    a.disabled-link {
      color: #1f2937;
      text-decoration: none;
      cursor: default;
      pointer-events: none;
    }

    /* Estilizando a Logo e Header */
    header { 
      border-bottom: 2px solid #f3f4f6; 
      padding-bottom: 20px; 
      margin-bottom: 30px; 
      text-align: center;
    }
    
    .logotipo { margin-bottom: 10px; }

    /* Estilo para Preços */
    td:nth-child(n+2) { /* Colunas de valores */
      font-variant-numeric: tabular-nums; /* Alinha os números */
    }

    hr { border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0; }
    
    .footer {
      font-size: 0.8rem;
      color: #6b7280;
      text-align: center;
      margin-top: 40px;
    }
  </style>
`;

// --- A FUNÇÃO DE LIMPEZA ---
const cleanHtmlForConsultation = (htmlContent: string): string => {
  const $ = cheerio.load(htmlContent);

  // 1. Remove Scripts, Iframes e Lixo
  $('script').remove();
  $('noscript').remove();
  $('iframe').remove();
  $('base').remove();
  $('.chatbot-toggle-button, .banner, #banner-top-ct, .top-actions').remove();
  $('nav').remove(); // Remove o menu de navegação do site original

  // 2. Neutraliza Eventos e Links JS
  $('*').each((_, element) => {
    const el = $(element);
    const attribs = element.attribs;
    
    Object.keys(attribs).forEach((attr) => {
      if (attr.startsWith('on')) el.removeAttr(attr);
    });

    if (attribs['href']?.toLowerCase().startsWith('javascript:')) {
      el.attr('href', '#').addClass('disabled-link');
    }
  });

  // 3. Corrige Caminhos (apenas para garantir que nada quebre, embora o CSS novo sobrescreva a maioria)
  const fixPath = (val: string | undefined) => {
    if (val && val.startsWith('/')) return `${BASE_URL_ORIGINAL}${val}`;
    return val;
  };

  $('link[href]').each((_, el) => {
    $(el).attr('href', fixPath($(el).attr('href')));
  });

  $('img[src]').each((_, el) => {
    $(el).attr('src', fixPath($(el).attr('src')));
  });

  // 4. Injeta a Nova Identidade Visual
  // Removemos os links de CSS antigos para não conflitar com o nosso novo design
  $('link[rel="stylesheet"]').remove();
  $('style').remove(); // Remove estilos inline antigos
  
  $('head').append(MODERN_CSS);

  return $.html();
};

// --- PROCESSAMENTO EM LOTE ---
const processarArquivos = () => {
  console.log('🚀 Iniciando transformação visual moderna...');
  console.log(`📂 Origem: ${DIR_ENTRADA}`);
  console.log(`📂 Destino: ${DIR_SAIDA}`);

  if (!fs.existsSync(DIR_SAIDA)) {
    fs.mkdirSync(DIR_SAIDA, { recursive: true });
  }

  if (!fs.existsSync(DIR_ENTRADA)) {
    console.error('❌ Erro: Diretório de origem não encontrado:', DIR_ENTRADA);
    return;
  }

  const arquivos = fs.readdirSync(DIR_ENTRADA);
  const arquivosHtml = arquivos.filter(arq => arq.toLowerCase().endsWith('.html'));

  if (arquivosHtml.length === 0) {
    console.log('⚠️  Nenhum arquivo .html encontrado.');
    return;
  }

  console.log(`🎨 Aplicando novo design em ${arquivosHtml.length} arquivos...\n`);

  arquivosHtml.forEach((arquivo, index) => {
    try {
      const caminhoFullEntrada = path.join(DIR_ENTRADA, arquivo);
      const caminhoFullSaida = path.join(DIR_SAIDA, arquivo);

      console.log(`[${index + 1}/${arquivosHtml.length}] Processando: ${arquivo}...`);

      const htmlOriginal = fs.readFileSync(caminhoFullEntrada, 'utf-8');
      const htmlLimpo = cleanHtmlForConsultation(htmlOriginal);

      fs.writeFileSync(caminhoFullSaida, htmlLimpo);
      
    } catch (err) {
      console.error(`❌ Erro em ${arquivo}:`, err);
    }
  });

  console.log('\n✅ Pronto! Confira os arquivos na pasta tabelalimpa.');
};

processarArquivos();