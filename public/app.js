// Web Client Application for Gastos Parlamentares (Câmara & Senado)

// Global state
let currentTab = "dashboard";
let currentModalTab = "expenses-list";
let activeDeputyId = null; // Reused for both deputy and senator ID
let activeHouse = "camara"; // 'camara' or 'senado'
let chartInstance = null;
let carouselIndex = 0;
let autoplayTimer = null;

const STATES = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", 
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"
];

const PARTIES = [
  "AVANTE", "CIDADANIA", "MDB", "NOVO", "PATRIOTA", "PCdoB", "PDT", "PL", "PODE", 
  "PP", "PRD", "PSB", "PSD", "PSDB", "PSOL", "PV", "REDE", "REPUBLICANOS", "SOLIDARIEDADE", "UNIÃO"
];

// Featured senators & deputies to display on dashboard carousel (with correct Senate IDs and Photos)
const FEATURED_PARLAMENTARES = [
  { id: 160976, nome: "Tiririca", partido: "PL", uf: "SP", foto: "https://www.camara.leg.br/internet/deputado/bandep/160976.jpg", tipo: "camara" },
  { id: 220645, nome: "Erika Hilton", partido: "PSOL", uf: "SP", foto: "https://www.camara.leg.br/internet/deputado/bandep/220645.jpg", tipo: "camara" },
  { id: 209787, nome: "Nikolas Ferreira", partido: "PL", uf: "MG", foto: "https://www.camara.leg.br/internet/deputado/bandep/209787.jpg", tipo: "camara" },
  { id: 204534, nome: "Tabata Amaral", partido: "PSB", uf: "SP", foto: "https://www.camara.leg.br/internet/deputado/bandep/204534.jpg", tipo: "camara" },
  { id: 5732, nome: "Rodrigo Pacheco", partido: "PSB", uf: "MG", foto: "https://www.senado.leg.br/senadores/img/fotos-oficiais/senador5732.jpg", tipo: "senado" },
  { id: 5012, nome: "Randolfe Rodrigues", partido: "PT", uf: "AP", foto: "https://www.senado.leg.br/senadores/img/fotos-oficiais/senador5012.jpg", tipo: "senado" },
  { id: 6341, nome: "Hamilton Mourão", partido: "REPUBLICANOS", uf: "RS", foto: "https://www.senado.leg.br/senadores/img/fotos-oficiais/senador6341.jpg", tipo: "senado" },
  { id: 5988, nome: "Soraya Thronicke", partido: "PSB", uf: "MS", foto: "https://www.senado.leg.br/senadores/img/fotos-oficiais/senador5988.jpg", tipo: "senado" }
];

// Initialize application on DOM content loaded
document.addEventListener("DOMContentLoaded", () => {
  setupSidebarNavigation();
  populateFilterDropdowns();
  renderFeaturedParlamentares();
  setupSearchForms();
  
  // Load initial list of parlamentares (all)
  loadParlamentaresList();
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
    parlamentares: { title: "Parlamentares Federais", subtitle: "Busque e analise gastos de deputados e senadores individualmente" },
    proposicoes: { title: "Proposições Legislativas", subtitle: "Consulte projetos de lei e emendas constitucionais na Câmara" },
    sobre: { title: "Sobre as Cotas (CEAP/CEAPS)", subtitle: "Entenda o que é a Cota para Exercício da Atividade Parlamentar" }
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

// 3. Render Featured (Carousel)
function renderFeaturedParlamentares() {
  const listElement = document.getElementById("featured-carousel-track");
  if (!listElement) return;
  listElement.innerHTML = "";

  FEATURED_PARLAMENTARES.forEach(p => {
    const card = createParlamentarCard(p.id, p.nome, p.partido, p.uf, p.foto, "", p.tipo);
    listElement.appendChild(card);
  });

  // Init Carousel functionalities
  initCarousel();
}

function initCarousel() {
  const track = document.getElementById("featured-carousel-track");
  const prevBtn = document.getElementById("carousel-prev");
  const nextBtn = document.getElementById("carousel-next");
  const indicatorsContainer = document.getElementById("carousel-indicators");

  if (!track || !prevBtn || !nextBtn || !indicatorsContainer) return;

  carouselIndex = 0; // reset index

  // Render indicators
  renderCarouselIndicators();

  // Remove existing listeners if any by cloning nodes or just clean setup
  // Since we run this once on DOMContentLoaded, a clean listener addition is safe.
  const newPrevBtn = prevBtn.cloneNode(true);
  const newNextBtn = nextBtn.cloneNode(true);
  prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
  nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);

  newPrevBtn.addEventListener("click", () => {
    slideCarousel("prev");
    resetAutoplay();
  });

  newNextBtn.addEventListener("click", () => {
    slideCarousel("next");
    resetAutoplay();
  });

  // Handle window resize
  window.addEventListener("resize", () => {
    updateCarouselPosition();
    renderCarouselIndicators();
  });

  // Autoplay
  startAutoplay();

  // Pause autoplay on hover
  const container = document.querySelector(".carousel-container");
  if (container) {
    container.onmouseenter = stopAutoplay;
    container.onmouseleave = startAutoplay;
  }

  // Set initial position
  updateCarouselPosition();
}

function getCardsPerPage() {
  if (window.innerWidth > 1024) return 4;
  if (window.innerWidth > 640) return 2;
  return 1;
}

function renderCarouselIndicators() {
  const indicatorsContainer = document.getElementById("carousel-indicators");
  if (!indicatorsContainer) return;
  indicatorsContainer.innerHTML = "";

  const cardsPerPage = getCardsPerPage();
  const totalSteps = Math.max(1, FEATURED_PARLAMENTARES.length - cardsPerPage + 1);

  const prevBtn = document.getElementById("carousel-prev");
  const nextBtn = document.getElementById("carousel-next");

  if (totalSteps <= 1) {
    if (prevBtn) prevBtn.style.display = "none";
    if (nextBtn) nextBtn.style.display = "none";
    indicatorsContainer.style.display = "none";
    return;
  } else {
    if (prevBtn) prevBtn.style.display = "flex";
    if (nextBtn) nextBtn.style.display = "flex";
    indicatorsContainer.style.display = "flex";
  }

  for (let i = 0; i < totalSteps; i++) {
    const dot = document.createElement("div");
    dot.className = `carousel-indicator ${i === carouselIndex ? "active" : ""}`;
    dot.addEventListener("click", () => {
      carouselIndex = i;
      updateCarouselPosition();
      resetAutoplay();
    });
    indicatorsContainer.appendChild(dot);
  }
}

function slideCarousel(direction) {
  const cardsPerPage = getCardsPerPage();
  const maxIndex = Math.max(0, FEATURED_PARLAMENTARES.length - cardsPerPage);

  if (direction === "next") {
    if (carouselIndex < maxIndex) {
      carouselIndex++;
    } else {
      carouselIndex = 0; // Wrap around
    }
  } else if (direction === "prev") {
    if (carouselIndex > 0) {
      carouselIndex--;
    } else {
      carouselIndex = maxIndex; // Wrap around
    }
  }

  updateCarouselPosition();
}

function updateCarouselPosition() {
  const track = document.getElementById("featured-carousel-track");
  if (!track) return;

  const cardsPerPage = getCardsPerPage();
  const maxIndex = Math.max(0, FEATURED_PARLAMENTARES.length - cardsPerPage);

  if (carouselIndex > maxIndex) {
    carouselIndex = maxIndex;
  }

  const cards = track.querySelectorAll(".deputy-card");
  if (cards.length === 0) return;

  const firstCard = cards[0];
  const cardWidth = firstCard.offsetWidth;
  const gap = 24; // matches standard gap in CSS

  const translation = carouselIndex * (cardWidth + gap);
  track.style.transform = `translateX(-${translation}px)`;

  // Update active indicators
  const dots = document.querySelectorAll(".carousel-indicator");
  dots.forEach((dot, idx) => {
    dot.classList.toggle("active", idx === carouselIndex);
  });
}

function startAutoplay() {
  stopAutoplay();
  autoplayTimer = setInterval(() => {
    slideCarousel("next");
  }, 4000);
}

function stopAutoplay() {
  if (autoplayTimer) {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }
}

function resetAutoplay() {
  stopAutoplay();
  startAutoplay();
}

// Helper to create card element
function createParlamentarCard(id, nome, partido, uf, fotoUrl, email, house) {
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
  card.addEventListener("click", () => openParlamentarModal(id, house));
  return card;
}

// 4. Setup search forms
function setupSearchForms() {
  // Parlamentares Search
  const searchForm = document.getElementById("parlamentares-search-form");
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    loadParlamentaresList();
  });

  // Propositions Search
  const propForm = document.getElementById("proposicoes-search-form");
  propForm.addEventListener("submit", (e) => {
    e.preventDefault();
    loadPropositionsList();
  });
}

// 5. Fetch and Render Parlamentares List
async function loadParlamentaresList() {
  const listElement = document.getElementById("parlamentares-list");
  listElement.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;
  document.getElementById("results-count").textContent = "Buscando parlamentares...";

  const nome = document.getElementById("search-nome").value;
  const uf = document.getElementById("search-uf").value;
  const partido = document.getElementById("search-partido").value;

  const params = new URLSearchParams();
  if (nome) params.append("nome", nome);
  if (uf) params.append("siglaUf", uf);
  if (partido) params.append("siglaPartido", partido);
  params.append("itens", "24");

  const endpoint = activeHouse === "senado" ? "/api/senadores" : "/api/deputados";

  try {
    const res = await fetch(`${endpoint}?${params.toString()}`);
    const data = await res.json();
    const list = data.dados || [];

    listElement.innerHTML = "";
    const label = activeHouse === "senado" ? "senador(es)" : "deputado(s)";
    document.getElementById("results-count").textContent = `Encontrado(s) ${list.length} ${label}`;

    if (list.length === 0) {
      listElement.innerHTML = `<p class="no-results" style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Nenhum parlamentar encontrado com os filtros selecionados.</p>`;
      return;
    }

    list.forEach(p => {
      const card = createParlamentarCard(p.id, p.nome, p.siglaPartido, p.siglaUf, p.urlFoto, p.email, activeHouse);
      listElement.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading parlamentares:", error);
    listElement.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: red;">Erro ao carregar parlamentares.</p>`;
  }
}

// Switch between Câmara and Senado
function changeHouse(house) {
  activeHouse = house;
  
  // Toggle button classes
  document.getElementById("toggle-camara").classList.toggle("active", house === "camara");
  document.getElementById("toggle-senado").classList.toggle("active", house === "senado");
  
  // Reload list
  loadParlamentaresList();
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
async function openParlamentarModal(id, house) {
  activeDeputyId = id;
  activeHouse = house;
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
    // Fetch Profile Details
    const endpoint = house === "senado" ? `/api/senadores/${id}` : `/api/deputados/${id}`;
    const res = await fetch(endpoint);
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
    if (house === "senado") {
      document.getElementById("detail-gabinete").textContent = gab ? `${gab.predio || 'Senado Federal'}, Tel: ${gab.telefone || ''}` : "-";
    } else {
      document.getElementById("detail-gabinete").textContent = gab ? `Sala ${gab.sala || ''}, Prédio ${gab.predio || ''}, Tel: ${gab.telefone || ''}` : "-";
    }

    // Load expenses & speeches
    await loadParlamentarExpenses();
    await loadParlamentarSpeeches();
  } catch (error) {
    console.error("Error loading modal details:", error);
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
async function loadParlamentarExpenses() {
  if (!activeDeputyId) return;

  const rowsElement = document.getElementById("modal-expenses-rows");
  rowsElement.innerHTML = `<tr><td colspan="4" style="text-align: center;"><div class="spinner" style="margin: 20px auto;"></div></td></tr>`;

  const year = document.getElementById("modal-expense-year").value;
  const month = document.getElementById("modal-expense-month").value;

  // Update year text dynamically in modal headers
  const chartYearSpan = document.getElementById("modal-chart-year");
  const totalYearSpan = document.getElementById("modal-total-year");
  if (chartYearSpan) chartYearSpan.textContent = year;
  if (totalYearSpan) totalYearSpan.textContent = year;

  const params = new URLSearchParams();
  if (year) params.append("ano", year);
  if (month) params.append("mes", month);
  params.append("itens", "100");

  try {
    const endpoint = activeHouse === "senado" ? `/api/senadores/${activeDeputyId}/despesas` : `/api/deputados/${activeDeputyId}/despesas`;
    const res = await fetch(`${endpoint}?${params.toString()}`);
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
        <td>${formatDate(exp.dataDocumento)}</td>
        <td class="text-right text-emerald" style="font-weight:600;">R$ ${cleanVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      `;
      rowsElement.appendChild(row);
    });

    document.getElementById("modal-total-spent").textContent = `R$ ${totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    renderExpensesChart(categoryTotals);
  } catch (error) {
    console.error("Error loading expenses:", error);
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
  // Increase label characters limit to 38 for better visibility
  const labels = sortedCategories.map(c => c[0].length > 38 ? c[0].slice(0, 35) + '...' : c[0]);
  const values = sortedCategories.map(c => c[1]);

  const backgroundColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', 
    '#ef4444', '#06b6d4', '#14b8a6', '#f43f5e', '#a855f7'
  ];

  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.slice(0, 5),
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
          // Position legend on the right side on desktop to maximize visibility and prevent clipping
          position: window.innerWidth > 640 ? 'right' : 'bottom',
          labels: {
            color: '#9ca3af',
            boxWidth: 8,
            padding: 12,
            font: {
              family: 'Outfit',
              size: 10
            }
          }
        },
        tooltip: {
          callbacks: {
            // Show full, untruncated category name in the tooltip title
            title: function(context) {
              const index = context[0].dataIndex;
              return sortedCategories[index] ? sortedCategories[index][0] : '';
            },
            label: function(context) {
              const val = context.parsed;
              return ` R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            }
          }
        }
      },
      cutout: '65%'
    }
  });
}

// 9. Fetch and Render Speeches
async function loadParlamentarSpeeches() {
  if (!activeDeputyId) return;

  const speechesElement = document.getElementById("modal-speeches-list");
  speechesElement.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;

  try {
    const endpoint = activeHouse === "senado" ? `/api/senadores/${activeDeputyId}/discursos` : `/api/deputados/${activeDeputyId}/discursos`;
    const res = await fetch(`${endpoint}?itens=5`);
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
      
      const cleanSummary = sp.sumario || "Sem transcrição disponível.";
      
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
    console.error("Error loading speeches:", error);
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
  const clean = str.replace(/\D/g, "");
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  } else if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return str;
}
