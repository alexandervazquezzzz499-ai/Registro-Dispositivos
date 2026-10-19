let todosMantenimientos = [];
const tableBody = document.getElementById('maintenanceTableBody');
const emptyMsg = document.getElementById('emptyMantenimiento');
const searchInput = document.getElementById('searchMantenimiento');
const filterMarca = document.getElementById('filterMarca');
const toast = document.getElementById('toast');

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function cargarMantenimientos() {
  try {
    const res = await fetch('/api/todos-mantenimientos', { cache: 'no-store' });
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    todosMantenimientos = await res.json();
    
    // Llenar el filtro de marcas
    const marcasUnicas = [...new Set(todosMantenimientos.map(m => m.fabricante).filter(Boolean))].sort();
    // Limpiar opciones previas (menos la primera)
    filterMarca.innerHTML = '<option value="">Todas las marcas</option>';
    marcasUnicas.forEach(marca => {
      const opt = document.createElement('option');
      opt.value = marca;
      opt.textContent = marca;
      filterMarca.appendChild(opt);
    });

    renderTabla();
  } catch (err) {
    showToast('Error al cargar datos');
  }
}

function renderTabla() {
  const texto = searchInput.value.toLowerCase().trim();
  const marcaFiltro = filterMarca.value;

  const filtrados = todosMantenimientos.filter(m => {
    const coincideTexto = !texto || 
      (m.falla && m.falla.toLowerCase().includes(texto)) ||
      (m.solucion && m.solucion.toLowerCase().includes(texto)) ||
      (m.tecnico && m.tecnico.toLowerCase().includes(texto)) ||
      (m.modelo && m.modelo.toLowerCase().includes(texto));
      
    const coincideMarca = !marcaFiltro || m.fabricante === marcaFiltro;

    return coincideTexto && coincideMarca;
  });

  if (filtrados.length === 0) {
    tableBody.innerHTML = '';
    emptyMsg.style.display = 'flex';
    return;
  }
  emptyMsg.style.display = 'none';

  let html = '';
  filtrados.forEach(m => {
    const fecha = new Date(m.fecha).toLocaleString('es-ES');
    html += `
      <tr>
        <td style="font-size:0.85rem; color:#64748b;">${fecha}</td>
        <td style="font-weight:600;">${escapeHtml(m.fabricante)} ${escapeHtml(m.modelo)} <br><span style="font-size:0.75rem;color:#94a3b8;">Serie: ${escapeHtml(m.serie || 'N/A')}</span></td>
        <td><span class="badge badge-disponible">${escapeHtml(m.fabricante || '—')}</span></td>
        <td style="color:var(--danger); font-size:0.9rem;">${escapeHtml(m.falla)}</td>
        <td style="color:var(--success); font-size:0.9rem;">${escapeHtml(m.solucion)}</td>
        <td style="font-weight:500;">${escapeHtml(m.tecnico)}</td>
      </tr>
    `;
  });
  tableBody.innerHTML = html;
}

searchInput.addEventListener('input', renderTabla);
filterMarca.addEventListener('change', renderTabla);

// Actualización en tiempo real cada 10 segundos
setInterval(cargarMantenimientos, 10000);

// Iniciar
cargarMantenimientos();