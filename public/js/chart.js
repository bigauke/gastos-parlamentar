// chart.js - Lógica de Gráficos (Chart.js)

let chartInstance = null;

export function renderExpensesChart(totals) {
  const ctx = document.getElementById("expenses-chart").getContext("2d");
  
  if (chartInstance) {
    chartInstance.destroy();
  }

  const sortedCategories = Object.entries(totals).sort((a,b) => b[1] - a[1]);
  const labels = sortedCategories.map(c => c[0]); 
  const values = sortedCategories.map(c => c[1]);

  const backgroundColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', 
    '#ef4444', '#06b6d4', '#14b8a6', '#f43f5e', '#a855f7'
  ];

  const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
  const themeBorderColor = currentTheme === "dark" ? "#121824" : "#ffffff";

  // @ts-ignore
  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.slice(0, 5),
      datasets: [{
        data: values.slice(0, 5),
        backgroundColor: backgroundColors.slice(0, 5),
        borderWidth: 1,
        borderColor: themeBorderColor
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false 
        },
        tooltip: {
          callbacks: {
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

  const legendContainer = document.getElementById("chart-legend");
  if (legendContainer) {
    legendContainer.innerHTML = "";
    sortedCategories.slice(0, 5).forEach((item, idx) => {
      const categoryName = item[0];
      const value = item[1];
      const color = backgroundColors[idx % backgroundColors.length];
      
      const legendItem = document.createElement("div");
      legendItem.className = "legend-item";
      legendItem.innerHTML = `
        <span class="legend-color-box" style="background-color: ${color};"></span>
        <div class="legend-text-info">
          <span class="legend-cat-name">${categoryName}</span>
          <span class="legend-cat-value">R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      `;
      legendContainer.appendChild(legendItem);
    });
  }
}

export function updateChartTheme(newTheme) {
    if (chartInstance && chartInstance.data && chartInstance.data.datasets && chartInstance.data.datasets[0]) {
      chartInstance.data.datasets[0].borderColor = newTheme === "dark" ? "#121824" : "#ffffff";
      chartInstance.update();
    }
}

export function destroyChart() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}
