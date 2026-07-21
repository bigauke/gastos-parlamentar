// main.js - Ponto de Entrada da Aplicação (App Controller)

import { 
  fetchParlamentares, 
  fetchParlamentarDetalhes, 
  fetchDespesas, 
  fetchDiscursos, 
  fetchProposicoes 
} from './api.js';

import { 
  setupThemeToggle, 
  switchTab, 
  switchModalTab, 
  formatDate, 
  formatCnpjCpf, 
  createParlamentarCard 
} from './ui.js';

import { initFeaturedCarousel } from './carousel.js';
import { renderExpensesChart, updateChartTheme, destroyChart } from './chart.js';

// Estado Global
let activeHouse = "camara"; 
let activeDeputyId = null;

const STATES = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", 
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"
];

const PARTIES = [
  "AVANTE", "CIDADANIA", "MDB", "NOVO", "PATRIOTA", "PCdoB", "PDT", "PL", "PODE", 
  "PP", "PRD", "PSB", "PSD", "PSDB", "PSOL", "PV", "REDE", "REPUBLICANOS", "SOLIDARIEDADE", "UNIÃO"
];

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

document.addEventListener("DOMContentLoaded", () => {
  setupSidebarNavigation();
  populateFilterDropdowns();
  setupSearchForms();
  setupModalEvents();
  
  setupThemeToggle((newTheme) => {
    updateChartTheme(newTheme);
  });

  // Inicializa Carrossel e expõe o click do modal
  initFeaturedCarousel(FEATURED_PARLAMENTARES, "featured-carousel-track", openParlamentarModal);
  
  loadParlamentaresList();
});

function setupSidebarNavigation() {
  const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      switchTab(item.getAttribute("data-tab"));
    });
  });
  
  // Expose globais necessárias no HTML inline events
  window.switchTab = switchTab;
  window.changeHouse = changeHouse;
  window.closeModal = closeModal;
  window.switchModalTab = switchModalTab;
}

function setupSearchForms() {
  document.getElementById("parlamentares-search-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    loadParlamentaresList();
  });

  document.getElementById("proposicoes-search-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    loadPropositionsList();
  });
}

function setupModalEvents() {
  document.getElementById("modal-expense-year")?.addEventListener("change", loadParlamentarExpenses);
  document.getElementById("modal-expense-month")?.addEventListener("change", loadParlamentarExpenses);
}

function populateFilterDropdowns() {
  const ufSelect = document.getElementById("search-uf");
  if (ufSelect) {
    STATES.forEach(uf => {
      const opt = document.createElement("option");
      opt.value = uf;
      opt.textContent = uf;
      ufSelect.appendChild(opt);
    });
  }

  const partidoSelect = document.getElementById("search-partido");
  if (partidoSelect) {
    PARTIES.forEach(partido => {
      const opt = document.createElement("option");
      opt.value = partido;
      opt.textContent = partido;
      partidoSelect.appendChild(opt);
    });
  }
}

function changeHouse(house) {
  activeHouse = house;
  document.getElementById("toggle-camara").classList.toggle("active", house === "camara");
  document.getElementById("toggle-senado").classList.toggle("active", house === "senado");
  loadParlamentaresList();
}

async function loadParlamentaresList() {
  const listElement = document.getElementById("parlamentares-list");
  if (!listElement) return;
  
  listElement.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;
  document.getElementById("results-count").textContent = "Buscando parlamentares...";

  const filters = {
    nome: document.getElementById("search-nome").value,
    siglaUf: document.getElementById("search-uf").value,
    siglaPartido: document.getElementById("search-partido").value,
    itens: 24
  };

  try {
    const list = await fetchParlamentares(activeHouse, filters);
    listElement.innerHTML = "";
    
    const label = activeHouse === "senado" ? "senador(es)" : "deputado(s)";
    document.getElementById("results-count").textContent = `Encontrado(s) ${list.length} ${label}`;

    if (list.length === 0) {
      listElement.innerHTML = `<p class="no-results" style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Nenhum parlamentar encontrado com os filtros selecionados.</p>`;
      return;
    }

    list.forEach(p => {
      const card = createParlamentarCard(p, openParlamentarModal);
      listElement.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    listElement.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: red;">Erro ao carregar parlamentares.</p>`;
  }
}

async function loadPropositionsList() {
  const listElement = document.getElementById("proposicoes-list");
  if (!listElement) return;

  listElement.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;
  
  const filters = {
    siglaTipo: document.getElementById("prop-tipo").value,
    ano: document.getElementById("prop-ano").value,
    numero: document.getElementById("prop-numero").value
  };

  try {
    const list = await fetchProposicoes(filters);
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
    console.error(error);
    listElement.innerHTML = `<p style="text-align: center; color: red;">Erro ao buscar proposições.</p>`;
  }
}

async function openParlamentarModal(id, house) {
  activeDeputyId = id;
  activeHouse = house;
  const modal = document.getElementById("deputy-modal");
  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("active"), 10);

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
    const dep = await fetchParlamentarDetalhes(house, id);
    
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

    await loadParlamentarExpenses();
    await loadParlamentarSpeeches();
  } catch (error) {
    console.error(error);
  }
}

function closeModal() {
  const modal = document.getElementById("deputy-modal");
  modal.classList.remove("active");
  setTimeout(() => {
    modal.style.display = "none";
    activeDeputyId = null;
    destroyChart();
  }, 300);
}

async function loadParlamentarExpenses() {
  if (!activeDeputyId) return;

  const rowsElement = document.getElementById("modal-expenses-rows");
  rowsElement.innerHTML = `<tr><td colspan="4" style="text-align: center;"><div class="spinner" style="margin: 20px auto;"></div></td></tr>`;

  const year = document.getElementById("modal-expense-year").value;
  const month = document.getElementById("modal-expense-month").value;

  const chartYearSpan = document.getElementById("modal-chart-year");
  const totalYearSpan = document.getElementById("modal-total-year");
  if (chartYearSpan) chartYearSpan.textContent = year;
  if (totalYearSpan) totalYearSpan.textContent = year;

  try {
    const expenses = await fetchDespesas(activeHouse, activeDeputyId, year, month);
    rowsElement.innerHTML = "";

    if (expenses.length === 0) {
      rowsElement.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary); padding: 30px;">Nenhuma despesa declarada para este período.</td></tr>`;
      document.getElementById("modal-total-spent").textContent = "R$ 0,00";
      destroyChart();
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
    console.error(error);
    rowsElement.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">Erro ao carregar despesas.</td></tr>`;
  }
}

async function loadParlamentarSpeeches() {
  if (!activeDeputyId) return;

  const speechesElement = document.getElementById("modal-speeches-list");
  speechesElement.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;

  try {
    const speeches = await fetchDiscursos(activeHouse, activeDeputyId);
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
    console.error(error);
    speechesElement.innerHTML = `<p style="text-align: center; color: red;">Erro ao carregar discursos.</p>`;
  }
}
