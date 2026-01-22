import type { Plano, TipoContratacao, Acomodacao, Coparticipacao } from './planos-completos'

interface ParsedPlan {
  plano: Partial<Plano>
  warnings: string[]
}

// Mapeamento de faixas etárias do HTML para nosso formato
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

// Limpar valor monetário (R$ 1.384,02 -> 1384.02)
function limparValor(valor: string): number {
  if (!valor) return 0
  
  // Remove R$, espaços, pontos (milhares) e troca vírgula por ponto
  const limpo = valor
    .replace(/R\$/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()
  
  const numero = parseFloat(limpo)
  return isNaN(numero) ? 0 : numero
}

// Normalizar texto para facilitar comparações
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .trim()
}

// Detectar tipo de acomodação
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
  if (norm.includes('coparticipacao total') || norm.includes('copart. total') || norm.includes('com copart total')) {
    return 'Com Coparticipação Total'
  }
  if (norm.includes('coparticipacao parcial') || norm.includes('copart. parcial') || norm.includes('com copart parcial')) {
    return 'Com Coparticipação Parcial'
  }
  
  // Se apenas menciona coparticipação sem especificar, assume parcial
  if (norm.includes('coparticipacao') || norm.includes('copart')) {
    return 'Com Coparticipação Parcial'
  }
  
  return 'Sem Coparticipação'
}

// Detectar tipo de contratação
function detectarTipoContratacao(texto: string): TipoContratacao {
  const norm = normalizar(texto)
  
  if (norm.includes('pme') || norm.includes('empresarial')) {
    return 'PME'
  }
  if (norm.includes('adesao')) {
    return 'Adesão'
  }
  if (norm.includes('familiar')) {
    return 'Familiar'
  }
  if (norm.includes('individual')) {
    return 'Individual'
  }
  
  // Padrão
  return 'PME'
}

// Gerar ID único
function gerarId(operadora: string, nome: string): string {
  const slug = normalizar(`${operadora}-${nome}`)
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
  
  const random = Math.random().toString(36).substring(2, 6)
  return `${slug}-${random}`
}

export function parseHTML(htmlContent: string): {
  planos: Plano[]
  warnings: string[]
  stats: {
    totalEncontrados: number
    totalSucesso: number
    totalErros: number
  }
} {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlContent, 'text/html')
  
  const planosEncontrados: Plano[] = []
  const warnings: string[] = []
  
  // Procurar todas as tabelas no HTML
  const tabelas = doc.querySelectorAll('table')
  
  if (tabelas.length === 0) {
    warnings.push('Nenhuma tabela encontrada no HTML')
    return {
      planos: [],
      warnings,
      stats: { totalEncontrados: 0, totalSucesso: 0, totalErros: 0 }
    }
  }
  
  let acomodacaoAtual: Acomodacao = 'Enfermaria'
  let operadoraAtual = ''
  let tipoContrataçãoAtual: TipoContratacao = 'PME'
  
  tabelas.forEach((tabela, indexTabela) => {
    const linhas = Array.from(tabela.querySelectorAll('tr'))
    
    if (linhas.length === 0) return
    
    // Procurar linha de cabeçalho (primeira linha geralmente)
    let linhaHeader: HTMLTableRowElement | null = null
    let indiceColunaPlanos: number[] = []
    let nomesPlanos: string[] = []
    
    // Buscar informações contextuais antes da tabela
    const elementoAnterior = tabela.previousElementSibling
    if (elementoAnterior) {
      const textoAnterior = elementoAnterior.textContent || ''
      
      // Detectar operadora
      if (textoAnterior.toUpperCase().includes('ALICE')) operadoraAtual = 'ALICE'
      else if (textoAnterior.toUpperCase().includes('AMIL')) operadoraAtual = 'AMIL'
      else if (textoAnterior.toUpperCase().includes('BRADESCO')) operadoraAtual = 'BRADESCO'
      else if (textoAnterior.toUpperCase().includes('UNIMED')) operadoraAtual = 'UNIMED'
      else if (textoAnterior.toUpperCase().includes('SULAMERICA')) operadoraAtual = 'SULAMERICA'
      else if (textoAnterior.toUpperCase().includes('HAPVIDA')) operadoraAtual = 'HAPVIDA NOTREDAME'
      else if (textoAnterior.toUpperCase().includes('NOTREDAME')) operadoraAtual = 'HAPVIDA NOTREDAME'
      else if (textoAnterior.toUpperCase().includes('BIOVIDA')) operadoraAtual = 'BIOVIDA SAÚDE'
      
      // Detectar tipo
      tipoContrataçãoAtual = detectarTipoContratacao(textoAnterior)
    }
    
    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i]
      const celulas = Array.from(linha.querySelectorAll('td, th'))
      const textoLinha = linha.textContent?.trim() || ''
      
      // Verificar se é linha de acomodação (classe bgGray ou texto específico)
      if (linha.classList.contains('bgGray') || linha.classList.contains('bg-gray')) {
        const acomodacaoDetectada = detectarAcomodacao(textoLinha)
        if (acomodacaoDetectada) {
          acomodacaoAtual = acomodacaoDetectada
          continue
        }
      }
      
      // Detectar acomodação no texto
      const acomodacaoNaLinha = detectarAcomodacao(textoLinha)
      if (acomodacaoNaLinha && celulas.length === 1) {
        acomodacaoAtual = acomodacaoNaLinha
        continue
      }
      
      // Verificar se é a linha de cabeçalho (contém "Faixa Etária" ou similar)
      if (!linhaHeader && celulas.length > 1) {
        const primeiraCelula = normalizar(celulas[0].textContent || '')
        if (primeiraCelula.includes('faixa') || primeiraCelula.includes('idade') || primeiraCelula.includes('etaria')) {
          linhaHeader = linha
          
          // Identificar colunas de planos (todas exceto a primeira)
          for (let j = 1; j < celulas.length; j++) {
            const nomePlano = celulas[j].textContent?.trim() || `Plano ${j}`
            if (nomePlano && nomePlano.length > 0) {
              indiceColunaPlanos.push(j)
              nomesPlanos.push(nomePlano)
            }
          }
          continue
        }
      }
      
      // Se já temos header, processar linhas de dados
      if (linhaHeader && celulas.length > 1) {
        const primeiraColuna = celulas[0].textContent?.trim() || ''
        const faixaNormalizada = normalizar(primeiraColuna)
        
        // Procurar correspondência de faixa etária
        let faixaKey: keyof Plano['precos'] | null = null
        for (const [pattern, key] of Object.entries(faixaEtariaMap)) {
          if (normalizar(pattern) === faixaNormalizada || faixaNormalizada.includes(normalizar(pattern))) {
            faixaKey = key
            break
          }
        }
        
        if (faixaKey) {
          // Processar cada plano (cada coluna)
          indiceColunaPlanos.forEach((indiceColuna, indexPlano) => {
            if (indiceColuna >= celulas.length) return
            
            const valorTexto = celulas[indiceColuna].textContent?.trim() || '0'
            const valor = limparValor(valorTexto)
            
            // Encontrar ou criar plano
            let planoExistente = planosEncontrados.find(p => 
              p.nome === nomesPlanos[indexPlano] && 
              p.acomodacao === acomodacaoAtual &&
              p.operadora === (operadoraAtual || 'Operadora')
            )
            
            if (!planoExistente) {
              const nomePlano = nomesPlanos[indexPlano]
              const copart = detectarCoparticipacao(nomePlano + ' ' + textoLinha)
              
              const novoPlano: Plano = {
                id: gerarId(operadoraAtual || 'op', nomePlano),
                operadora: operadoraAtual || 'Operadora',
                nome: nomePlano,
                tipo: tipoContrataçãoAtual,
                acomodacao: acomodacaoAtual,
                coparticipacao: copart,
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
              
              planosEncontrados.push(novoPlano)
              planoExistente = novoPlano
            }
            
            // Atualizar preço
            planoExistente.precos[faixaKey] = valor
          })
        }
      }
    }
  })
  
  // Validar planos encontrados
  const planosValidos = planosEncontrados.filter(plano => {
    const totalPrecos = Object.values(plano.precos).reduce((acc, val) => acc + val, 0)
    if (totalPrecos === 0) {
      warnings.push(`Plano "${plano.nome}" foi ignorado por não ter preços válidos`)
      return false
    }
    return true
  })
  
  return {
    planos: planosValidos,
    warnings,
    stats: {
      totalEncontrados: planosEncontrados.length,
      totalSucesso: planosValidos.length,
      totalErros: planosEncontrados.length - planosValidos.length
    }
  }
}
