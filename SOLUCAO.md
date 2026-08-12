# Solução Técnica — Quick Filler

Este documento detalha a arquitetura e as soluções encontradas para o desafio de extração de cartões de ponto e holerites.

## 🏗️ Arquitetura

O sistema foi desenhado visando ser **simples, escalável e robusto**, separando claramente as responsabilidades:

1. **Frontend (Vite + React + Tailwind + shadcn/ui):** Foco total na experiência de revisão, permitindo visualização do PDF lado a lado com a edição.
2. **Backend (Node.js + Fastify):** Escolhido por lidar extremamente bem com rotas assíncronas e uploads multipartes. Ele atua como orquestrador do processamento.
3. **Banco de Dados (Prisma + SQLite/PostgreSQL):** A modelagem de dados foi mantida intencionalmente simples, com uma única tabela `Transcricao` e os dados estruturados armazenados em uma coluna JSON (`value`). Isso permite flexibilidade caso novos tipos de documentos ou campos sejam adicionados no futuro.
4. **Infraestrutura (Docker):** Toda a stack roda encapsulada, garantindo que o comando `docker-compose up` seja o único requisito para testar.

---

## 🧠 Lógica de Extração e Heurísticas

O maior risco técnico do projeto estava em lidar com **documentos escaneados** e **variações de layout**.

### 1. Fallback Automático para OCR
Muitos documentos parecem PDFs de texto, mas são imagens embutidas. Para resolver isso:
1. O sistema sempre tenta extrair texto nativo primeiro usando `pdfjs-dist`.
2. Se a quantidade de caracteres for muito baixa, ele assume que é um documento escaneado.
3. Nesse cenário, o PDF é convertido para um Canvas em memória e enviado ao `tesseract.js` para realizar o reconhecimento ótico de caracteres (OCR). Como o Tesseract usa Web Workers (adaptados para Node), isso não trava a thread principal da API.

### 2. Extrator de Cartão de Ponto
Para lidar com layouts onde as batidas vêm em colunas ou agrupadas numa mesma linha:
- O dia é ancorado via regex de data (`\d{2}/\d{2}/\d{4}`).
- As batidas são identificadas através do padrão `/([\d\?]{2}:[\d\?]{2}[a-zA-Z]?)/g`. **Nota importante:** o suporte ao caractere `?` foi adicionado intencionalmente na regex para suportar falhas do OCR. Dessa forma, podemos destacar o aviso visualmente na planilha sem descartar a batida.
- **Ignorando a Jornada:** Muitas vezes a carga horária (ex: 08:00) aparece logo após o nome do dia da semana. O algoritmo ignora essa primeira ocorrência para evitar que vire um Punch `IN`.
- **Ignorando Ocorrências:** Se o sistema detecta blocos de texto (ex: `HE-REMUNERADA`) no meio dos horários, ele para de registrar batidas naquela linha, pois sabe que os tempos a seguir se referem a quantidades e não a batidas reais.

### 3. Extrator de Holerite
O holerite traz a dificuldade de misturar campos de desconto e valores totais/bases soltos fora da tabela.
- **Cabeçalho:** Capturamos o mês e ano sempre buscando a âncora fixa "Período".
- **Vencimentos/Descontos:** Capturados ao buscar linhas que iniciam com números sequenciais curtos (códigos da verba).
- **Seção de Bases:** Assim que lemos a palavra "Total" ou "Líqüido", viramos a chave de contexto no código. A partir desse momento, as heurísticas focam puramente em casar *labels* conhecidas (ex: "Base INSS", "FGTS do Mês") com os valores monetários encontrados na linha, o que resolve o problema de múltiplas bases estarem aglutinadas na mesma string de OCR.
