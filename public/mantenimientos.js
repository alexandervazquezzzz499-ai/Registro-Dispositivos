let todosMantenimientos = [];
let isAdmin = false;

const tableBody = document.getElementById('maintenanceTableBody');
const emptyMsg = document.getElementById('emptyMantenimiento');
const searchInput = document.getElementById('searchMantenimiento');
const filterMarca = document.getElementById('filterMarca');
const toast = document.getElementById('toast');
const deleteSelectedHistoryBtn = document.getElementById('deleteSelectedHistoryBtn');
const selectAllHistory = document.getElementById('selectAllHistory');

function showToast(msg, isError = false) {
  toast.textContent = msg;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function verificarAdmin() {
  try {
    const res = await fetch('/api/session');
    const data = await res.json();
    if (data.autenticado && data.usuario.rol === 'admin') {
      isAdmin = true;
      deleteSelectedHistoryBtn.style.display = 'flex';
    }
  } catch (e) {}
}

async function cargarMantenimientos() {
  try {
    const res = await fetch('/api/todos-mantenimientos', { cache: 'no-store' });
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    todosMantenimientos = await res.json();
    
    const marcasUnicas = [...new Set(todosMantenimientos.map(m => m.fabricante).filter(Boolean))].sort();
    const valActual = filterMarca.value;
    filterMarca.innerHTML = '<option value="">Todas las marcas</option>';
    marcasUnicas.forEach(marca => {
      const opt = document.createElement('option');
      opt.value = marca;
      opt.textContent = marca;
      if(marca === valActual) opt.selected = true;
      filterMarca.appendChild(opt);
    });

    renderTabla();
  } catch (err) {
    showToast('Error al cargar datos', true);
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
    
    // Agregamos el botón de edición (✏️) al lado de la solución
    const solucionHtml = `
      <div style="display:flex; align-items:center; gap:5px;">
        <span style="color:${m.solucion ? 'var(--success)' : '#94a3b8'}; font-size:0.85rem; ${!m.solucion ? 'font-style:italic;' : ''}">
          ${m.solucion ? escapeHtml(m.solucion) : 'Pendiente por resolver'}
        </span>
        <button class="btn-edit-solucion" data-id="${m.id}" data-solucion="${escapeHtml(m.solucion || '')}" style="background:none; border:none; cursor:pointer; font-size:1.1rem;" title="Modificar Solución">✏️</button>
      </div>
    `;

    html += `
      <tr>
        <td><input type="checkbox" class="history-checkbox" value="${m.id}" style="cursor: pointer; width: 16px; height: 16px;"></td>
        <td style="font-size:0.85rem; color:#64748b;">${fecha}</td>
        <td style="font-weight:600;">${escapeHtml(m.fabricante)} ${escapeHtml(m.modelo)} <br><span style="font-size:0.75rem;color:#94a3b8;">Serie: ${escapeHtml(m.serie || 'N/A')}</span></td>
        <td><span class="badge badge-disponible">${escapeHtml(m.fabricante || '—')}</span></td>
        <td style="color:var(--danger); font-size:0.9rem;">${escapeHtml(m.falla)}</td>
        <td>${solucionHtml}</td>
        <td style="font-weight:500;">${escapeHtml(m.tecnico)}</td>
      </tr>
    `;
  });
  tableBody.innerHTML = html;

  // Evento para modificar la solución
  document.querySelectorAll('.btn-edit-solucion').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      const actual = e.currentTarget.dataset.solucion;
      
      // El prompt mostrará la solución actual (si existe) para poder editarla
      const nueva = prompt('Modificar solución aplicada:', actual);
      
      if (nueva !== null) { // Si el usuario no presionó "Cancelar"
        if (nueva.trim() === '') {
          alert('La solución no puede estar vacía.');
          return;
        }
        try {
          const res = await fetch(`/api/mantenimientos/${id}/solucion`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ solucion: nueva })
          });
          if (!res.ok) throw new Error();
          showToast('Solución actualizada correctamente');
          cargarMantenimientos(); // Recargar la tabla para ver el cambio
        } catch (error) {
          showToast('Error al actualizar la solución', true);
        }
      }
    });
  });
}

selectAllHistory.addEventListener('change', (e) => {
  const checkboxes = document.querySelectorAll('.history-checkbox');
  checkboxes.forEach(cb => cb.checked = e.target.checked);
});

deleteSelectedHistoryBtn.addEventListener('click', async () => {
  const checkboxes = document.querySelectorAll('.history-checkbox:checked');
  if (checkboxes.length === 0) {
    return showToast('Selecciona al menos un registro para eliminar', true);
  }

  if (!confirm(`¿Estás seguro de eliminar ${checkboxes.length} mantenimiento(s)? Esta acción no se puede deshacer.`)) return;

  deleteSelectedHistoryBtn.disabled = true;
  deleteSelectedHistoryBtn.textContent = 'Eliminando...';

  let errores = 0;
  for (const cb of checkboxes) {
    try {
      const res = await fetch(`/api/mantenimientos/${cb.value}`, { method: 'DELETE' });
      if (!res.ok) errores++;
    } catch (e) { errores++; }
  }

  deleteSelectedHistoryBtn.disabled = false;
  deleteSelectedHistoryBtn.innerHTML = '🗑️ Eliminar Seleccionados';
  selectAllHistory.checked = false;

  if (errores > 0) {
    showToast(`Se eliminaron algunos, pero fallaron ${errores}`, true);
  } else {
    showToast('Registros eliminados correctamente');
  }
  cargarMantenimientos();
});

searchInput.addEventListener('input', renderTabla);
filterMarca.addEventListener('change', renderTabla);

setInterval(cargarMantenimientos, 10000);

verificarAdmin();
cargarMantenimientos();