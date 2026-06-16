// Web Client Application for Gastos Parlamentares

// Global state
let currentTab = "dashboard";
let currentModalTab = "expenses-list";
let activeDeputyId = null;
let chartInstance = null;

const STATES = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", 
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"
];

const PARTIES = [
  "AVANTE", "CIDADANIA", "MDB", "NOVO", "PATRIOTA", "PCdoB", "PDT", "PL", "PODE", 
  "PP", "PRD", "PSB", "PSD", "PSDB", "PSOL", "PV", "REDE", "REPUBLICANOS", "SOLIDARIEDADE", "UNIÃO"
];

// Featured deputies to display on dashboard
const FEATURED_DEPUTIES = [
  { id: 160976, nome: "Tiririca", partido: "PSD", uf: "SP", foto: "https://www.camara.leg.br/internet/deputado/bandep/160976.jpg" },
  { id: 220645, nome: "Erika Hilton", partido: "PSOL", uf: "SP", foto: "https://www.camara.leg.br/internet/deputado/bandep/220645.jpg" },
  { id: 204534, nome: "Tabata Amaral", partido: "PSB", uf: "SP", foto: "https://www.camara.leg.br/internet/deputado/bandep/204534.jpg" },
  { id: 220639, nome: "Guilherme Boulos", partido: "PSOL", uf: "SP", foto: "https://www.camara.leg.br/internet/deputado/bandep/220639.jpg" }
];

// Initialize application on DOM content loaded
document.addEventListener("DOMContentLoaded", () => {
  setupSidebarNavigation();
  populateFilterDropdowns();
  renderFeaturedDeputies();
  setupSearchForms();
  
  // Load initial list of deputies (all)
  loadDeputiesList();
});

// 1. Sidebar Navigation
function setupSidebarNavigation() {
  const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const tabId = item.getAttribute("data-tab");
      switchTab(tabId);
    });
  });
}

function switchTab(tabId) {
  currentTab = tabId;
  
  // Update sidebar active link
  const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
  navItems.forEach(item => {
    if (item.getAttribute("data-tab") === tabId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Update visible tab content
  const tabs = document.querySelectorAll(".tab-content");
  tabs.forEach(tab => {
    if (tab.id === `tab-${tabId}`) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  // Update Page Title
  const titleMap = {
    dashboard: { title: "Dashboard Geral", subtitle: "Visão geral do controle social dos gastos parlamentares" },
    deputados: { title: "Deputados Federais", subtitle: "Busque e analise gastos de parlamentares individualmente" },
    proposicoes: { title: "Proposições Legislativas", subtitle: "Consulte projetos de lei e emendas constitucionais" },
    sobre: { title: "Sobre a Cota (CEAP)", subtitle: "Entenda o que é a Cota para Exercício da Atividade Parlamentar" }
  };

  if (titleMap[tabId]) {
    document.getElementById("page-title").textContent = titleMap[tabId].title;
    document.getElementById("page-subtitle").textContent = titleMap[tabId].subtitle;
  }
}

// 2. Populate Dropdowns
function populateFilterDropdowns() {
  const ufSelect = document.getElementById("search-uf");
  STATES.forEach(uf => {
    const opt = document.createElement("option");
    opt.value = uf;
    opt.textContent = uf;
    ufSelect.appendChild(opt);
  });

  const partidoSelect = document.getElementById("search-partido");
  PARTIES.forEach(partido => {
    const opt = document.createElement("option");
    opt.value = partido;
    opt.textContent = partido;
    partidoSelect.appendChild(opt);
  });
}

// 3. Render Featured
function renderFeaturedDeputies() {
  const listElement = document.getElementById("featured-deputies-list");
  listElement.innerHTML = "";

  FEATURED_DEPUTIES.forEach(dep => {
    const card = createDeputyCard(dep.id, dep.nome, dep.partido, dep.uf, dep.foto, "");
    listElement.appendChild(card);
  });
}

// Helper to create deputy card element
function createDeputyCard(id, nome, partido, uf, fotoUrl, email) {
  const card = document.createElement("div");
  card.className = "deputy-card";
  card.innerHTML = `
    <div class="deputy-photo-wrapper">
      <img src="${fotoUrl || 'https://via.placeholder.com/150'}" alt="${nome}">
      <span class="deputy-party-badge">${partido}</span>
    </div>
    <div class="deputy-info">
      <h3>${nome}</h3>
      <p class="party-uf">${partido} - ${uf}</p>
      <p class="email">${email || ''}</p>
    </div>
  `;
  card.addEventListener("click", () => openDeputyModal(id));
  return card;
}

// 4. Setup search forms
function setupSearchForms() {
  // Deputies Search
  const searchForm = document.getElementById("deputados-search-form");
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    loadDeputiesList();
  });

  // Propositions Search
  const propForm = document.getElementById("proposicoes-search-form");
  propForm.addEventListener("submit", (e) => {
    e.preventDefault();
    loadPropositionsList();
  });
}

// 5. Fetch and Render Deputies List
async function loadDeputiesList() {
  const listElement = document.getElementById("deputados-list");
  listElement.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;
  document.getElementById("results-count").textContent = "Buscando parlamentares...";

  const nome = document.getElementById("search-nome").value;
  const uf = document.getElementById("search-uf").value;
  const partido = document.getElementById("search-partido").value;

  const params = new URLSearchParams();
  if (nome) params.append("nome", nome);
  if (uf) params.append("siglaUf", uf);
  if (partido) params.append("siglaPartido", partido);
  params.append("itens", "24"); // Limit to 24 per page for layout

  try {
    const res = await fetch(`/api/deputados?${params.toString()}`);
    const data = await res.json();
    const list = data.dados || [];

    listElement.innerHTML = "";
    document.getElementById("results-count").textContent = `Encontrado(s) ${list.length} deputado(s)`;

    if (list.length === 0) {
      listElement.innerHTML = `<p class="no-results" style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Nenhum deputado encontrado com os filtros selecionados.</p>`;
      return;
    }

    list.forEach(dep => {
      const card = createDeputyCard(dep.id, dep.nome, dep.siglaPartido, dep.siglaUf, dep.urlFoto, dep.email);
      listElement.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading deputies:", error);
    listElement.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: red;">Erro ao carregar deputados.</p>`;
  }
}

// 6. Fetch and Render Propositions List
async function loadPropositionsList() {
  const listElement = document.getElementById("proposicoes-list");
  listElement.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;
  
  const siglaTipo = document.getElementById("prop-tipo").value;
  const ano = document.getElementById("prop-ano").value;
  const numero = document.getElementById("prop-numero").value;

  const params = new URLSearchParams();
  if (siglaTipo) params.append("siglaTipo", siglaTipo);
  if (ano) params.append("ano", ano);
  if (numero) params.append("numero", numero);
  params.append("itens", "15");

  try {
    const res = await fetch(`/api/proposicoes?${params.toString()}`);
    const data = await res.json();
    const list = data.dados || [];

    listElement.innerHTML = "";
    document.getElementById("prop-results-count").textContent = `Retornados ${list.length} item(ns)`;

    if (list.length === 0) {
      listElement.innerHTML = `<p style="text-align: center; color: var(--text-secondary); padding: 30px;">Nenhuma proposição legislativa encontrada.</p>`;
      return;
    }

    list.forEach(item => {
      const propDiv = document.createElement("div");
      propDiv.className = "proposition-item card glass-card";
      propDiv.innerHTML = `
        <div class="proposition-header">
          <h3>${item.siglaTipo} ${item.numero}/${item.ano}</h3>
          <span>ID: ${item.id}</span>
        </div>
        <div class="proposition-body">
          <p>${item.ementa || 'Sem ementa registrada.'}</p>
        </div>
      `;
      listElement.appendChild(propDiv);
    });
  } catch (error) {
    console.error("Error loading propositions:", error);
    listElement.innerHTML = `<p style="text-align: center; color: red;">Erro ao buscar proposições.</p>`;
  }
}

// 7. Modal Functionality
async function openDeputyModal(id) {
  activeDeputyId = id;
  const modal = document.getElementById("deputy-modal");
  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("active"), 10);

  // Set loading placeholder state
  document.getElementById("modal-deputy-name").textContent = "Carregando...";
  document.getElementById("modal-deputy-party").textContent = "-";
  document.getElementById("modal-deputy-uf").textContent = "-";
  document.getElementById("modal-deputy-photo").src = "https://via.placeholder.com/150";
  document.getElementById("detail-civil-name").textContent = "Carregando...";
  document.getElementById("detail-email").textContent = "Carregando...";
  document.getElementById("detail-birth-date").textContent = "Carregando...";
  document.getElementById("detail-birth-place").textContent = "Carregando...";
  document.getElementById("detail-gabinete").textContent = "Carregando...";
  document.getElementById("modal-expenses-rows").innerHTML = `<tr><td colspan="4" style="text-align: center;"><div class="spinner"></div></td></tr>`;
  document.getElementById("modal-speeches-list").innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;
  document.getElementById("modal-total-spent").textContent = "R$ 0,00";

  switchModalTab("expenses-list");

  try {
    // Fetch Deputy Profile Details
    const res = await fetch(`/api/deputados/${id}`);
    const profileData = await res.json();
    const dep = profileData.dados || {};
    
    // Fill basic details
    document.getElementById("modal-deputy-name").textContent = dep.nomeCivil || dep.ultimoStatus.nome;
    document.getElementById("modal-deputy-party").textContent = dep.ultimoStatus.siglaPartido;
    document.getElementById("modal-deputy-uf").textContent = dep.ultimoStatus.siglaUf;
    document.getElementById("modal-deputy-photo").src = dep.ultimoStatus.urlFoto;
    
    document.getElementById("detail-civil-name").textContent = dep.nomeCivil || "-";
    document.getElementById("detail-email").textContent = dep.ultimoStatus.email || "-";
    document.getElementById("detail-birth-date").textContent = formatDate(dep.dataNascimento) || "-";
    document.getElementById("detail-birth-place").textContent = `${dep.municipioNascimento || ''} - ${dep.ufNascimento || ''}`;
    
    const gab = dep.ultimoStatus.gabinete;
    document.getElementById("detail-gabinete").textContent = gab ? `Sala ${gab.sala || ''}, Prédio ${gab.predio || ''}, Tel: ${gab.telefone || ''}` : "-";

    // Load expenses & speeches
    await loadDeputyExpenses();
    await loadDeputySpeeches();
  } catch (error) {
    console.error("Error loading deputy modal details:", error);
  }
}

function closeModal() {
  const modal = document.getElementById("deputy-modal");
  modal.classList.remove("active");
  setTimeout(() => {
    modal.style.display = "none";
    activeDeputyId = null;
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  }, 300);
}

function switchModalTab(tabId) {
  currentModalTab = tabId;
  const buttons = document.querySelectorAll(".modal-tab-btn");
  buttons.forEach(btn => {
    if (btn.outerHTML.includes(tabId)) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  const tabContents = document.querySelectorAll(".modal-tab-content");
  tabContents.forEach(content => {
    if (content.id === `modal-tab-${tabId}`) {
      content.classList.add("active");
    } else {
      content.classList.remove("active");
    }
  });
}

// 8. Fetch Expenses & Render Chart/Table
async function loadDeputyExpenses() {
  if (!activeDeputyId) return;

  const rowsElement = document.getElementById("modal-expenses-rows");
  rowsElement.innerHTML = `<tr><td colspan="4" style="text-align: center;"><div class="spinner" style="margin: 20px auto;"></div></td></tr>`;

  const year = document.getElementById("modal-expense-year").value;
  const month = document.getElementById("modal-expense-month").value;

  const params = new URLSearchParams();
  if (year) params.append("ano", year);
  if (month) params.append("mes", month);
  params.append("itens", "100"); // fetch up to 100 to draw a nice chart

  try {
    const res = await fetch(`/api/deputados/${activeDeputyId}/despesas?${params.toString()}`);
    const data = await res.json();
    const expenses = data.dados || [];

    rowsElement.innerHTML = "";

    if (expenses.length === 0) {
      rowsElement.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary); padding: 30px;">Nenhuma despesa declarada para este período.</td></tr>`;
      document.getElementById("modal-total-spent").textContent = "R$ 0,00";
      if (chartInstance) chartInstance.destroy();
      return;
    }

    let totalVal = 0;
    const categoryTotals = {};

    expenses.forEach(exp => {
      const row = document.createElement("tr");
      const cleanVal = exp.valorLiquido || exp.valorDocumento || 0;
      totalVal += cleanVal;

      // Group for chart
      const cat = exp.tipoDespesa;
      categoryTotals[cat] = (categoryTotals[cat] || 0) + cleanVal;

      row.innerHTML = `
        <td>
          <strong>${exp.nomeFornecedor}</strong>
          <br><small style="color: var(--text-muted);">${formatCnpjCpf(exp.cnpjCpfFornecedor)}</small>
        </td>
        <td>
          <span style="font-size: 0.8rem; color: var(--text-secondary);">${exp.tipoDespesa}</span>
          ${exp.urlDocumento ? `<br><a href="${exp.urlDocumento}" target="_blank" style="font-size:0.75rem; color:var(--accent-blue); text-decoration:none;"><i class="fa-solid fa-file-pdf"></i> Ver NF</a>` : ''}
        </td>
        <td>${formatDate(exp.dataDocumento || `${exp.ano}-${String(exp.mes).padStart(2,'0')}-01`)}</td>
        <td class="text-right text-emerald" style="font-weight:600;">R$ ${cleanVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      `;
      rowsElement.appendChild(row);
    });

    document.getElementById("modal-total-spent").textContent = `R$ ${totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    // Draw chart
    renderExpensesChart(categoryTotals);

  } catch (error) {
    console.error("Error loading deputy expenses:", error);
    rowsElement.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">Erro ao carregar despesas.</td></tr>`;
  }
}

// Helper to draw Chart.js
function renderExpensesChart(totals) {
  const ctx = document.getElementById("expenses-chart").getContext("2d");
  
  if (chartInstance) {
    chartInstance.destroy();
  }

  const sortedCategories = Object.entries(totals).sort((a,b) => b[1] - a[1]);
  const labels = sortedCategories.map(c => c[0].length > 28 ? c[0].slice(0, 25) + '...' : c[0]);
  const values = sortedCategories.map(c => c[1]);

  // Premium color palette for Chart
  const backgroundColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', 
    '#ef4444', '#06b6d4', '#14b8a6', '#f43f5e', '#a855f7'
  ];

  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.slice(0, 5), // top 5
      datasets: [{
        data: values.slice(0, 5),
        backgroundColor: backgroundColors.slice(0, 5),
        borderWidth: 1,
        borderColor: '#121824'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: '#9ca3af',
            boxWidth: 10,
            font: {
              family: 'Outfit',
              size: 10
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.parsed;
              return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            }
          }
        }
      },
      cutout: '65%'
    }
  });
}

// 9. Fetch and Render Speeches
async function loadDeputySpeeches() {
  if (!activeDeputyId) return;

  const speechesElement = document.getElementById("modal-speeches-list");
  speechesElement.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;

  try {
    const res = await fetch(`/api/deputados/${activeDeputyId}/discursos?itens=5`);
    const data = await res.json();
    const speeches = data.dados || [];

    speechesElement.innerHTML = "";

    if (speeches.length === 0) {
      speechesElement.innerHTML = `<p style="text-align: center; color: var(--text-secondary); padding: 30px;">Nenhum discurso parlamentar recente registrado.</p>`;
      return;
    }

    speeches.forEach(sp => {
      const speechDiv = document.createElement("div");
      speechDiv.className = "speech-card";
      
      const cleanSummary = sp.sumario || sp.ementa || 'Sem transcrição disponível.';
      
      speechDiv.innerHTML = `
        <header>
          <span><i class="fa-solid fa-calendar-days"></i> ${formatDate(sp.dataHoraInicio)}</span>
          <span>Tipo: ${sp.tipoDiscurso || 'Plenário'}</span>
        </header>
        <p>${cleanSummary}</p>
      `;
      speechesElement.appendChild(speechDiv);
    });
  } catch (error) {
    console.error("Error loading deputy speeches:", error);
    speechesElement.innerHTML = `<p style="text-align: center; color: red;">Erro ao carregar discursos.</p>`;
  }
}

// General helpers
function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch (e) {
    return dateStr;
  }
}

function formatCnpjCpf(str) {
  if (!str) return "-";
  // Remove non digits
  const clean = str.replace(/\D/g, "");
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  } else if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return str;
}
