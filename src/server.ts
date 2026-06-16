import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = "https://dadosabertos.camara.leg.br/api/v2";
const SENADO_API_BASE_URL = "https://legis.senado.leg.br/dadosabertos";
const CACHE_DIR = path.join(process.cwd(), "cache");

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Middleware
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "../public")));

/**
 * Helper to fetch data from the Chamber of Deputies API and return it.
 */
async function fetchFromApi(endpoint: string, query: any) {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  Object.entries(query).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      url.searchParams.append(key, String(val));
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json",
      "User-Agent": "gastos-parlamentar-web/1.0.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Chamber API returned status ${response.status}`);
  }

  return await response.json();
}

/**
 * Helper to get and cache Senate CEAPS data.
 */
async function getCeapsForYear(ano: number) {
  const cacheFile = path.join(CACHE_DIR, `ceaps-${ano}.json`);
  const exists = fs.existsSync(cacheFile);
  const isCurrentYear = ano === new Date().getFullYear();
  
  let shouldDownload = !exists;
  if (exists && isCurrentYear) {
    const stats = fs.statSync(cacheFile);
    const ageInHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
    if (ageInHours > 6) {
      shouldDownload = true;
    }
  }
  
  if (shouldDownload) {
    try {
      console.log(`Downloading CEAPS data for year ${ano}...`);
      const url = `https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/despesas_ceaps/${ano}`;
      const res = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "gastos-parlamentar-web/1.0.0"
        }
      });
      if (res.ok) {
        const data = await res.json();
        fs.writeFileSync(cacheFile, JSON.stringify(data));
        return data;
      } else {
        console.error(`Failed to download CEAPS for ${ano}, status: ${res.status}`);
        if (exists) {
          console.log("Using expired cache file as fallback.");
          return JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
        }
        throw new Error(`Failed to download CEAPS for ${ano}`);
      }
    } catch (err: any) {
      console.error(`Error downloading CEAPS for ${ano}:`, err.message);
      if (exists) {
        console.log("Using expired cache file as fallback.");
        return JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
      }
      throw err;
    }
  }
  
  return JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
}

// ==================================================
// CHAMBER OF DEPUTIES API ROUTES
// ==================================================

// 1. Get deputies list
app.get("/api/deputados", async (req, res) => {
  try {
    const data = await fetchFromApi("/deputados", req.query);
    res.json(data);
  } catch (error: any) {
    console.error("Error fetching deputies:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 2. Get deputy details
app.get("/api/deputados/:id", async (req, res) => {
  try {
    const data = await fetchFromApi(`/deputados/${req.params.id}`, {});
    res.json(data);
  } catch (error: any) {
    console.error(`Error fetching deputy ${req.params.id} details:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// 3. Get deputy expenses
app.get("/api/deputados/:id/despesas", async (req, res) => {
  try {
    const data = await fetchFromApi(`/deputados/${req.params.id}/despesas`, req.query);
    res.json(data);
  } catch (error: any) {
    console.error(`Error fetching deputy ${req.params.id} expenses:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// 4. Get deputy speeches (discursos)
app.get("/api/deputados/:id/discursos", async (req, res) => {
  try {
    const data = await fetchFromApi(`/deputados/${req.params.id}/discursos`, req.query);
    res.json(data);
  } catch (error: any) {
    console.error(`Error fetching deputy ${req.params.id} speeches:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// 5. Search propositions
app.get("/api/proposicoes", async (req, res) => {
  try {
    const data = await fetchFromApi("/proposicoes", req.query);
    res.json(data);
  } catch (error: any) {
    console.error("Error fetching propositions:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================================================
// FEDERAL SENATE API ROUTES
// ==================================================

// 1. Get senators list
app.get("/api/senadores", async (req, res) => {
  try {
    const url = `${SENADO_API_BASE_URL}/senador/lista/atual.json`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "gastos-parlamentar-web/1.0.0"
      }
    });

    if (!response.ok) {
      throw new Error(`Senate API returned status ${response.status}`);
    }

    const data = await response.json();
    let list = data.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar || [];

    // Apply filtering matching deputies API parameters
    const { nome, siglaUf, siglaPartido } = req.query;
    
    if (nome) {
      const n = String(nome).toLowerCase();
      list = list.filter((p: any) => 
        p.IdentificacaoParlamentar.NomeParlamentar.toLowerCase().includes(n) ||
        p.IdentificacaoParlamentar.NomeCompletoParlamentar.toLowerCase().includes(n)
      );
    }
    if (siglaUf) {
      const uf = String(siglaUf).toUpperCase();
      list = list.filter((p: any) => p.IdentificacaoParlamentar.UfParlamentar === uf);
    }
    if (siglaPartido) {
      const part = String(siglaPartido).toUpperCase();
      list = list.filter((p: any) => p.IdentificacaoParlamentar.SiglaPartidoParlamentar === part);
    }

    // Map to standardized structure matching deputies
    const mappedList = list.map((p: any) => ({
      id: Number(p.IdentificacaoParlamentar.CodigoParlamentar),
      nome: p.IdentificacaoParlamentar.NomeParlamentar,
      siglaPartido: p.IdentificacaoParlamentar.SiglaPartidoParlamentar,
      siglaUf: p.IdentificacaoParlamentar.UfParlamentar,
      urlFoto: p.IdentificacaoParlamentar.UrlFotoParlamentar,
      email: p.IdentificacaoParlamentar.EmailParlamentar || "",
      tipo: "senador"
    }));

    res.json({ dados: mappedList });
  } catch (error: any) {
    console.error("Error fetching senators:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 2. Get senator details
app.get("/api/senadores/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const url = `${SENADO_API_BASE_URL}/senador/${id}.json`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "gastos-parlamentar-web/1.0.0"
      }
    });

    if (!response.ok) {
      throw new Error(`Senate API returned status ${response.status}`);
    }

    const data = await response.json();
    const p = data.DetalheParlamentar?.Parlamentar;
    if (!p) {
      return res.status(404).json({ error: "Senator not found" });
    }

    const ident = p.IdentificacaoParlamentar;
    const basic = p.DadosBasicosParlamentar;

    // Standardize to match deputy profile response structure
    const standardized = {
      dados: {
        id: Number(ident.CodigoParlamentar),
        nomeCivil: ident.NomeCompletoParlamentar || ident.NomeParlamentar,
        ultimoStatus: {
          nome: ident.NomeParlamentar,
          siglaPartido: ident.SiglaPartidoParlamentar,
          siglaUf: ident.UfParlamentar,
          urlFoto: ident.UrlFotoParlamentar,
          email: ident.EmailParlamentar || "",
          gabinete: {
            sala: "",
            predio: basic?.EnderecoParlamentar || "Senado Federal",
            telefone: p.Telefones?.Telefone?.[0]?.NumeroTelefone || p.Telefones?.Telefone?.NumeroTelefone || ""
          }
        },
        dataNascimento: basic?.DataNascimento || "",
        municipioNascimento: basic?.Naturalidade || "",
        ufNascimento: basic?.UfNaturalidade || ""
      }
    };

    res.json(standardized);
  } catch (error: any) {
    console.error(`Error fetching senator ${req.params.id} details:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// 3. Get senator expenses (CEAPS)
app.get("/api/senadores/:id/despesas", async (req, res) => {
  try {
    const { id } = req.params;
    const ano = Number(req.query.ano) || new Date().getFullYear();
    const mes = req.query.mes ? Number(req.query.mes) : null;

    // Get CEAPS dataset (either from cache or direct download)
    const ceapsData = await getCeapsForYear(ano);
    
    // Filter expenses for this senator
    const senatorId = Number(id);
    let filtered = ceapsData.filter((exp: any) => Number(exp.codSenador) === senatorId);

    // Apply month filter if requested
    if (mes) {
      filtered = filtered.filter((exp: any) => Number(exp.mes) === mes);
    }

    // Sort by date descending
    filtered.sort((a: any, b: any) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime());

    // Map to structure expected by client
    const mapped = filtered.map((exp: any) => ({
      nomeFornecedor: exp.fornecedor || "Não identificado",
      cnpjCpfFornecedor: exp.cpfCnpj || "",
      tipoDespesa: exp.tipoDespesa,
      dataDocumento: exp.data || `${exp.ano}-${String(exp.mes).padStart(2, '0')}-01`,
      valorLiquido: exp.valorReembolsado || 0,
      valorDocumento: exp.valorReembolsado || 0,
      urlDocumento: null
    }));

    res.json({ dados: mapped });
  } catch (error: any) {
    console.error(`Error fetching senator ${req.params.id} expenses:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// 4. Get senator speeches (discursos)
app.get("/api/senadores/:id/discursos", async (req, res) => {
  try {
    const { id } = req.params;
    // We request discursos starting from 2025 to avoid API returning empty results
    const url = `${SENADO_API_BASE_URL}/senador/${id}/discursos.json?dataInicio=2025-01-01`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "gastos-parlamentar-web/1.0.0"
      }
    });

    if (!response.ok) {
      throw new Error(`Senate API returned status ${response.status}`);
    }

    const data = await response.json();
    const prons = data.DiscursosParlamentar?.Parlamentar?.Pronunciamentos?.Pronunciamento;
    
    let list: any[] = [];
    if (prons) {
      if (Array.isArray(prons)) {
        list = prons;
      } else {
        list = [prons];
      }
    }

    // Limit to latest 5
    list = list.slice(0, 5);

    // Map to structure expected by client
    const mapped = list.map((p: any) => ({
      dataHoraInicio: p.DataPronunciamento,
      tipoDiscurso: p.TipoUsoPalavra?.Descricao || "Plenário",
      sumario: p.TextoResumo || p.Indexacao || "Sem transcrição disponível."
    }));

    res.json({ dados: mapped });
  } catch (error: any) {
    console.error(`Error fetching senator ${req.params.id} speeches:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  Gastos Parlamentar Web Server running locally  `);
  console.log(`  Access the web interface at: http://localhost:${PORT}`);
  console.log(`==================================================`);
});
