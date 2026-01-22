'use client'

import { useState } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
// Ajuste o caminho '../app/admin/actions' se necessário, dependendo de onde criar este arquivo
import { processarUpload } from '@/app/admin/actions'; 

export default function ImportadorTabelas() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [logs, setLogs] = useState<string[]>([]);
    const [fileName, setFileName] = useState<string>('');

    async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const file = formData.get('file') as File;
        
        if (!file || file.size === 0) return;

        setStatus('loading');
        setLogs(['Iniciando processamento...', 'Lendo arquivo HTML...', 'Limpando estilos e scripts...']);

        // Chama a Server Action
        const resultado = await processarUpload(formData);

        if (resultado.success) {
            setStatus('success');
            setLogs(prev => [...prev, ...resultado.details!, '✅ Processo Finalizado!']);
        } else {
            setStatus('error');
            setLogs(prev => [...prev, `❌ ERRO: ${resultado.message}`]);
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">
                Importar Nova Tabela
            </h2>
            
            <form onSubmit={handleUpload} className="space-y-6">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-slate-50 transition-colors relative">
                    <input 
                        type="file" 
                        name="file" 
                        accept=".html,.htm"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                            if(e.target.files?.[0]) {
                                setFileName(e.target.files[0].name);
                                setStatus('idle');
                                setLogs([]);
                            }
                        }}
                    />
                    <div className="flex flex-col items-center pointer-events-none">
                        <UploadCloud className="w-10 h-10 text-blue-500 mb-2" />
                        <span className="text-base font-medium text-slate-700">
                            {fileName || "Clique ou arraste o HTML aqui"}
                        </span>
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={status === 'loading' || !fileName}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                    {status === 'loading' ? (
                        <> <Loader2 className="animate-spin w-5 h-5" /> Processando... </>
                    ) : (
                        "Importar e Atualizar Sistema"
                    )}
                </button>
            </form>

            {/* Área de Logs Compacta */}
            {logs.length > 0 && (
                <div className={`mt-6 p-4 rounded-lg text-sm ${status === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    <div className="flex items-center gap-2 mb-2 font-bold">
                        {status === 'success' ? <CheckCircle className="w-4 h-4"/> : 
                         status === 'error' ? <AlertCircle className="w-4 h-4"/> : 
                         <Loader2 className="animate-spin w-4 h-4"/>}
                        <span>Log de Execução</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 opacity-80">
                        {logs.map((log, i) => (
                            <li key={i}>{log}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}