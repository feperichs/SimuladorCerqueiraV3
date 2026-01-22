
* COMANDOS PRINCIPAIS 

npx ts-node --esm scripts/limpar.ts - SERVE PARA LIMPAR OS HTMLS "SUJOS" 

npx ts-node --esm scripts/importar.ts valores/amil/amilbronze.ts  - SERVE PARA IMPORTAR OS VALORES DAS TABELAS

npx ts-node --esm scripts/extrair-valores.ts - SERVE PARA PEGAR OS VALORES QUE FICAM NAS TABELAS NA PUBLIC, E APOS ISSO COLOCA NA PASTA LIB EM planos-completos PARA PODER FAZER A COTAÇÃO

npx ts-node --esm scripts/sincronizar-tabelas.ts - SERVE PARA PEGAR OS ARQUIVOS DE "tabelas-html" E COLOCAR EM "tabelas-disponiveis" ISSO PARA VISUALIZAR NO SITE





🤖 Importador Automático de Valores de Planos

Este script em Node.js/TypeScript automatiza a inserção de novos planos de saúde no sistema. Ele lê arquivos .ts contendo objetos de planos e injeta o conteúdo diretamente no arquivo principal de dados (lib/planos-completos.ts), mantendo a formatação e adicionando comentários de organização.

📋 Pré-requisitos

Antes de usar, certifique-se de que você tem as dependências instaladas no projeto. Abra o terminal na pasta raiz e rode:

Bash

npm install -D ts-node typescript

(O script usa módulos nativos do Node.js fs e path, então não precisa de bibliotecas pesadas extras).

📂 Estrutura de Pastas Recomendada
Para manter o projeto organizado, siga esta estrutura:

Plaintext
/simuladorcerqueira
│
├── /lib
│   └── planos-completos.ts       <-- ARQUIVO DESTINO (Onde os dados entram)
│
├── /scripts
│   └── importar.ts            <-- O SCRIPT (O código que faz a mágica)
│
└── /Valores                    <-- PASTA NOVA (Crie essa pasta na raiz)
    ├── /amil
    │   └── amilbronze.ts         <-- ARQUIVO ORIGEM (Os dados novos)
    ├── /notredame
    │   └── smart200.ts
    └── /sulamerica
        └── exato.ts

📝 Formato do Arquivo de Entrada

Os arquivos dentro da pasta valores/ (ex: amilbronze.ts) devem conter apenas os objetos dos planos, sem export const ou definições de variáveis.

Exemplo correto (valores/amil/amilbronze.ts):

TypeScript
// Você pode colocar comentários aqui, o script vai ignorar.

{
  id: "amil-s380-enf",
  operadora: "Amil",
  nome: "Amil S380",
  tipo: "PME",
  acomodacao: "Enfermaria",
  coparticipacao: "Com Coparticipação",
  precos: {
    "0-18": 200.50,
    "59+": 900.00
  }
},
{
  id: "amil-s380-apto",
  operadora: "Amil",
  nome: "Amil S380 Apto",
  // ... restante dos dados
}
🚀 Como Executar
Abra o terminal do VS Code na raiz do projeto.

Execute o comando abaixo, alterando o caminho do arquivo final:

Bash
npx ts-node --esm scripts/importar.ts valores/pasta_da_seguradora/nome_do_arquivo.ts
Exemplo real:

Bash
npx ts-node --esm scripts/importar.ts valores/amil/amilbronze.ts
O que vai acontecer?
O script lê o arquivo amilbronze.ts.

Remove linhas de comentários para limpar o código.

Abre o lib/planos-completos.ts.

Encontra o final da lista de planos existente.

Insere os novos planos lá dentro.

Salva o arquivo automaticamente.

⚠️ Solução de Problemas Comuns
Erro: MODULE_NOT_FOUND ou Cannot find module
Causa: Você provavelmente digitou o nome do script errado ou ele não está na pasta scripts.

Solução: Verifique se o arquivo se chama importar.ts (com traço) ou importar.ts e se ele está dentro da pasta scripts.

Erro: Arquivo não encontrado na raiz
Causa: O caminho do arquivo de tabela que você passou no comando está errado.

Solução: Se o arquivo está em valores/amil/teste.ts, o comando deve ser exatamente valores/amil/teste.ts. Use barras normais / mesmo no Windows.

Erro: Não encontrei a lista "export const planos = ["
Causa: O arquivo lib/planos-completos.ts foi alterado manualmente e a estrutura quebrou.

Solução: Abra o arquivo de destino e verifique se ele começa com export const planos = [. O script depende dessa linha exata para funcionar.