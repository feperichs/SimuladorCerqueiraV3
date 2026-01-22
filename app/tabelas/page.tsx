'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, FileText, ArrowLeft } from 'lucide-react'
import { 
  tabelasDisponiveis,
  getOperadorasDisponiveis,
  filtrarPorOperadora,
  buscarTabelas,
  type TabelaDisponivel
} from '@/lib/tabelas-disponiveis'
import { useSearchParams } from 'next/navigation'
import Loading from './loading'

export default function TabelasPage() {
  const searchParams = useSearchParams()
  const [busca, setBusca] = useState('')
  const [operadoraSelecionada, setOperadoraSelecionada] = useState('Todos')

  // Lista de operadoras disponíveis
  const operadoras = useMemo(() => getOperadorasDisponiveis(), [])

  // Filtrar tabelas
  const tabelasFiltradas = useMemo(() => {
    let resultado = tabelasDisponiveis

    // Filtrar por operadora
    if (operadoraSelecionada !== 'Todos') {
      resultado = filtrarPorOperadora(operadoraSelecionada)
    }

    // Filtrar por busca
    if (busca.trim()) {
      resultado = buscarTabelas(busca)
    }

    return resultado
  }, [busca, operadoraSelecionada])

  // Agrupar por operadora
  const tabelasAgrupadas = useMemo(() => {
    const grupos: Record<string, TabelaDisponivel[]> = {}
    
    tabelasFiltradas.forEach(tabela => {
      if (!grupos[tabela.operadora]) {
        grupos[tabela.operadora] = []
      }
      grupos[tabela.operadora].push(tabela)
    })

    return grupos
  }, [tabelasFiltradas])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header com Navegação */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-primary">Consulta de Tabelas</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Visualize as tabelas completas com regras, carências e informações detalhadas
              </p>
            </div>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Simulação
              </Button>
            </Link>
          </div>

          {/* Abas de Navegação */}
          <div className="flex gap-2 border-b border-border">
            <Link href="/">
              <Button variant="ghost" className="rounded-b-none border-b-2 border-transparent hover:border-primary">
                Simulação
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              className="rounded-b-none border-b-2 border-primary text-primary hover:border-primary"
            >
              Tabelas
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Busca */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Buscar Tabela
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite o nome do plano ou operadora..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtro por Operadora */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Filtrar por Operadora
              </label>
              <Select value={operadoraSelecionada} onValueChange={setOperadoraSelecionada}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todas as Operadoras</SelectItem>
                  {operadoras.map(op => (
                    <SelectItem key={op} value={op}>{op}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contador de resultados */}
          <div className="mt-4 text-sm text-muted-foreground">
            Mostrando {tabelasFiltradas.length} tabela(s) de {tabelasDisponiveis.length} disponível(is)
          </div>
        </Card>

        {/* Lista de Tabelas Agrupadas */}
        {Object.keys(tabelasAgrupadas).length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma tabela encontrada</h3>
            <p className="text-sm text-muted-foreground">
              Tente ajustar os filtros ou a busca
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(tabelasAgrupadas).map(([operadora, tabelas]) => (
              <div key={operadora}>
                <h2 className="text-xl font-bold text-primary mb-3 flex items-center gap-2">
                  <div className="h-1 w-8 bg-primary rounded" />
                  {operadora}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({tabelas.length} {tabelas.length === 1 ? 'tabela' : 'tabelas'})
                  </span>
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tabelas.map(tabela => (
                    <Link key={tabela.id} href={`/tabelas/${tabela.id}`}>
                      <Card className="p-4 hover:shadow-lg hover:border-primary transition-all cursor-pointer h-full">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground mb-1 truncate">
                              {tabela.nome}
                            </h3>
                            {tabela.descricao && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {tabela.descricao}
                              </p>
                            )}
                            <div className="mt-2">
                              <Button variant="link" className="h-auto p-0 text-xs">
                                Ver tabela completa →
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
