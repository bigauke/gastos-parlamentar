# Fiscaliza Cota Parlamentar (Câmara dos Deputados & Senado Federal)

Este é um projeto em TypeScript que expõe uma API local, um servidor MCP (Model Context Protocol) e uma aplicação web interativa para consultar e auditar os gastos de parlamentares federais do Brasil (Deputados Federais e Senadores). Ele integra as APIs de Dados Abertos da Câmara dos Deputados (CEAP) e do Senado Federal (CEAPS).

---

## Recursos Disponíveis

### 🖥️ Painel Web (Interface de Usuário)
Acesse a interface completa em `http://localhost:3000` para:
- Alternar dinamicamente entre a **Câmara dos Deputados** e o **Senado Federal**.
- Buscar parlamentares por nome, estado (UF) ou partido político.
- Visualizar um **carrossel dinâmico e interativo** de destaques rápidos dos parlamentares mais influentes do país.
- Consultar a ficha cadastral do parlamentar, incluindo contatos e gabinete.
- Visualizar um gráfico de rosquinha interativo (Chart.js) detalhando os **Gastos por Categoria** de forma dinâmica por ano e mês.
- Acessar a tabela completa de notas fiscais com links de download em **PDF das notas fiscais originais** (CEAP e CEAPS).
- Ler os discursos mais recentes do parlamentar.

### 🛠️ Servidor MCP (Model Context Protocol)
Permite que clientes de IA (como Claude Desktop, Cursor, Cline, etc.) consultem diretamente as APIs:
- `list_deputados`: Lista/busca deputados federais.
- `get_deputado_detalhes`: Dados cadastrais detalhados do deputado.
- `get_deputado_despesas`: Gastos da cota parlamentar (CEAP) do deputado.
- `get_deputado_discursos`: Discursos proferidos pelo deputado.
- `buscar_proposicoes`: Busca projetos de lei e emendas.

---

## Como Instalar e Rodar

### Pré-requisitos

- Node.js (v18 ou superior)
- npm

### 1. Clonar/Acessar o Diretório e Instalar Dependências

```bash
npm install
```

### 2. Compilar o Projeto

```bash
npm run build
```

---

## Configuração em Clientes de IA

### Claude Desktop App

Adicione o seguinte trecho à sua configuração do Claude Desktop (`%appdata%\Claude\claude_desktop_config.json` no Windows ou `~/Library/Application Support/Claude/claude_desktop_config.json` no macOS/Linux):

```json
{
  "mcpServers": {
    "gastos-parlamentar": {
      "command": "node",
      "args": [
        "D:/Projects/gastos-parlamentar/dist/index.js"
      ]
    }
  }
}
```

> **Nota:** Certifique-se de ajustar o caminho absoluto da pasta `dist/index.js` para corresponder ao seu ambiente local.

### Claude Code CLI

Para rodar localmente com o Claude Code, você pode adicionar o servidor usando o comando:

```bash
claude mcp add gastos-parlamentar node D:/Projects/gastos-parlamentar/dist/index.js
```

### Cursor, Windsurf ou Cline

Cadastre o servidor como do tipo `command` (stdio):
- **Command:** `node`
- **Arguments:** `D:/Projects/gastos-parlamentar/dist/index.js`

---

## Desenvolvimento

Para rodar em modo de desenvolvimento (atualizando automaticamente ao alterar arquivos):

```bash
npm run dev
```

---

## Licença

Este projeto é de domínio público para incentivar a transparência e controle social de gastos públicos.
