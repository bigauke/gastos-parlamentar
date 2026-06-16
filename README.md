# Gastos Parlamentar MCP Server (Dados Abertos - Câmara dos Deputados)

Este é um servidor MCP (Model Context Protocol) escrito em TypeScript para interagir com a API de Dados Abertos da Câmara dos Deputados do Brasil. Ele permite que agentes de IA busquem informações sobre deputados federais, analisem suas despesas parlamentares (CEAP), leiam discursos e busquem proposições legislativas (projetos de lei, PECs, etc.).

## Recursos Expostos

### 🛠️ Ferramentas (Tools)

- `list_deputados`: Lista/busca deputados federais com filtros (nome, estado/UF, partido, legislatura).
- `get_deputado_detalhes`: Obtém informações detalhadas de um deputado específico por ID.
- `get_deputado_despesas`: Obtém as despesas (CEAP) de um deputado por ID, com filtros opcionais de ano e mês.
- `get_deputado_discursos`: Obtém a transcrição dos discursos de um deputado por ID.
- `buscar_proposicoes`: Busca por proposições legislativas (ex: PECs, PLs, MPVs).

### 📁 Recursos (Resources)

- `referencia://estados`: Lista estática de estados (UFs) e nomes por extenso.
- `referencia://partidos`: Lista dinâmica de todos os partidos políticos ativos na Câmara dos Deputados.

### 📝 Prompts (Templates)

- `analisar-gastos`: Roteiro estruturado para instruir o modelo a coletar, classificar e auditar os gastos de um parlamentar.

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
