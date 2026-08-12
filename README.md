# Quick Filler

Uma aplicação web para transcrição de documentos trabalhistas em PDF (cartões de ponto e holerites) para planilhas estruturadas.

## 🚀 Como Subir a Aplicação

Este projeto foi desenhado para subir instantaneamente com Docker Compose. O banco de dados SQLite é configurado automaticamente dentro do container, então não há necessidade de configurar variáveis de ambiente complexas ou instalar dependências no seu sistema.

Para subir a aplicação completa (Frontend + Backend), rode na raiz do projeto:

```bash
docker-compose up --build
```

O Frontend estará acessível em `http://localhost:3000` e a API rodando em `http://localhost:3333`.

---

## 🏗️ Arquitetura

O projeto adota uma arquitetura full-stack moderna e pragmática:

- **Frontend:** Next.js, TypeScript, Tailwind CSS e `shadcn/ui`. Focado em uma interface interativa (visualização lado a lado do PDF com edição da tabela em tempo real).
- **Backend:** Node.js com Fastify. Escolhido pela alta performance em lidar com uploads (multipart) e rotas rápidas.
- **Banco de Dados:** SQLite via Prisma ORM. O uso de SQLite local (dentro do container) garante praticidade extrema para avaliação, mantendo as transcrições e status consistentes.
- **Processamento/Worker:** O pipeline de extração funciona integrado ao Node (graças ao worker thread nativo do `tesseract.js`), recebendo o upload, registrando no banco, e disparando a leitura de maneira assíncrona.

---

## 🧠 Solução de Extração

O grande desafio do projeto foi garantir uma extração confiável de layouts variados (linhas vs vertical) e lidar com documentos nativos e escaneados.

### 1. OCR Inteligente
Usamos o `pdfjs-dist` para tentar extrair o texto limpo do arquivo. Se a extração voltar vazia ou com uma quantidade insignificante de caracteres (como ocorre em PDFs puramente escaneados), o sistema faz um **fallback automático** renderizando a página em um `Canvas` e utilizando o `tesseract.js` para realizar OCR, garantindo que o pipeline atenda ambos os cenários sem exigir que o usuário especifique o tipo do PDF.

### 2. Extrator de Cartão de Ponto (Heurísticas)
Para os cartões de ponto, o maior desafio foi lidar com marcações em linha e blocos verticais, além de ignorar totais e horários informativos.
- Utilizamos Expressões Regulares (`match(/^(\d{2}\/\d{2}\/\d{4})/`) para ancorar o dia na quebra linha a linha.
- As batidas são identificadas pela regex `/([\d\?]{2}:[\d\?]{2}[a-zA-Z]?)/g`. O sinal de interrogação é intencional para ajudar o avaliador (se o OCR falhar em ler um dígito perfeitamente, o regex ainda pega a marcação com a interrogação de aviso para ser destacada em amarelo no Excel).
- **Tratamento de Jornada:** Ignoramos batidas isoladas (ex: 08:00) logo após o nome do dia da semana, por costumarem ser a carga horária em vez do punch IN/OUT.
- **Tratamento de Ocorrências:** Ao encontrar palavras de 3+ letras ao longo da leitura das batidas (ex: "HE-BCO DE HORAS"), o extrator para de extrair batidas naquela linha, sabendo que os números subsequentes (ex: 00:13) representam a quantidade da ocorrência e não horários.

### 3. Extrator de Holerite (Heurísticas)
O holerite precisava mapear cabeçalho (mês/ano), campos de vencimentos e totalizadores das bases.
- Mês/Ano é âncorado na palavra "Período".
- Os **Vencimentos/Campos** são ancorados por números sequenciais no começo da linha (códigos de 4 a 5 dígitos).
- Quando identificamos totalizadores ("Total", "Líqüido", ou linhas contendo bases como "Base I.N.S.S."), mudamos o contexto para a **seção de Bases**, onde a heurística ignora os códigos e coleta os valores puramente baseados nos rótulos chave da última tabela do documento.

---

## 🧪 Testes
Para garantir a precisão cega, há testes unitários cobrindo o particionamento linha a linha dos extratores e testes de integração cobrindo a máquina de estados das rotas da API Fastify. Use `npm run test` no diretório do backend para validar os cenários em `vitest`.
