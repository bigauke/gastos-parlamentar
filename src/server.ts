import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = "https://dadosabertos.camara.leg.br/api/v2";

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

// API Routes

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

// Start the server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  Gastos Parlamentar Web Server running locally  `);
  console.log(`  Access the web interface at: http://localhost:${PORT}`);
  console.log(`==================================================`);
});
