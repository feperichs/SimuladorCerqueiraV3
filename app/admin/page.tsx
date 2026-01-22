'use client'

import React, { useState } from "react"
import { UploadCloud, Loader2, CheckCircle2, AlertCircle, FileText, LayoutDashboard, ChevronRight, DollarSign } from 'lucide-react'
import { processarUpload, PlanoExtraido } from './actions'

export default function AdminPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [logs, setLogs] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [planos, setPlanos] = useState<PlanoExtraido[]>([])

  async function handleUpload() {
    if (!selectedFile) return;

    const formData = new FormData()
    formData.append('file', selectedFile)
    
    setStatus('loading')
    setLogs(['Iniciando processamento...', 'Analisando estrutura HTML...'])
    setPlanos([])

    try {
      const resultado = await processarUpload(formData)

      if (resultado.success) {
        setStatus('success')
        setLogs(prev => [...prev, ...resultado.details!])
        if (resultado.planos) setPlanos(resultado.planos)
      } else {
        setStatus('error')
        setLogs(prev => [...prev, resultado.message])
      }
    } catch (error) {
      setStatus('error')
      setLogs(prev => [...prev, "Erro de comunicação."])
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      
      {/* Navbar Simples */}
      <nav className="bg-white border-b border-slate-200 px-8 py-4 flex items-center gap-3 shadow-sm sticky top-0 z-50">
        <div className="bg-blue-600 p-2 rounded-lg">
          <LayoutDashboard className="text-white w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Importador Inteligente</h1>
          <p className="text-xs text-slate-500">Sistema de Gestão de Tabelas</p>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* SIDEBAR: CONTROLES (Col Span 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card de Upload */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-blue-500" />
              Novo Arquivo
            </h2>
            
            <div className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${selectedFile ? 'border-blue-500 bg-blue-50/30' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}>
              <input
                type="file"
                accept=".html,.htm"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setSelectedFile(e.target.files[0])
                    setStatus('idle')
                    setPlanos([])
                    setLogs([])
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              
              <div className="flex flex-col items-center pointer-events-none">
                <div className={`p-4 rounded-full mb-3 shadow-sm transition-colors ${selectedFile ? 'bg-green-100' : 'bg-white border border-slate-100'}`}>
                  {selectedFile ? <FileText className="w-6 h-6 text-green-600" /> : <UploadCloud className="w-6 h-6 text-slate-400" />}
                </div>
                <p className="font-semibold text-slate-700 truncate w-full px-2">
                  {selectedFile ? selectedFile.name : "Arraste ou clique"}
                </p>
                <p className="text-xs text-slate-400 mt-1">Suporta arquivos .html brutos</p>
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={!selectedFile || status === 'loading'}
              className="w-full mt-6 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10"
            >
              {status === 'loading' ? <Loader2 className="animate-spin w-5 h-5" /> : "Iniciar Processamento"}
            </button>
          </div>

          {/* Card de Logs */}
          {logs.length > 0 && (
            <div className={`bg-white rounded-xl p-5 shadow-sm border overflow-hidden ${status === 'error' ? 'border-red-100' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2 mb-3 border-b border-slate-50 pb-2">
                {status === 'loading' && <Loader2 className="w-4 h-4 animate-spin text-blue-500"/>}
                {status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500"/>}
                {status === 'error' && <AlertCircle className="w-4 h-4 text-red-500"/>}
                <span className="text-sm font-bold text-slate-700">Status do Sistema</span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-2 text-xs text-slate-600">
                    <ChevronRight className="w-3 h-3 text-slate-300 mt-0.5 shrink-0" />
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MAIN: RESULTADOS (Col Span 8) */}
        <div className="lg:col-span-8">
          {planos.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="text-green-500 w-6 h-6" />
                  Dados Extraídos e Injetados
                </h2>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                  {planos.length} Variações
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {planos.map((plano, i) => (
                  <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {plano.operadora}
                        </span>
                        <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">
                          {plano.nome.split('(')[0]}
                        </h3>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <DollarSign className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${plano.acomodacao === 'Apartamento' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                        {plano.acomodacao}
                      </span>
                      <span className="bg-orange-50 text-orange-700 text-[10px] font-bold px-2 py-1 rounded-md">
                        {plano.vidas}
                      </span>
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-md">
                        {plano.tipo}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">0-18 anos</p>
                        <p className="font-mono text-sm font-semibold text-slate-700">
                          R$ {plano.precos['0-18']?.toFixed(2) || '--'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">59+ anos</p>
                        <p className="font-mono text-sm font-semibold text-slate-700">
                          R$ {plano.precos['59+']?.toFixed(2) || '--'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[500px] bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-12">
              <div className="bg-slate-50 p-6 rounded-full mb-6 animate-pulse">
                <LayoutDashboard className="w-12 h-12 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">Aguardando Arquivo</h3>
              <p className="text-slate-400 max-w-md mx-auto">
                Faça o upload ao lado. O sistema irá limpar o HTML, identificar os preços, atualizar o menu e injetar os dados no banco de cotação.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}