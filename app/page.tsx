'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Settings } from 'lucide-react'
import { 
  planos, 
  getOperadoras,
  getTiposContratacao,
  buscarPlanos,
  type TipoContratacao,
  type Plano 
} from '@/lib/planos-completos'
import { generateProposalPDF } from '@/lib/pdf-generator'

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
  plano: Plano
  calculos: {
    faixa: string
    valorUnitario: number
    quantidade: number
    subtotal: number
  }[]
  total: number
}

export default function SimuladorPage() {
  // Dados do destinatário
  const [razaoSocial, setRazaoSocial] = useState('')
  const [nomeContato, setNomeContato] = useState('')
  const [email, setEmail] = useState('')
  
  // TIPO DE CONTRATAÇÃO - Funcionalidade Crucial!
  const [tipoContratacao, setTipoContratacao] = useState<TipoContratacao | ''>('')
  
  // Localidade
  const [regiao, setRegiao] = useState('Todos')
  
  // Corretor
  const [nomeCorretor, setNomeCorretor] = useState('Viviane')
  const [corretora, setCorretora] = useState('CERQUEIRA CORRETORA')
  
  // Vidas por faixa etária
  const [vidas, setVidas] = useState<Vidas>({
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
  })
  
  // Planos selecionados
  const [planosSelecionados, setPlanosSelecionados] = useState<string[]>([])
  const [mostrarSelecaoPlanos, setMostrarSelecaoPlanos] = useState(false)
  
  // Filtros de planos
  const [filtroOperadora, setFiltroOperadora] = useState('Todos')
  const [filtroAcomodacao, setFiltroAcomodacao] = useState('Todos')
  const [filtroCoparticipacao, setFiltroCoparticipacao] = useState('Todos')
  
  // Comentário
  const [comentario, setComentario] = useState('Primeiramente, agradecemos pelo seu contato.\nInformamos que os custos e as condições abaixo são determinadas por suas respectivas operadoras.')
  
  // Resultados
  const [resultados, setResultados] = useState<ResultadoPlano[]>([])
  const [processado, setProcessado] = useState(false)

  // Limpar vidas
  const limparVidas = () => {
    setVidas({
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
    })
  }

  // Verificar se o formulário está pronto
  const formularioPreenchido = () => {
    const totalVidas = Object.values(vidas).reduce((sum, v) => sum + v, 0)
    return totalVidas > 0 && razaoSocial.trim() !== '' && tipoContratacao !== ''
  }

  // Mostrar seleção de planos
  const exibirPlanos = () => {
    if (!tipoContratacao) {
      alert('Por favor, selecione o tipo de contratação!')
      return
    }
    if (!formularioPreenchido()) {
      alert('Por favor, preencha o nome da empresa e a quantidade de vidas!')
      return
    }
    setMostrarSelecaoPlanos(true)
  }

  // Filtrar planos disponíveis baseado no tipo de contratação
  const planosFiltrados = useMemo(() => {
    if (!tipoContratacao) return []
    
    let filtrados = buscarPlanos({ tipo: tipoContratacao })
    
    if (filtroOperadora !== 'Todos') {
      filtrados = filtrados.filter(p => p.operadora === filtroOperadora)
    }
    if (filtroAcomodacao !== 'Todos') {
      filtrados = filtrados.filter(p => p.acomodacao === filtroAcomodacao)
    }
    if (filtroCoparticipacao !== 'Todos') {
      filtrados = filtrados.filter(p => p.coparticipacao === filtroCoparticipacao)
    }
    if (regiao !== 'Todos' && regiao) {
      filtrados = filtrados.filter(p => !p.regiao || p.regiao === regiao)
    }
    
    return filtrados
  }, [tipoContratacao, filtroOperadora, filtroAcomodacao, filtroCoparticipacao, regiao])

  // Agrupar planos por operadora
  const planosAgrupados = useMemo(() => {
    const grupos: Record<string, Plano[]> = {}
    planosFiltrados.forEach(plano => {
      if (!grupos[plano.operadora]) {
        grupos[plano.operadora] = []
      }
      grupos[plano.operadora].push(plano)
    })
    return grupos
  }, [planosFiltrados])

  // Alternar todos os planos de uma operadora
  const toggleOperadora = (operadora: string) => {
    const planosOperadora = planosAgrupados[operadora].map(p => p.id)
    const todosSelecionados = planosOperadora.every(id => planosSelecionados.includes(id))
    
    if (todosSelecionados) {
      setPlanosSelecionados(prev => prev.filter(id => !planosOperadora.includes(id)))
    } else {
      setPlanosSelecionados(prev => [...new Set([...prev, ...planosOperadora])])
    }
  }

  // Alternar seleção de plano
  const togglePlano = (planoId: string) => {
    setPlanosSelecionados((prev) =>
      prev.includes(planoId) ? prev.filter((id) => id !== planoId) : [...prev, planoId]
    )
  }

  // Alterar quantidade de vidas
  const handleVidasChange = (faixa: keyof Vidas, valor: string) => {
    const num = parseInt(valor) || 0
    setVidas((prev) => ({ ...prev, [faixa]: num }))
  }

  // Processar simulação
  const processarSimulacao = () => {
    if (!tipoContratacao) {
      alert('Selecione o tipo de contratação!')
      return
    }
    
    if (planosSelecionados.length === 0) {
      alert('Selecione pelo menos um plano!')
      return
    }

    const totalVidas = Object.values(vidas).reduce((sum, v) => sum + v, 0)
    if (totalVidas === 0) {
      alert('Informe a quantidade de vidas!')
      return
    }

    const resultadosCalculados: ResultadoPlano[] = []

    for (const planoId of planosSelecionados) {
      const plano = planos.find((p) => p.id === planoId)
      if (!plano) continue

      const calculos = Object.entries(vidas)
        .filter(([, qtd]) => qtd > 0)
        .map(([faixa, quantidade]) => {
          const valorUnitario = plano.precos[faixa as keyof Vidas]
          const subtotal = valorUnitario * quantidade
          return {
            faixa,
            valorUnitario,
            quantidade,
            subtotal,
          }
        })

      const total = calculos.reduce((sum, calc) => sum + calc.subtotal, 0)

      resultadosCalculados.push({
        plano,
        calculos,
        total,
      })
    }

    // Ordenar por valor total (do menor para o maior)
    resultadosCalculados.sort((a, b) => a.total - b.total)

    setResultados(resultadosCalculados)
    setProcessado(true)
  }

  // Gerar proposta em PDF
  const gerarProposta = async () => {
    if (resultados.length === 0) {
      alert('Processe a simulação primeiro!')
      return
    }

    const dadosCliente = {
      destinatario: razaoSocial,
      razaoSocial,
      nomeContato,
      email,
      regiao,
      tipoContratacao: tipoContratacao || 'PME',
    }

    const dadosCorretor = {
      nome: nomeCorretor,
      corretora,
    }

    await generateProposalPDF(dadosCliente, vidas, resultados, comentario, dadosCorretor)
  }

  // Formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const totalVidas = Object.values(vidas).reduce((sum, v) => sum + v, 0)
  const operadoras = tipoContratacao ? ['Todos', ...Array.from(new Set(buscarPlanos({ tipo: tipoContratacao }).map(p => p.operadora))).sort()] : ['Todos']

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1600px] p-4">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-primary">Nova Simulação</h1>
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Importar Tabelas
              </Button>
            </Link>
          </div>

          {/* Abas de Navegação */}
          <div className="flex gap-2 border-b border-border">
            <Button 
              variant="ghost" 
              className="rounded-b-none border-b-2 border-primary text-primary hover:border-primary"
            >
              Simulação
            </Button>
            <Link href="/tabelas">
              <Button 
                variant="ghost" 
                className="rounded-b-none border-b-2 border-transparent hover:border-primary"
              >
                Tabelas
              </Button>
            </Link>
          </div>
        </div>

        {/* Formulário Principal */}
        <div className="space-y-4">
          {/* Destinatário da Proposta */}
          <Card className="border p-4">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Destinatário da Proposta</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="razao" className="text-xs">Razão da Empresa / Pessoa</Label>
                <Input
                  id="razao"
                  placeholder="Digite o nome"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contato" className="text-xs">Nome do Contato (A/C)</Label>
                <Input
                  id="contato"
                  placeholder="Digite o nome"
                  value={nomeContato}
                  onChange={(e) => setNomeContato(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </Card>

          {/* TIPO DE CONTRATAÇÃO - Seção Crucial */}
          <Card className="border-2 border-primary/50 bg-primary/5 p-4">
            <h3 className="mb-3 text-sm font-semibold text-primary">Tipo de Contratação *</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Selecione o tipo de plano *</Label>
                <Select value={tipoContratacao} onValueChange={(value) => {
                  setTipoContratacao(value as TipoContratacao)
                  setPlanosSelecionados([])
                  setMostrarSelecaoPlanos(false)
                  setProcessado(false)
                  setResultados([])
                }}>
                  <SelectTrigger className="h-9 border-2 text-sm font-medium">
                    <SelectValue placeholder="Escolha: Individual, PME, Adesão ou Familiar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PME">PME / Empresarial</SelectItem>
                    <SelectItem value="Individual">Individual</SelectItem>
                    <SelectItem value="Adesão">Adesão</SelectItem>
                    <SelectItem value="Familiar">Familiar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Região</Label>
                <Select value={regiao} onValueChange={setRegiao}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todas as Regiões</SelectItem>
                    <SelectItem value="São Paulo">São Paulo</SelectItem>
                    <SelectItem value="Campinas">Campinas</SelectItem>
                    <SelectItem value="Jundiaí">Jundiaí</SelectItem>
                    <SelectItem value="Sorocaba">Sorocaba</SelectItem>
                    <SelectItem value="Santos">Santos</SelectItem>
                    <SelectItem value="São José dos Campos">São José dos Campos</SelectItem>
                    <SelectItem value="Americana">Americana</SelectItem>
                    <SelectItem value="Mogi das Cruzes">Mogi das Cruzes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {tipoContratacao && (
              <div className="mt-3 rounded-md bg-background/50 p-3 text-xs">
                <p className="font-semibold text-primary">
                  Tipo selecionado: {tipoContratacao}
                </p>
                <p className="text-muted-foreground">
                  {planosFiltrados.length} planos disponíveis para este tipo de contratação
                </p>
              </div>
            )}
          </Card>

          {/* Informações do Corretor */}
          <Card className="border p-4">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Informações do Corretor</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="corretor" className="text-xs">Corretor</Label>
                <Input
                  id="corretor"
                  value={nomeCorretor}
                  onChange={(e) => setNomeCorretor(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="corretora" className="text-xs">Corretora</Label>
                <Input
                  id="corretora"
                  value={corretora}
                  onChange={(e) => setCorretora(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </Card>

          {/* Vidas por Faixa Etária */}
          <Card className="border p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Vidas por Faixa Etária ({totalVidas})
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={limparVidas}
                className="h-7 text-xs bg-transparent"
              >
                Limpar
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-5 md:grid-cols-10">
              {(Object.keys(vidas) as Array<keyof Vidas>).map((faixa) => (
                <div key={faixa} className="space-y-1.5">
                  <Label className="text-xs font-medium">{faixa}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={vidas[faixa]}
                    onChange={(e) => handleVidasChange(faixa, e.target.value)}
                    className="h-8 text-center text-sm"
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Botão para exibir seleção de planos */}
          {!mostrarSelecaoPlanos && (
            <div className="flex justify-center">
              <Button
                onClick={exibirPlanos}
                disabled={!formularioPreenchido()}
                className="h-10 px-8"
              >
                Clique aqui para exibir os Planos
              </Button>
            </div>
          )}

          {/* Seleção dos Planos */}
          {mostrarSelecaoPlanos && (
            <Card className="border p-4">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                Seleção dos Planos ({planosFiltrados.length} disponíveis)
              </h3>
              
              {/* Filtros */}
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Operadora</Label>
                  <Select value={filtroOperadora} onValueChange={setFiltroOperadora}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {operadoras.map(op => (
                        <SelectItem key={op} value={op}>{op}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Acomodação</Label>
                  <Select value={filtroAcomodacao} onValueChange={setFiltroAcomodacao}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos</SelectItem>
                      <SelectItem value="Enfermaria">Enfermaria</SelectItem>
                      <SelectItem value="Apartamento">Apartamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Coparticipação</Label>
                  <Select value={filtroCoparticipacao} onValueChange={setFiltroCoparticipacao}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos</SelectItem>
                      <SelectItem value="Sem Coparticipação">Sem Coparticipação</SelectItem>
                      <SelectItem value="Com Coparticipação Total">Coparticipação Total</SelectItem>
                      <SelectItem value="Com Coparticipação Parcial">Coparticipação Parcial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Lista de Planos Agrupados por Operadora */}
              <div className="max-h-[500px] space-y-4 overflow-y-auto">
                {Object.entries(planosAgrupados).map(([operadora, planosOp]) => {
                  const todosSelecionados = planosOp.every(p => planosSelecionados.includes(p.id))
                  const algunsSelecionados = planosOp.some(p => planosSelecionados.includes(p.id))
                  
                  return (
                    <div key={operadora} className="rounded-lg border bg-muted/30 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Checkbox
                          checked={todosSelecionados}
                          onCheckedChange={() => toggleOperadora(operadora)}
                          className={algunsSelecionados && !todosSelecionados ? 'data-[state=checked]:bg-primary/50' : ''}
                        />
                        <label className="text-sm font-semibold cursor-pointer" onClick={() => toggleOperadora(operadora)}>
                          {operadora} ({planosOp.length} planos)
                        </label>
                      </div>
                      <div className="ml-6 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {planosOp.map(plano => (
                          <div key={plano.id} className="flex items-start gap-2 rounded border bg-card p-2">
                            <Checkbox
                              checked={planosSelecionados.includes(plano.id)}
                              onCheckedChange={() => togglePlano(plano.id)}
                            />
                            <label 
                              className="flex-1 cursor-pointer text-xs leading-tight"
                              onClick={() => togglePlano(plano.id)}
                            >
                              <div className="font-medium">{plano.nome}</div>
                              {plano.linha && (
                                <div className="text-[10px] text-primary">{plano.linha}</div>
                              )}
                              <div className="text-muted-foreground">
                                ({plano.acomodacao === 'Enfermaria' ? 'E' : 'A'})
                                {plano.regiao && ` - ${plano.regiao}`}
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {planosFiltrados.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum plano encontrado com os filtros selecionados
                </div>
              )}

              {planosSelecionados.length > 0 && (
                <div className="mt-3 rounded-md bg-primary/10 p-2 text-center text-sm font-medium text-primary">
                  {planosSelecionados.length} plano(s) selecionado(s)
                </div>
              )}
            </Card>
          )}

          {/* Comentário */}
          <Card className="border p-4">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Comentário</h3>
            <Textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              className="text-sm"
            />
          </Card>

          {/* Botões de Ação */}
          <div className="flex gap-3">
            <Button
              onClick={processarSimulacao}
              disabled={planosSelecionados.length === 0 || totalVidas === 0 || !tipoContratacao}
              className="h-10 flex-1"
              size="lg"
            >
              Processar Simulação
            </Button>
            {processado && (
              <Button
                onClick={gerarProposta}
                variant="default"
                className="h-10 flex-1 bg-accent hover:bg-accent/90"
                size="lg"
              >
                Gerar Proposta (PDF)
              </Button>
            )}
          </div>

          {/* Resultados */}
          {processado && resultados.length > 0 && (
            <Card className="border p-4">
              <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
                Resultados da Simulação ({resultados.length} planos)
              </h3>
              <div className="space-y-4">
                {resultados.map((resultado, index) => (
                  <div
                    key={resultado.plano.id}
                    className={`rounded-lg border p-4 ${
                      index === 0 ? 'border-accent bg-accent/5' : 'bg-card'
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">
                            {resultado.plano.operadora} - {resultado.plano.nome}
                          </h4>
                          {index === 0 && (
                            <span className="rounded bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                              Melhor Opção
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{resultado.plano.acomodacao}</span>
                          <span>•</span>
                          <span>{resultado.plano.coparticipacao}</span>
                          {resultado.plano.regiao && (
                            <>
                              <span>•</span>
                              <span>{resultado.plano.regiao}</span>
                            </>
                          )}
                        </div>
                        {resultado.plano.observacao && (
                          <div className="mt-1 text-xs text-muted-foreground italic">
                            {resultado.plano.observacao}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-accent">
                          {formatCurrency(resultado.total)}
                        </div>
                        <div className="text-xs text-muted-foreground">por mês</div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-xs">
                            <th className="pb-2 text-left">Faixa</th>
                            <th className="pb-2 text-right">Qtd</th>
                            <th className="pb-2 text-right">Unit.</th>
                            <th className="pb-2 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultado.calculos.map((calc) => (
                            <tr key={calc.faixa} className="border-b border-border/30">
                              <td className="py-1.5 text-xs">{calc.faixa}</td>
                              <td className="py-1.5 text-right text-xs">{calc.quantidade}</td>
                              <td className="py-1.5 text-right text-xs">
                                {formatCurrency(calc.valorUnitario)}
                              </td>
                              <td className="py-1.5 text-right text-xs font-medium">
                                {formatCurrency(calc.subtotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
