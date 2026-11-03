let todosMantenimientos = [];
let isAdmin = false;

const tableBody = document.getElementById('maintenanceTableBody');
const emptyMsg = document.getElementById('emptyMantenimiento');
const searchInput = document.getElementById('searchMantenimiento');
const filterMarca = document.getElementById('filterMarca');
const toast = document.getElementById('toast');
const deleteSelectedHistoryBtn = document.getElementById('deleteSelectedHistoryBtn');
const selectAllHistory = document.getElementById('selectAllHistory');
const exportMonthlyPdfBtn = document.getElementById('exportMonthlyPdfBtn'); // NUEVO

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
    
    const solucionHtml = `
      <div style="display:flex; align-items:center; gap:5px;">
        <span style="color:${m.solucion ? 'var(--success)' : '#94a3b8'}; font-size:0.85rem; ${!m.solucion ? 'font-style:italic;' : ''}">
          ${m.solucion ? escapeHtml(m.solucion) : 'Pendiente por resolver'}
        </span>
        <button class="btn-edit-solucion" data-id="${m.id}" data-solucion="${escapeHtml(m.solucion || '')}" style="background:none; border:none; cursor:pointer; font-size:1.1rem;" title="Modificar Solución">✏️</button>
      </div>
    `;

    const tipoBadge = m.tipo_mantenimiento === 'Cambio de Hardware' 
      ? '<span class="badge badge-mantenimiento">Cambio HW</span>' 
      : '<span class="badge badge-falla">Falla</span>';

    html += `
      <tr>
        <td><input type="checkbox" class="history-checkbox" value="${m.id}" style="cursor: pointer; width: 16px; height: 16px;"></td>
        <td style="font-size:0.85rem; color:#64748b;">${fecha}</td>
        <td style="font-weight:600;">${escapeHtml(m.fabricante)} ${escapeHtml(m.modelo)} <br><span style="font-size:0.75rem;color:#94a3b8;">Serie: ${escapeHtml(m.serie || 'N/A')}</span></td>
        <td><span class="badge badge-disponible">${escapeHtml(m.fabricante || '—')}</span></td>
        <td>${tipoBadge}</td>
        <td style="color:var(--danger); font-size:0.9rem;">${escapeHtml(m.falla)}</td>
        <td>${solucionHtml}</td>
        <td style="font-weight:500;">${escapeHtml(m.tecnico)}</td>
      </tr>
    `;
  });
  tableBody.innerHTML = html;

  document.querySelectorAll('.btn-edit-solucion').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      const actual = e.currentTarget.dataset.solucion;
      
      const nueva = prompt('Modificar solución aplicada:', actual);
      
      if (nueva !== null) {
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
          cargarMantenimientos();
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

// GENERAR REPORTE MENSUAL PDF
exportMonthlyPdfBtn.addEventListener('click', () => {
  if (todosMantenimientos.length === 0) return showToast('No hay datos para exportar', true);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('landscape');
  
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const anioActual = hoy.getFullYear();
  
  const mantMes = todosMantenimientos.filter(m => {
    const fechaM = new Date(m.fecha);
    return fechaM.getMonth() === mesActual && fechaM.getFullYear() === anioActual;
  });

  if (mantMes.length === 0) return showToast('No hay mantenimientos registrados este mes', true);

  doc.setFontSize(16);
  doc.text(`REPORTE DE MANTENIMIENTOS - ${hoy.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}`, 14, 15);
  
  doc.setFontSize(10);
  doc.text(`Total de registros este mes: ${mantMes.length}`, 14, 23);

  const tableData = mantMes.map(m => [
    new Date(m.fecha).toLocaleDateString(),
    `${m.fabricante} ${m.modelo}\n(S/N: ${m.serie || 'N/A'})`,
    m.tipo_mantenimiento || 'Falla',
    m.falla,
    m.solucion || 'Pendiente',
    m.tecnico
  ]);

  doc.autoTable({
    startY: 30,
    head: [['Fecha', 'Equipo', 'Tipo', 'Falla / Componente', 'Solución', 'Técnico']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [30, 43, 60] },
    styles: { fontSize: 8 }
  });

  doc.save(`Reporte_Mensual_${mesActual+1}_${anioActual}.pdf`);
  showToast('Reporte mensual generado');
});

searchInput.addEventListener('input', renderTabla);
filterMarca.addEventListener('change', renderTabla);

setInterval(cargarMantenimientos, 10000);

verificarAdmin();
cargarMantenimientos();