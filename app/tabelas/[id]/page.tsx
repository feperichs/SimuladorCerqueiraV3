'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Printer, AlertCircle } from 'lucide-react'
import { buscarTabelaPorId } from '@/lib/tabelas-disponiveis'

export default function VisualizadorTabelaPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [tabela, setTabela] = useState(buscarTabelaPorId(id))
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    if (!tabela) {
      setErro(true)
      setCarregando(false)
      return
    }

    // Simular carregamento
    const timer = setTimeout(() => {
      setCarregando(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [tabela])

  const handleImprimir = () => {
    const iframe = document.getElementById('tabela-iframe') as HTMLIFrameElement
    if (iframe?.contentWindow) {
      iframe.contentWindow.print()
    }
  }

  const handleVoltar = () => {
    router.push('/tabelas')
  }

  if (erro || !tabela) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Tabela não encontrada</h2>
          <p className="text-sm text-muted-foreground mb-6">
            A tabela solicitada não está disponível ou foi removida.
          </p>
          <Button onClick={handleVoltar}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Tabelas
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header com controles */}
      <div className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleVoltar}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              
              <div className="border-l border-border pl-4">
                <h1 className="font-semibold text-foreground">{tabela.nome}</h1>
                <p className="text-xs text-muted-foreground">
                  {tabela.operadora} {tabela.descricao && `• ${tabela.descricao}`}
                </p>
              </div>
            </div>

            <Button 
              variant="outline" 
              size="sm"
              onClick={handleImprimir}
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>
      </div>

      {/* Iframe com a tabela */}
      <div className="flex-1 relative">
        {carregando && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Carregando tabela...</p>
            </div>
          </div>
        )}
        
        <iframe
          id="tabela-iframe"
          src={tabela.arquivo}
          className="w-full h-full border-0"
          style={{ minHeight: 'calc(100vh - 73px)' }}
          title={tabela.nome}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          onLoad={() => setCarregando(false)}
          onError={() => {
            setCarregando(false)
            setErro(true)
          }}
        />
      </div>
    </div>
  )
}
