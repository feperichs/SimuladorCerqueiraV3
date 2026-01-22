import { jsPDF } from 'jspdf'
import type { PlanoSaude } from './planos-config'

interface Vidas {
  '0-18': number
  '19-23': number
  '24-28': number
  '29-33': number
  '34-38': number
  '39-43': number
  '44-48': number
  '49-53': number
  '54-58': number
  '59+': number
}

interface ResultadoPlano {
  plano: PlanoSaude
  calculos: {
    faixa: string
    valorUnitario: number
    quantidade: number
    subtotal: number
  }[]
  total: number
}

interface DadosCliente {
  destinatario: string
  razaoSocial: string
  nomeContato: string
  email: string
  regiao: string
  zona: string
}

interface DadosCorretor {
  nome: string
  corretora: string
}

export async function generateProposalPDF(
  dadosCliente: DadosCliente,
  vidas: Vidas,
  resultados: ResultadoPlano[],
  comentario: string,
  dadosCorretor: DadosCorretor
) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let yPosition = 20

  // Helper para formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Helper para adicionar nova página se necessário
  const checkAddPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      doc.addPage()
      yPosition = 20
      addPageNumber()
      return true
    }
    return false
  }

  // Helper para desenhar tabela simples
  const drawTable = (
    headers: string[],
    rows: string[][],
    footerRow?: string[],
    options?: {
      columnWidths?: number[]
      headerBg?: [number, number, number]
      footerBg?: [number, number, number]
      alignments?: ('left' | 'center' | 'right')[]
    }
  ) => {
    const startX = 14
    const startY = yPosition
    const columnWidths = options?.columnWidths || headers.map(() => (pageWidth - 28) / headers.length)
    const rowHeight = 7
    const headerBg = options?.headerBg || [30, 64, 175]
    const footerBg = options?.footerBg || [234, 88, 12]
    const alignments = options?.alignments || headers.map(() => 'left' as const)

    let currentY = startY

    // Cabeçalho
    doc.setFillColor(...headerBg)
    doc.rect(startX, currentY, pageWidth - 28, rowHeight, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)

    let currentX = startX
    headers.forEach((header, i) => {
      const align = alignments[i]
      const textX = align === 'center' 
        ? currentX + columnWidths[i] / 2 
        : align === 'right'
        ? currentX + columnWidths[i] - 2
        : currentX + 2
      
      doc.text(String(header || ''), textX, currentY + 5, { align })
      currentX += columnWidths[i]
    })

    currentY += rowHeight

    // Corpo
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(0, 0, 0)

    rows.forEach((row, rowIndex) => {
      // Zebra striping
      if (rowIndex % 2 === 0) {
        doc.setFillColor(249, 250, 251)
        doc.rect(startX, currentY, pageWidth - 28, rowHeight, 'F')
      }

      currentX = startX
      row.forEach((cell, i) => {
        const align = alignments[i]
        const textX = align === 'center' 
          ? currentX + columnWidths[i] / 2 
          : align === 'right'
          ? currentX + columnWidths[i] - 2
          : currentX + 2
        
        doc.text(String(cell || ''), textX, currentY + 5, { align })
        currentX += columnWidths[i]
      })

      currentY += rowHeight
    })

    // Rodapé (se houver)
    if (footerRow) {
      doc.setFillColor(...footerBg)
      doc.rect(startX, currentY, pageWidth - 28, rowHeight, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)

      currentX = startX
      footerRow.forEach((cell, i) => {
        const align = alignments[i]
        const textX = align === 'center' 
          ? currentX + columnWidths[i] / 2 
          : align === 'right'
          ? currentX + columnWidths[i] - 2
          : currentX + 2
        
        doc.text(String(cell || ''), textX, currentY + 5, { align })
        currentX += columnWidths[i]
      })

      currentY += rowHeight
    }

    yPosition = currentY
  }

  // Helper para número de página
  const addPageNumber = () => {
    doc.setFontSize(8)
    doc.setTextColor(107, 114, 128)
    doc.setFont('helvetica', 'normal')
  }

  // CABEÇALHO COM LOGO E INFO DA CORRETORA
  doc.setFillColor(30, 64, 175)
  doc.rect(0, 0, pageWidth, 40, 'F')
  
  doc.setFontSize(24)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text(String(dadosCorretor.corretora || 'Corretora'), 14, 20)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Simulador de Planos de Saúde', 14, 28)
  doc.text('Tel: 3124-3799', 14, 34)

  const dataAtual = new Date().toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  doc.setFontSize(9)
  doc.text(dataAtual, pageWidth - 14, 20, { align: 'right' })

  yPosition = 50

  // TÍTULO DA PROPOSTA
  doc.setFontSize(18)
  doc.setTextColor(30, 64, 175)
  doc.setFont('helvetica', 'bold')
  doc.text('Proposta de Plano de Saúde (PME/Empresarial)', 14, yPosition)
  yPosition += 12

  // DADOS DO CLIENTE
  doc.setFontSize(11)
  doc.setTextColor(107, 114, 128)
  doc.setFont('helvetica', 'bold')
  doc.text('Dados do Cliente', 14, yPosition)
  yPosition += 6

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  
  if (dadosCliente.razaoSocial) {
    doc.text(String(`Empresa: ${dadosCliente.razaoSocial}`), 14, yPosition)
    yPosition += 5
  }
  if (dadosCliente.nomeContato) {
    doc.text(String(`Contato: ${dadosCliente.nomeContato}`), 14, yPosition)
    yPosition += 5
  }
  if (dadosCliente.email) {
    doc.text(String(`E-mail: ${dadosCliente.email}`), 14, yPosition)
    yPosition += 5
  }
  if (dadosCliente.regiao) {
    doc.text(String(`Região: ${dadosCliente.regiao}`), 14, yPosition)
    yPosition += 5
  }

  yPosition += 8

  // COMENTÁRIO INICIAL
  if (comentario) {
    doc.setFontSize(9)
    doc.setTextColor(107, 114, 128)
    const comentarioLines = doc.splitTextToSize(comentario, pageWidth - 28)
    doc.text(comentarioLines, 14, yPosition)
    yPosition += comentarioLines.length * 4 + 8
  }

  // BENEFICIÁRIOS - Tabela de vidas
  checkAddPage(60)
  
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('Beneficiários', 14, yPosition)
  yPosition += 6

  const vidasData = Object.entries(vidas)
    .filter(([, qtd]) => qtd > 0)
    .map(([faixa, qtd]) => {
      const faixaFormatada = faixa === '59+' ? '+ de 59 anos' : `${faixa.replace('-', ' a ')} anos`
      return [faixaFormatada, qtd.toString()]
    })

  const totalVidas = Object.values(vidas).reduce((sum, v) => sum + v, 0)

  drawTable(
    ['Faixa Etária', 'Quantidade'],
    vidasData,
    ['Total', totalVidas.toString()],
    {
      columnWidths: [60, 20],
      alignments: ['left', 'center'],
    }
  )

  yPosition += 15

  // PLANOS CALCULADOS
  for (let i = 0; i < resultados.length; i++) {
    const resultado = resultados[i]
    
    checkAddPage(120)

    // Nome do plano com destaque
    doc.setFillColor(234, 88, 12)
    doc.rect(14, yPosition - 5, pageWidth - 28, 10, 'F')
    
    doc.setFontSize(12)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text(String(resultado.plano.operadora || ''), 16, yPosition)
    yPosition += 10

    doc.setFillColor(249, 250, 251)
    doc.rect(14, yPosition - 3, pageWidth - 28, 8, 'F')
    doc.setFontSize(10)
    doc.setTextColor(107, 114, 128)
    doc.setFont('helvetica', 'normal')
    doc.text(String(resultado.plano.nomePlano || ''), 16, yPosition)
    yPosition += 10

    // Informações do plano
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.text(String(`Tipo: ${resultado.plano.tipo || ''}`), 16, yPosition)
    yPosition += 4
    doc.text(String(`Acomodação: ${resultado.plano.acomodacao || ''}`), 16, yPosition)
    yPosition += 4
    doc.text(String(`Abrangência: ${resultado.plano.abrangencia || ''}`), 16, yPosition)
    yPosition += 4
    doc.text(String(`Segmento: ${resultado.plano.segmento || ''}`), 16, yPosition)
    yPosition += 8

    // Tabela de valores
    const valoresData = resultado.calculos.map((calc) => {
      const faixaFormatada = calc.faixa === '59+' ? '+ de 59 anos' : `${calc.faixa.replace('-', ' a ')} anos`
      return [
        faixaFormatada,
        formatCurrency(calc.valorUnitario),
        calc.quantidade.toString(),
        formatCurrency(calc.subtotal),
      ]
    })

    drawTable(
      ['Faixa Etária', 'Valor Unitário', 'Qtd', 'Subtotal'],
      valoresData,
      ['', '', 'Total Mensal:', formatCurrency(resultado.total)],
      {
        columnWidths: [60, 40, 20, 40],
        alignments: ['left', 'right', 'center', 'right'],
      }
    )

    yPosition += 4

    // Observações do plano
    if (resultado.plano.observacoes) {
      doc.setFontSize(8)
      doc.setTextColor(107, 114, 128)
      doc.setFont('helvetica', 'italic')
      const obsLines = doc.splitTextToSize(`Obs: ${resultado.plano.observacoes}`, pageWidth - 32)
      doc.text(obsLines, 16, yPosition)
      yPosition += obsLines.length * 3.5 + 8
    } else {
      yPosition += 8
    }

    // Linha separadora entre planos
    if (i < resultados.length - 1) {
      doc.setDrawColor(229, 231, 235)
      doc.line(14, yPosition, pageWidth - 14, yPosition)
      yPosition += 8
    }
  }

  // RODAPÉ EM TODAS AS PÁGINAS
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(107, 114, 128)
    doc.setFont('helvetica', 'normal')
    
    const footerY = pageHeight - 10
    doc.text(
      String(`Proposta gerada por ${dadosCorretor.corretora || 'Corretora'}`),
      14,
      footerY
    )
    doc.text(
      String(`Página ${i} de ${totalPages}`),
      pageWidth - 14,
      footerY,
      { align: 'right' }
    )
  }

  // Salvar o PDF
  const nomeArquivo = `proposta-${dadosCliente.razaoSocial?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'cliente'}-${Date.now()}.pdf`
  doc.save(nomeArquivo)
}
