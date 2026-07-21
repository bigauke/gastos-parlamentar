// carousel.js - Lógica do Carrossel de Destaques

import { createParlamentarCard } from './ui.js';

let carouselIndex = 0;
let autoplayTimer = null;
let FEATURED_PARLAMENTARES = [];
let onClickCallback = null;

export function initFeaturedCarousel(parlamentares, containerId, onClick) {
  FEATURED_PARLAMENTARES = parlamentares;
  onClickCallback = onClick;
  
  const listElement = document.getElementById(containerId);
  if (!listElement) return;
  listElement.innerHTML = "";

  FEATURED_PARLAMENTARES.forEach(p => {
    const card = createParlamentarCard(p, onClickCallback);
    listElement.appendChild(card);
  });

  setupCarouselListeners();
}

function setupCarouselListeners() {
  const track = document.getElementById("featured-carousel-track");
  const prevBtn = document.getElementById("carousel-prev");
  const nextBtn = document.getElementById("carousel-next");
  const indicatorsContainer = document.getElementById("carousel-indicators");

  if (!track || !prevBtn || !nextBtn || !indicatorsContainer) return;

  carouselIndex = 0;
  renderCarouselIndicators();

  // Remove event listeners clonando os nós
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

  window.addEventListener("resize", () => {
    updateCarouselPosition();
    renderCarouselIndicators();
  });

  startAutoplay();

  const container = document.querySelector(".carousel-container");
  if (container) {
    container.onmouseenter = stopAutoplay;
    container.onmouseleave = startAutoplay;
  }

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
    dot.className = \`carousel-indicator \${i === carouselIndex ? "active" : ""}\`;
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
    carouselIndex = carouselIndex < maxIndex ? carouselIndex + 1 : 0;
  } else if (direction === "prev") {
    carouselIndex = carouselIndex > 0 ? carouselIndex - 1 : maxIndex;
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
  const gap = 24; 

  const translation = carouselIndex * (cardWidth + gap);
  track.style.transform = \`translateX(-\${translation}px)\`;

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
