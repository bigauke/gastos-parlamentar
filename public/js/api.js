// api.js - Módulo de integração com APIs da Câmara e do Senado

const API_CAMARA = "https://dadosabertos.camara.leg.br/api/v2";
const API_SENADO = "https://legis.senado.leg.br/dadosabertos";
const CEAPS_SENADO = "https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/despesas_ceaps";

/**
 * Utilitário genérico de fetch para a Câmara
 */
async function fetchCamara(endpoint, params = {}) {
  const url = new URL(`${API_CAMARA}${endpoint}`);
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      url.searchParams.append(key, String(val));
    }
  });

  const response = await fetch(url.toString());

  if (!response.ok) throw new Error(`Erro API Câmara: ${response.status}`);
  return await response.json();
}

/**
 * Busca listagem de parlamentares (Câmara ou Senado)
 */
export async function fetchParlamentares(house, filters) {
  if (house === "camara") {
    // Câmara
    const data = await fetchCamara("/deputados", filters);
    // data.dados já vem no formato esperado
    return data.dados.map(p => ({ ...p, tipo: "camara" }));
  } else {
    // Senado
    const url = `${API_SENADO}/senador/lista/atual.json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Erro API Senado");
    
    const data = await response.json();
    let list = data.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar || [];

    // Filtros no lado do cliente para Senado
    if (filters.nome) {
      const n = String(filters.nome).toLowerCase();
      list = list.filter(p => 
        p.IdentificacaoParlamentar.NomeParlamentar.toLowerCase().includes(n) ||
        p.IdentificacaoParlamentar.NomeCompletoParlamentar.toLowerCase().includes(n)
      );
    }
    if (filters.siglaUf) {
      const uf = String(filters.siglaUf).toUpperCase();
      list = list.filter(p => p.IdentificacaoParlamentar.UfParlamentar === uf);
    }
    if (filters.siglaPartido) {
      const part = String(filters.siglaPartido).toUpperCase();
      list = list.filter(p => p.IdentificacaoParlamentar.SiglaPartidoParlamentar === part);
    }

    return list.map(p => ({
      id: Number(p.IdentificacaoParlamentar.CodigoParlamentar),
      nome: p.IdentificacaoParlamentar.NomeParlamentar,
      siglaPartido: p.IdentificacaoParlamentar.SiglaPartidoParlamentar,
      siglaUf: p.IdentificacaoParlamentar.UfParlamentar,
      urlFoto: p.IdentificacaoParlamentar.UrlFotoParlamentar,
      email: p.IdentificacaoParlamentar.EmailParlamentar || "",
      tipo: "senado"
    }));
  }
}

/**
 * Busca detalhes de um parlamentar específico
 */
export async function fetchParlamentarDetalhes(house, id) {
  if (house === "camara") {
    const data = await fetchCamara(`/deputados/${id}`);
    return data.dados;
  } else {
    const url = `${API_SENADO}/senador/${id}.json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Erro API Senado Detalhes");
    
    const data = await response.json();
    const p = data.DetalheParlamentar?.Parlamentar;
    if (!p) throw new Error("Senador não encontrado");

    const ident = p.IdentificacaoParlamentar;
    const basic = p.DadosBasicosParlamentar;

    return {
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
    };
  }
}

/**
 * Função de Cache usando Cache API do Navegador para baixar CEAPS
 */
async function fetchCachedSenadoCeaps(ano) {
  // 1. Tenta carregar primeiro os dados estáticos locais hospedados com a aplicação
  try {
    const staticRes = await fetch(`./data/ceaps-${ano}.json`);
    if (staticRes.ok) {
      console.log(`Usando dados estáticos empacotados para CEAPS Senado - ${ano}`);
      return await staticRes.json();
    }
  } catch (e) {
    console.warn(`Não foi possível carregar ./data/ceaps-${ano}.json, tentando fallback...`);
  }

  const url = `${CEAPS_SENADO}/${ano}`;
  const cacheName = 'ceaps-cache-v1';
  
  if ('caches' in window) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(url);
    if (cachedResponse) {
      console.log(`Usando cache local para CEAPS Senado - ${ano}`);
      return await cachedResponse.json();
    }
    
    console.log(`Baixando CEAPS Senado - ${ano}...`);
    try {
      const response = await fetch(url);
      if (response.ok) {
        cache.put(url, response.clone());
        return await response.json();
      }
    } catch (err) {
      console.warn("Erro no fetch direto, tentando fallback...", err);
    }
  }

  // Fallback se Cache API não existir
  const response = await fetch(url);
  return await response.json();
}

/**
 * Busca despesas
 */
export async function fetchDespesas(house, id, ano, mes) {
  if (house === "camara") {
    const filters = { itens: 100 };
    if (ano) filters.ano = ano;
    if (mes) filters.mes = mes;
    const data = await fetchCamara(`/deputados/${id}/despesas`, filters);
    return data.dados;
  } else {
    // Senado CEAPS
    ano = ano || new Date().getFullYear();
    const ceapsData = await fetchCachedSenadoCeaps(ano);
    
    const senatorId = Number(id);
    let filtered = ceapsData.filter(exp => Number(exp.codSenador) === senatorId);
    
    if (mes) {
      filtered = filtered.filter(exp => Number(exp.mes) === Number(mes));
    }

    filtered.sort((a, b) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime());

    return filtered.map(exp => ({
      nomeFornecedor: exp.fornecedor || "Não identificado",
      cnpjCpfFornecedor: exp.cpfCnpj || "",
      tipoDespesa: exp.tipoDespesa,
      dataDocumento: exp.data || `${exp.ano}-${String(exp.mes).padStart(2, '0')}-01`,
      valorLiquido: exp.valorReembolsado || 0,
      valorDocumento: exp.valorReembolsado || 0,
      urlDocumento: exp.id ? `https://www6g.senado.leg.br/transparencia/sen/download/ceaps/documento/${exp.id}` : null
    }));
  }
}

/**
 * Busca discursos
 */
export async function fetchDiscursos(house, id) {
  if (house === "camara") {
    const data = await fetchCamara(`/deputados/${id}/discursos`, { itens: 5 });
    return data.dados;
  } else {
    const url = `${API_SENADO}/senador/${id}/discursos.json?dataInicio=2025-01-01`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Erro API Senado Discursos");
    
    const data = await response.json();
    const prons = data.DiscursosParlamentar?.Parlamentar?.Pronunciamentos?.Pronunciamento;
    
    let list = [];
    if (prons) {
      list = Array.isArray(prons) ? prons : [prons];
    }
    
    return list.slice(0, 5).map(p => ({
      dataHoraInicio: p.DataPronunciamento,
      tipoDiscurso: p.TipoUsoPalavra?.Descricao || "Plenário",
      sumario: p.TextoResumo || p.Indexacao || "Sem transcrição disponível."
    }));
  }
}

/**
 * Busca Proposições (Câmara)
 */
export async function fetchProposicoes(filters) {
  const data = await fetchCamara("/proposicoes", { ...filters, itens: 15 });
  return data.dados;
}
