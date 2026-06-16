#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create the MCP server
const server = new McpServer({
  name: "gastos-parlamentar-mcp",
  version: "1.0.0",
});

const API_BASE_URL = "https://dadosabertos.camara.leg.br/api/v2";

/**
 * Helper to fetch data from the Dados Abertos Chamber of Deputies API.
 * Any console logging must go to console.error, since console.log will corrupt stdio transport.
 */
async function fetchFromApi<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        url.searchParams.append(key, String(val));
      }
    });
  }

  console.error(`Fetching: ${url.toString()}`);
  
  try {
    const response = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
        "User-Agent": "gastos-parlamentar-mcp/1.0.0"
      }
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data as T;
  } catch (error: any) {
    console.error(`Error fetching from Chamber API: ${error.message}`);
    throw error;
  }
}

// ==========================================
// TOOLS
// ==========================================

// 1. Tool: list_deputados
server.tool(
  "list_deputados",
  "Lists Brazilian deputies with filters (e.g. name, state, party, legislature).",
  {
    nome: z.string().optional().describe("Filter by part of the deputy's name (case insensitive)"),
    siglaUf: z.string().optional().describe("Filter by state abbreviation (e.g. SP, RJ, MG)"),
    siglaPartido: z.string().optional().describe("Filter by party abbreviation (e.g. PT, PL, PSOL)"),
    idLegislatura: z.number().optional().describe("Filter by legislature number (e.g. 57 for the 2023-2027 term)"),
    pagina: z.number().optional().describe("Page number (defaults to 1)"),
    itens: z.number().max(100).optional().describe("Items per page (default 15, max 100)")
  },
  async (args) => {
    try {
      const response = await fetchFromApi("/deputados", {
        nome: args.nome,
        siglaUf: args.siglaUf?.toUpperCase(),
        siglaPartido: args.siglaPartido?.toUpperCase(),
        idLegislatura: args.idLegislatura,
        pagina: args.pagina || 1,
        itens: args.itens || 15,
        ordem: "ASC",
        ordenarPor: "nome"
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.dados || [], null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to list deputies: ${error.message}`
          }
        ]
      };
    }
  }
);

// 2. Tool: get_deputado_detalhes
server.tool(
  "get_deputado_detalhes",
  "Gets detailed information about a specific deputy by their unique ID.",
  {
    id: z.number().describe("The unique identifier of the deputy (obtainable from list_deputados)")
  },
  async ({ id }) => {
    try {
      const response = await fetchFromApi(`/deputados/${id}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.dados || {}, null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to get details for deputy ID ${id}: ${error.message}`
          }
        ]
      };
    }
  }
);

// 3. Tool: get_deputado_despesas
server.tool(
  "get_deputado_despesas",
  "Gets parliamentary expenses (CEAP - Cota para Exercício da Atividade Parlamentar) for a specific deputy.",
  {
    id: z.number().describe("The unique identifier of the deputy"),
    ano: z.number().optional().describe("Filter expenses by a specific year (e.g. 2025)"),
    mes: z.number().min(1).max(12).optional().describe("Filter expenses by a specific month (1 to 12)"),
    pagina: z.number().optional().describe("Page number (defaults to 1)"),
    itens: z.number().max(100).optional().describe("Number of items per page (default 15, max 100)")
  },
  async (args) => {
    try {
      const response = await fetchFromApi(`/deputados/${args.id}/despesas`, {
        ano: args.ano,
        mes: args.mes,
        pagina: args.pagina || 1,
        itens: args.itens || 15,
        ordem: "DESC",
        ordenarPor: "ano,mes"
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.dados || [], null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to fetch expenses for deputy ID ${args.id}: ${error.message}`
          }
        ]
      };
    }
  }
);

// 4. Tool: get_deputado_discursos
server.tool(
  "get_deputado_discursos",
  "Gets speech transcripts and details delivered by a specific deputy.",
  {
    id: z.number().describe("The unique identifier of the deputy"),
    dataInicio: z.string().optional().describe("Start date in YYYY-MM-DD format"),
    dataFim: z.string().optional().describe("End date in YYYY-MM-DD format"),
    pagina: z.number().optional().describe("Page number (defaults to 1)"),
    itens: z.number().max(100).optional().describe("Number of items per page (default 15, max 100)")
  },
  async (args) => {
    try {
      const response = await fetchFromApi(`/deputados/${args.id}/discursos`, {
        dataInicio: args.dataInicio,
        dataFim: args.dataFim,
        pagina: args.pagina || 1,
        itens: args.itens || 15,
        ordem: "DESC",
        ordenarPor: "dataHoraInicio"
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.dados || [], null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to fetch speeches for deputy ID ${args.id}: ${error.message}`
          }
        ]
      };
    }
  }
);

// 5. Tool: buscar_proposicoes
server.tool(
  "buscar_proposicoes",
  "Searches for bills, proposals, and other legislative propositions in the Chamber of Deputies.",
  {
    siglaTipo: z.string().optional().describe("Type of proposition (e.g. PL, PEC, MPV)"),
    numero: z.number().optional().describe("Proposition number"),
    ano: z.number().optional().describe("Year of publication"),
    autor: z.string().optional().describe("Name of the author"),
    siglaPartidoAutor: z.string().optional().describe("Party abbreviation of the author (e.g. PT)"),
    siglaUfAutor: z.string().optional().describe("State abbreviation of the author (e.g. SP)"),
    pagina: z.number().optional().describe("Page number (defaults to 1)"),
    itens: z.number().max(100).optional().describe("Number of items per page (default 15, max 100)")
  },
  async (args) => {
    try {
      const response = await fetchFromApi("/proposicoes", {
        siglaTipo: args.siglaTipo?.toUpperCase(),
        numero: args.numero,
        ano: args.ano,
        autor: args.autor,
        siglaPartidoAutor: args.siglaPartidoAutor?.toUpperCase(),
        siglaUfAutor: args.siglaUfAutor?.toUpperCase(),
        pagina: args.pagina || 1,
        itens: args.itens || 15,
        ordem: "DESC",
        ordenarPor: "id"
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.dados || [], null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to search propositions: ${error.message}`
          }
        ]
      };
    }
  }
);

// ==========================================
// RESOURCES
// ==========================================

// Static resource: States (UFs) reference
const ESTADOS_BRASIL = [
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "AM", nome: "Amazonas" },
  { sigla: "AP", nome: "Amapá" },
  { sigla: "BA", nome: "Bahia" },
  { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" },
  { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" },
  { sigla: "MG", nome: "Minas Gerais" },
  { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MT", nome: "Mato Grosso" },
  { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" },
  { sigla: "PE", nome: "Pernambuco" },
  { sigla: "PI", nome: "Piauí" },
  { sigla: "PR", nome: "Paraná" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" },
  { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SE", nome: "Sergipe" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "TO", nome: "Tocantins" }
];

server.resource(
  "estados-brasil",
  "referencia://estados",
  {
    mimeType: "application/json",
    description: "List of all Brazilian states (UF abbreviations and full names)"
  },
  async () => ({
    contents: [
      {
        uri: "referencia://estados",
        mimeType: "application/json",
        text: JSON.stringify(ESTADOS_BRASIL, null, 2)
      }
    ]
  })
);

// Dynamic resource: Current active political parties
server.resource(
  "partidos-politicos",
  "referencia://partidos",
  {
    mimeType: "application/json",
    description: "Dynamically lists all current political parties active in the Brazilian Chamber of Deputies."
  },
  async () => {
    try {
      const response = await fetchFromApi("/partidos", {
        itens: 100,
        ordem: "ASC",
        ordenarPor: "sigla"
      });
      return {
        contents: [
          {
            uri: "referencia://partidos",
            mimeType: "application/json",
            text: JSON.stringify(response.dados || [], null, 2)
          }
        ]
      };
    } catch (error: any) {
      throw new Error(`Failed to read partidos resource: ${error.message}`);
    }
  }
);

// ==========================================
// PROMPTS
// ==========================================

server.prompt(
  "analisar-gastos",
  "Assists the model in compiling and analyzing parliamentary expenses for a deputy.",
  {
    deputadoId: z.string().describe("The numeric ID of the deputy to analyze"),
    ano: z.string().optional().describe("Year to filter expenses (e.g., 2025)"),
    mes: z.string().optional().describe("Month number to filter expenses (1-12)")
  },
  ({ deputadoId, ano, mes }) => {
    const filters = [];
    if (ano) filters.push(`ano: ${ano}`);
    if (mes) filters.push(`mês: ${mes}`);
    const filtersStr = filters.length > 0 ? ` (${filters.join(", ")})` : "";

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Por favor, faça uma análise detalhada dos gastos do deputado federal cujo ID é ${deputadoId}${filtersStr}.

Para fazer isso, utilize as seguintes etapas de ferramentas:
1. Obtenha as informações de cadastro do deputado usando 'get_deputado_detalhes'.
2. Obtenha a lista de despesas correspondentes usando 'get_deputado_despesas'.
3. Consolide os gastos por fornecedor (CNPJ/CPF), somando os totais.
4. Identifique o tipo de despesa mais frequente e o mais custoso.
5. Apresente um resumo executivo com os principais achados em português, incluindo o percentual correspondente a cada categoria de gastos.`
          }
        }
      ]
    };
  }
);

// ==========================================
// TRANSPORT & CONNECTIONS
// ==========================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Gastos Parlamentar MCP Server running on stdio transport");
}

main().catch((error) => {
  console.error("Server execution error:", error);
  process.exit(1);
});
