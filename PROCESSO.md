# Processo e Decisões — Quick Filler

Este documento detalha o processo mental e as decisões estratégicas tomadas durante o desenvolvimento do desafio, sempre com o foco na entrega do fluxo de valor completo dentro do tempo hábil.

## Priorizando o Fluxo (Ciclo Completo)
A principal regra seguida foi: **"Cortar profundidade, nunca o ciclo"**. 
Foi preferível criar uma experiência ponta-a-ponta (Envio → Processamento Assíncrono → Revisão Visual → Download do XLSX) que funcionasse de forma lisa, em vez de investir 90% do tempo construindo extratores perfeitos para layouts infinitos e falhar em entregar a interface final.

Os extratores foram construídos para cobrir 100% dos documentos de exemplo fornecidos, utilizando a mecânica visual (Canvas/Tesseract) para lidar com o problema mais caótico (PDFs não-selecionáveis), estabelecendo assim a base para melhorias futuras incrementais.

## Decisões Arquiteturais e Trade-offs

### 1. Prisma + SQLite Integrado vs Postgres Isolado
Apesar de uma arquitetura tradicional separar o banco de dados via rede, optou-se por usar **SQLite no Prisma** diretamente acoplado ao container do backend. 
- **O motivo:** O desafio exige facilidade absoluta para o avaliador subir o projeto (`docker-compose up`). Ao evitar um container dedicado para banco de dados e as complexidades de *wait-for-it* (esperar o banco subir para rodar migrations), garantimos que o container do backend estará 100% pronto no segundo 1, rodando migrations em arquivos locais (`.db`). 

### 2. Campo Value como JSON
Em vez de mapear tabelas filhas para cada `Punch` ou `HoleriteField`, usamos um único campo `value: JSON` na tabela `Transcricao`. 
- **O motivo:** Cartões de ponto e holerites têm dados completamente disformes (um tem batidas e matriz de dias, o outro tem campos chave-valor e bases isoladas). Se amarrássemos isso no SQL, precisaríamos criar inúmeras tabelas e migrações a cada novo tipo de documento suportado. Com a abordagem JSON (Schemaless dentro do SQL), o banco atua como um *Document Store*, acelerando as iterações e blindando a API contra quebras de contrato estrutural.

### 3. Validações e Contratos
Para garantir que "um número errado nunca passe despercebido", as validações (`zod`) e o contrato da API original foram respeitados de forma puritana (incluindo as interrogações `?` nos caracteres incertos). Além disso, não persistimos lógicas visuais no banco (como avisos de células vermelhas ou amarelas), delegando essa inteligência puramente para a rota geradora de relatórios (`exceljs`), mantendo o banco de dados apenas com a verdade extraída.

## 🤖 Uso de Inteligência Artificial

A Inteligência Artificial foi utilizada neste projeto como uma ferramenta de **pair-programming** contínua, focada em acelerar ciclos de feedback e reduzir tempo gasto com boilerplates estruturais. Principais usos:

1. **Discussão Arquitetural:** Validação das escolhas de stack e trade-offs estruturais (como a viabilidade de usar SQLite para contornar gargalos de deployment no `docker-compose`).
2. **Construção de Heurísticas:** As expressões regulares densas (como o `/([\d\?]{2}:[\d\?]{2}[a-zA-Z]?)/g`) foram prototipadas iterativamente com IA para prever ruídos caóticos gerados pelo `Tesseract.js` (como letras aleatórias grudadas nas horas).
3. **Escrita Rápida de Testes:** A geração do esqueleto dos testes de integração no Vitest e a formatação de mocks baseada no texto OCR extraído.

A IA atuou estritamente como acelerador, mantendo o direcionamento arquitetural, o code review e a decisão final sobre regras de negócio sempre centrados no controle humano.
