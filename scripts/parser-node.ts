/**
 * Parser HTML para Node.js
 * Extrai planos de saúde de arquivos HTML usando Cheerio
 */

import * as cheerio from 'cheerio'
import type { Plano, TipoContratacao, Acomodacao, Coparticipacao } from '../lib/planos-completos'

interface ResultadoParsing {
  planos: Partial<Plano>[]
  avisos: string[]
}

// Mapeamento de faixas etárias
const faixaEtariaMap: Record<string, keyof Plano['precos']> = {
  '0 a 18 anos': '0-18',
  '0 a 18': '0-18',
  '0-18': '0-18',
  '19 a 23 anos': '19-23',
  '19 a 23': '19-23',
  '19-23': '19-23',
  '24 a 28 anos': '24-28',
  '24 a 28': '24-28',
  '24-28': '24-28',
  '29 a 33 anos': '29-33',
  '29 a 33': '29-33',
  '29-33': '29-33',
  '34 a 38 anos': '34-38',
  '34 a 38': '34-38',
  '34-38': '34-38',
  '39 a 43 anos': '39-43',
  '39 a 43': '39-43',
  '39-43': '39-43',
  '44 a 48 anos': '44-48',
  '44 a 48': '44-48',
  '44-48': '44-48',
  '49 a 53 anos': '49-53',
  '49 a 53': '49-53',
  '49-53': '49-53',
  '54 a 58 anos': '54-58',
  '54 a 58': '54-58',
  '54-58': '54-58',
  '+ de 59 anos': '59+',
  '59+': '59+',
  '59 ou mais': '59+',
  'acima de 59': '59+',
}

// Limpar valor monetário
function limparValor(valor: string): number {
  if (!valor) return 0
  
  const limpo = valor
    .replace(/R\$/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()
  
  const numero = parseFloat(limpo)
  return isNaN(numero) ? 0 : numero
}

// Normalizar texto
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// Detectar tipo de contratação
function detectarTipoContratacao(texto: string): TipoContratacao {
  const norm = normalizar(texto)
  
  if (norm.includes('pme') || norm.includes('empresarial')) return 'PME'
  if (norm.includes('individual')) return 'Individual'
  if (norm.includes('adesao') || norm.includes('adesão')) return 'Adesão'
  if (norm.includes('familiar')) return 'Familiar'
  
  return 'PME' // Padrão
}

// Detectar acomodação
function detectarAcomodacao(texto: string): Acomodacao | null {
  const norm = normalizar(texto)
  
  if (norm.includes('enfermaria') || norm.includes('enf.') || norm.includes('enf')) {
    return 'Enfermaria'
  }
  if (norm.includes('apartamento') || norm.includes('apto') || norm.includes('apart.')) {
    return 'Apartamento'
  }
  
  return null
}

// Detectar coparticipação
function detectarCoparticipacao(texto: string): Coparticipacao {
  const norm = normalizar(texto)
  
  if (norm.includes('sem coparticipacao') || norm.includes('sem copart')) {
    return 'Sem Coparticipação'
  }
  if (norm.includes('coparticipacao total') || norm.includes('copart. total')) {
    return 'Com Coparticipação Total'
  }
  if (norm.includes('coparticipacao parcial') || norm.includes('copart. parcial')) {
    return 'Com Coparticipação Parcial'
  }
  if (norm.includes('coparticipacao') || norm.includes('copart')) {
    return 'Com Coparticipação Parcial'
  }
  
  return 'Sem Coparticipação'
}

// Parser principal
export function parseHTMLToPlanos(html: string): ResultadoParsing {
  const $ = cheerio.load(html)
  const planos: Partial<Plano>[] = []
  const avisos: string[] = []

  // Tentar encontrar operadora no HTML
  let operadoraGlobal = ''
  const titleText = $('title').text()
  const h1Text = $('h1').first().text()
  const h2Text = $('h2').first().text()
  
  // Procurar por nomes de operadoras conhecidas
  const operadorasConhecidas = [
    'AMIL', 'ALICE', 'BRADESCO', 'UNIMED', 'SULAMERICA', 'HAPVIDA', 
    'NOTREDAME', 'MEDSENIOR', 'PLENA', 'SAGRADA', 'SAMI', 'BIOVIDA', 'ELITE'
  ]
  
  const textoCompleto = titleText + ' ' + h1Text + ' ' + h2Text
  for (const op of operadorasConhecidas) {
    if (normalizar(textoCompleto).includes(normalizar(op))) {
      operadoraGlobal = op
      break
    }
  }

  // Processar tabelas
  $('table').each((i, table) => {
    const $table = $(table)
    const rows = $table.find('tr').toArray()

    if (rows.length < 2) return // Precisa ter cabeçalho + dados

    // Analisar cabeçalho
    const $headerRow = $(rows[0])
    const headers = $headerRow.find('th, td').map((i, el) => $(el).text().trim()).toArray()

    // Encontrar índices das colunas de faixa etária
    const faixaIndices: { index: number; faixa: keyof Plano['precos'] }[] = []
    
    headers.forEach((header, index) => {
      const faixa = faixaEtariaMap[header.trim()]
      if (faixa) {
        faixaIndices.push({ index, faixa })
      }
    })

    if (faixaIndices.length === 0) {
      avisos.push(`Tabela ${i + 1}: Nenhuma faixa etária reconhecida`)
      return
    }

    // Tentar detectar informações da tabela (cabeçalhos, títulos anteriores)
    let nomePlanoBase = ''
    let tipoContratacao: TipoContratacao = 'PME'
    let acomodacaoBase: Acomodacao | null = null
    let coparticipacaoBase: Coparticipacao = 'Sem Coparticipação'

    // Buscar contexto antes da tabela
    const $prev = $table.prevAll().slice(0, 3)
    $prev.each((i, el) => {
      const texto = $(el).text().trim()
      if (texto) {
        if (!nomePlanoBase && texto.length < 100) {
          nomePlanoBase = texto
        }
        if (!acomodacaoBase) {
          acomodacaoBase = detectarAcomodacao(texto)
        }
        const tipo = detectarTipoContratacao(texto)
        if (tipo !== 'PME' || normalizar(texto).includes('pme')) {
          tipoContratacao = tipo
        }
        const copart = detectarCoparticipacao(texto)
        if (copart !== 'Sem Coparticipação') {
          coparticipacaoBase = copart
        }
      }
    })

    // Processar linhas de dados
    for (let r = 1; r < rows.length; r++) {
      const $row = $(rows[r])
      const cells = $row.find('td, th').map((i, el) => $(el).text().trim()).toArray()

      if (cells.length === 0) continue

      // Inicializar plano
      const plano: Partial<Plano> = {
        operadora: operadoraGlobal || 'OPERADORA',
        nome: nomePlanoBase || cells[0] || 'PLANO',
        tipo: tipoContratacao,
        acomodacao: acomodacaoBase || 'Enfermaria',
        coparticipacao: coparticipacaoBase,
        precos: {
          '0-18': 0,
          '19-23': 0,
          '24-28': 0,
          '29-33': 0,
          '34-38': 0,
          '39-43': 0,
          '44-48': 0,
          '49-53': 0,
          '54-58': 0,
          '59+': 0,
        }
      }

      // Tentar detectar nome do plano e acomodação na primeira célula
      const primeiraColuna = cells[0] || ''
      if (primeiraColuna && primeiraColuna.length < 100) {
        plano.nome = primeiraColuna
        
        const acomodacaoDetectada = detectarAcomodacao(primeiraColuna)
        if (acomodacaoDetectada) {
          plano.acomodacao = acomodacaoDetectada
        }
        
        const copartDetectada = detectarCoparticipacao(primeiraColuna)
        if (copartDetectada !== 'Sem Coparticipação') {
          plano.coparticipacao = copartDetectada
        }
      }

      // Extrair preços
      let precosEncontrados = 0
      faixaIndices.forEach(({ index, faixa }) => {
        if (cells[index]) {
          const valor = limparValor(cells[index])
          if (valor > 0) {
            plano.precos![faixa] = valor
            precosEncontrados++
          }
        }
      })

      // Só adicionar se encontrou preços
      if (precosEncontrados >= 3) {
        planos.push(plano)
      } else {
        avisos.push(`Linha ${r} da tabela ${i + 1}: Poucos preços válidos (${precosEncontrados})`)
      }
    }
  })

  return { planos, avisos }
}
