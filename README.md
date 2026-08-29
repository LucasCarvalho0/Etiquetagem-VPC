# QR → Código de Barras — VPC

PWA para conversão de QR Code (VIN) em código de barras, com geração de etiquetas em PDF A4, para operação de etiquetagem de veículos no VPC (Vehicle Processing Center).

## Stack

- **Front-end**: Next.js 16 (App Router) + React + TypeScript, Tailwind CSS v4, componentes estilo shadcn/ui
- **Leitura de QR**: `html5-qrcode`
- **Código de barras**: `JsBarcode` (Code128, gerado no client)
- **PDF**: `pdf-lib` (montagem do A4 com grid de etiquetas no servidor)
- **Back-end**: Next.js API Routes
- **Banco de dados**: PostgreSQL via Prisma ORM
- **PWA**: manifest + service worker manual (`public/sw.js`), instalável em tablet Android

## Estrutura

```
src/
  app/
    login/page.tsx              # tela de login do operador
    page.tsx                    # dashboard: lotes abertos + histórico
    lote/[id]/page.tsx          # tela de leitura (scanner + lista + gerar PDF)
    configuracoes/page.tsx      # dados da empresa + margens/layout da etiqueta
    api/
      auth/login/route.ts
      lotes/route.ts            # criar / listar lotes
      lotes/[id]/veiculos/route.ts   # registrar leitura (valida VIN + duplicado)
      lotes/[id]/pdf/route.ts   # gera o PDF final do lote
      lotes/[id]/finalizar/route.ts
      configuracao/route.ts     # GET/PUT config da empresa e etiqueta
  components/
    ui/                         # Button, Card, Input, Label (estilo shadcn)
    scanner/QrScanner.tsx       # wrapper do html5-qrcode
    theme/theme-toggle.tsx
    providers/                  # ThemeProvider, PwaRegister
  lib/
    prisma.ts, auth.ts, vin.ts, barcode.ts, pdf-etiquetas.ts
  proxy.ts                      # middleware de autenticação (Next 16)
prisma/
  schema.prisma                 # Operador, Lote, Veiculo, PdfGerado, ConfiguracaoEmpresa
  seed.ts                       # cria operador admin + config padrão
public/
  manifest.json, sw.js, icons/
```

## Como rodar localmente

1. **Instalar dependências** (já feito neste scaffold, mas para referência):
   ```bash
   npm install
   ```

2. **Configurar variáveis de ambiente**: copie `.env.example` para `.env` e ajuste:
   ```
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/qr_barcode_vpc?schema=public"
   JWT_SECRET="troque-por-um-segredo-forte"
   ```

3. **Gerar o Prisma Client e aplicar o schema no banco**:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```
   > Nota: neste ambiente de scaffold, `prisma generate` não pôde ser executado porque a sandbox bloqueia o download do engine binário da Prisma (`binaries.prisma.sh`). Isso é uma restrição do ambiente de geração, não do código — rodando localmente/em produção com acesso normal à internet, funciona normalmente.

4. **Popular o banco com dados iniciais** (operador admin):
   ```bash
   npm run db:seed
   ```
   Cria o operador `admin` / senha `123456` — **troque a senha em produção**.

5. **Rodar em desenvolvimento**:
   ```bash
   npm run dev
   ```
   Acesse `http://localhost:3000`.

6. **Build de produção**:
   ```bash
   npm run build
   npm start
   ```

## Instalação como PWA no tablet Android

1. Acesse a URL do sistema pelo Chrome no tablet.
2. Menu (⋮) → "Adicionar à tela inicial" / "Instalar app".
3. O app abre em modo standalone (sem barra de navegador), com ícone próprio.
4. O service worker (`public/sw.js`) cacheia o app shell para funcionar offline no essencial; leituras e geração de PDF exigem conexão (dados sempre gravados no servidor).

> **Ícones do PWA**: os arquivos em `public/icons/` foram gerados como placeholders (design simplificado de código de barras). Substitua por artes finais da identidade visual da empresa antes de publicar.

## Regras de negócio implementadas

- **Validação de VIN**: 17 caracteres alfanuméricos, sem `I`, `O`, `Q` (`src/lib/vin.ts`).
- **Duplicado no mesmo lote**: bloqueado via constraint única `(loteId, vin)` no banco + verificação na API antes de gravar.
- **Interface otimizada para toque**: botões grandes (`size="lg"`, altura mínima 44px), `touch-action: manipulation`.
- **Tema claro/escuro**: `next-themes`, com toggle manual e respeito à preferência do sistema.
- **Configurações de empresa e margens de etiqueta**: tela `/configuracoes`, com margens (topo/base/esquerda/direita), largura/altura da etiqueta e colunas por página — usados diretamente na geração do PDF (`src/lib/pdf-etiquetas.ts`).
- **Histórico por data, lote e operador**: dashboard lista lotes com filtro por status; API de lotes aceita `dataInicio`/`dataFim`.

## Controle de acesso

- `OPERADOR`: login, iniciar lote, ler QR, gerar PDF.
- `SUPERVISOR` / `ADMIN`: além do acima, podem alterar configurações da empresa (`PUT /api/configuracao` bloqueado para `OPERADOR`).

## Melhorias futuras (roadmap, não implementado)

- **Impressão térmica direta**: integração com impressoras térmicas (ex: via ESC/POS ou Zebra ZPL), substituindo/complementando o PDF A4.
- **Sincronização em nuvem**: fila offline-first no tablet (IndexedDB) com sincronização quando a conexão voltar — hoje as leituras exigem conexão ativa.
- **Dashboard de produtividade**: métricas de veículos/hora por operador, tempo médio por lote, comparativo entre turnos.

## Limitações conhecidas deste scaffold

- `prisma generate` não roda nesta sandbox (rede restrita); execute localmente.
- Ícones do PWA são placeholders simples, não arte final.
- Sem testes automatizados (unitários/E2E) — recomenda-se adicionar antes de produção, especialmente para `validarVin`, `extrairVinDoQr` e a lógica de paginação de `gerarPdfEtiquetas`.
- Sem rate limiting nas rotas de API.
