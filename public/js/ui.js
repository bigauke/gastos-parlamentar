// ui.js - Utilitários de Interface de Usuário

export function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    // Fix timezone issues returning previous day by using slice
    if (dateStr.length === 10) {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch (e) {
    return dateStr;
  }
}

export function formatCnpjCpf(str) {
  if (!str) return "-";
  const clean = str.replace(/\D/g, "");
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  } else if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return str;
}

export function setupThemeToggle(onThemeChange) {
  const toggleBtn = document.getElementById("theme-toggle");
  if (!toggleBtn) return;
  
  toggleBtn.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    
    if (onThemeChange) onThemeChange(newTheme);
  });
}

export function switchTab(tabId) {
  const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
  navItems.forEach(item => {
    item.classList.toggle("active", item.getAttribute("data-tab") === tabId);
  });

  const tabs = document.querySelectorAll(".tab-content");
  tabs.forEach(tab => {
    tab.classList.toggle("active", tab.id === `tab-${tabId}`);
  });

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

export function createParlamentarCard(p, onClick) {
  const card = document.createElement("div");
  card.className = "deputy-card";
  
  const fotoUrl = p.urlFoto || p.foto || 'https://via.placeholder.com/150';
  const partido = p.siglaPartido || p.partido || '';
  const uf = p.siglaUf || p.uf || '';
  const email = p.email || '';
  
  card.innerHTML = `
    <div class="deputy-photo-wrapper">
      <img src="${fotoUrl}" alt="${p.nome}" loading="lazy">
      <span class="deputy-party-badge">${partido}</span>
    </div>
    <div class="deputy-info">
      <h3>${p.nome}</h3>
      <p class="party-uf">${partido} - ${uf}</p>
      <p class="email">${email}</p>
    </div>
  `;
  card.addEventListener("click", () => onClick(p.id, p.tipo));
  return card;
}

export function switchModalTab(tabId) {
  const buttons = document.querySelectorAll(".modal-tab-btn");
  buttons.forEach(btn => {
    btn.classList.toggle("active", btn.outerHTML.includes(tabId));
  });

  const tabContents = document.querySelectorAll(".modal-tab-content");
  tabContents.forEach(content => {
    content.classList.toggle("active", content.id === `modal-tab-${tabId}`);
  });
}
