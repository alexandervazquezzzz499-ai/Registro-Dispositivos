let devices = [];
let currentUser = null;
let importRows = [];
let currentMaintenanceDeviceId = null;

const tableBody = document.getElementById('deviceTableBody');
const emptyMessage = document.getElementById('emptyMessage');
const totalCountSpan = document.getElementById('totalCount');
const searchInput = document.getElementById('searchInput');
const filterType = document.getElementById('filterType');
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const deviceForm = document.getElementById('deviceForm');
const openModalBtn = document.getElementById('openModalBtn');
const addEmptyBtn = document.getElementById('addEmptyBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const toast = document.getElementById('toast');
const exportExcelBtn = document.getElementById('exportExcelBtn');
const importExcelBtn = document.getElementById('importExcelBtn');
const importFileInput = document.getElementById('importFileInput');
const importModalOverlay = document.getElementById('importModalOverlay');
const importPreviewBody = document.getElementById('importPreviewBody');
const importSummary = document.getElementById('importSummary');
const cancelImportBtn = document.getElementById('cancelImportBtn');
const confirmImportBtn = document.getElementById('confirmImportBtn');
const maintenanceModalOverlay = document.getElementById('maintenanceModalOverlay');
const maintenanceDeviceInfo = document.getElementById('maintenanceDeviceInfo');
const maintenanceForm = document.getElementById('maintenanceForm');
const maintenanceHistoryBody = document.getElementById('maintenanceHistoryBody');
const closeMaintenanceModalBtn = document.getElementById('closeMaintenanceModalBtn');
const passwordModalOverlay = document.getElementById('passwordModalOverlay');
const passwordForm = document.getElementById('passwordForm');
const closePasswordModalBtn = document.getElementById('closePasswordModalBtn');
const changePasswordBtn = document.getElementById('changePasswordBtn');
const logoutBtn = document.getElementById('logoutBtn');
const manageUsersBtn = document.getElementById('manageUsersBtn');
const usersModalOverlay = document.getElementById('usersModalOverlay');
const closeUsersModalBtn = document.getElementById('closeUsersModalBtn');
const newUserForm = document.getElementById('newUserForm');
const usersTableBody = document.getElementById('usersTableBody');
const confirmModalOverlay = document.getElementById('confirmModalOverlay');
const confirmMessage = document.getElementById('confirmMessage');
const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');
const acceptConfirmBtn = document.getElementById('acceptConfirmBtn');

const fieldId = document.getElementById('deviceId');
const fieldDepartamento = document.getElementById('departamento');
const fieldUsuario = document.getElementById('usuario_responsable');
const fieldFabricante = document.getElementById('fabricante');
const fieldModelo = document.getElementById('modelo');
const fieldTipo = document.getElementById('tipo');
const fieldEstado = document.getElementById('estado');
const fieldProcesador = document.getElementById('procesador');
const fieldNucleos = document.getElementById('nucleos');
const fieldFrecuencia = document.getElementById('frecuencia');
const fieldRamTotal = document.getElementById('ram_total');
const fieldDetallesRam = document.getElementById('detalles_ram');

const TIPOS_VALIDOS = ['Desktop', 'All In One', 'Portátil', 'Monitor', 'Impresora', 'Servidor', 'Otro'];

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getBadgeEstado(estado) {
  if (!estado) estado = 'Activo';
  const est = estado.toLowerCase();
  let clase = 'badge-activo';
  if (est.includes('mantenimiento')) clase = 'badge-mantenimiento';
  else if (est.includes('baja')) clase = 'badge-baja';
  else if (est.includes('disponible')) clase = 'badge-disponible';
  return `<span class="badge ${clase}">${escapeHtml(estado)}</span>`;
}

function normalizar(texto) {
  if (!texto) return '';
  return String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function mapearColumna(col) {
  const n = normalizar(col);
  const mapa = {
    'departamento': 'departamento', 'usuario': 'usuario_responsable', 'responsable': 'usuario_responsable',
    'fabricante': 'fabricante', 'marca': 'fabricante', 'modelo': 'modelo', 'tipo': 'tipo', 'estado': 'estado',
    'procesador': 'procesador', 'cpu': 'procesador',
    'nucleos/cpus': 'nucleos', 'nucleos': 'nucleos', 'frecuencia cpu': 'frecuencia', 'frecuencia': 'frecuencia',
    'ram capacidad total': 'ram_total', 'ram total': 'ram_total', 'ram': 'ram_total',
    'detalles ram / ranuras / velocidad': 'detalles_ram', 'detalles ram': 'detalles_ram', 'ram detalles': 'detalles_ram'
  };
  return mapa[n] || null;
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (res.status === 401) { window.location.href = '/login.html'; throw new Error('No autorizado'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error en la petición');
  return data;
}

function mostrarConfirmacion(mensaje, callbackAceptar, esEliminar = false) {
  confirmMessage.innerHTML = mensaje;
  acceptConfirmBtn.style.background = esEliminar ? 'var(--danger)' : 'var(--primary)';
  confirmModalOverlay.classList.add('active');
  const nuevoAceptar = acceptConfirmBtn.cloneNode(true);
  acceptConfirmBtn.parentNode.replaceChild(nuevoAceptar, acceptConfirmBtn);
  nuevoAceptar.addEventListener('click', () => {
    confirmModalOverlay.classList.remove('active');
    callbackAceptar();
  });
}

function cerrarConfirmacion() {
  confirmModalOverlay.classList.remove('active');
}

async function abrirModalUsuarios() {
  usersModalOverlay.classList.add('active');
  usersTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Cargando usuarios...</td></tr>`;
  try {
    const users = await apiFetch('/api/usuarios');
    let html = '';
    users.forEach(u => {
      const fecha = new Date(u.creado_en).toLocaleDateString();
      html += `
        <tr>
          <td>${u.id}</td>
          <td style="font-weight:600;">${escapeHtml(u.usuario)}</td>
          <td>${escapeHtml(u.nombre)}</td>
          <td>${u.rol === 'admin' ? '<span class="badge badge-disponible">Admin</span>' : '<span class="badge badge-activo">Usuario</span>'}</td>
          <td style="color:var(--text-muted);">${fecha}</td>
        </tr>
      `;
    });
    usersTableBody.innerHTML = html;
  } catch (err) {
    usersTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Error al cargar usuarios</td></tr>`;
  }
}

async function handleNewUserSubmit(e) {
  e.preventDefault();
  const payload = {
    nombre: document.getElementById('newUserNombre').value.trim(),
    usuario: document.getElementById('newUserUsername').value.trim(),
    password: document.getElementById('newUserPassword').value,
    rol: document.getElementById('newUserRol').value
  };
  try {
    await apiFetch('/api/usuarios', { method: 'POST', body: JSON.stringify(payload) });
    showToast('Usuario creado exitosamente');
    newUserForm.reset();
    abrirModalUsuarios();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function cargarDispositivos() {
  try {
    devices = await apiFetch('/api/dispositivos');
    renderTable();
  } catch (err) { showToast(err.message, true); }
}

function getFilteredDevices() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const typeFilter = filterType.value;
  return devices.filter(d => {
    if (searchTerm) {
      const match = (d.departamento && d.departamento.toLowerCase().includes(searchTerm)) ||
                    (d.usuario_responsable && d.usuario_responsable.toLowerCase().includes(searchTerm)) ||
                    (d.modelo && d.modelo.toLowerCase().includes(searchTerm)) ||
                    (d.procesador && d.procesador.toLowerCase().includes(searchTerm));
      if (!match) return false;
    }
    if (typeFilter && d.tipo !== typeFilter) return false;
    return true;
  });
}

function renderTable() {
  const filtered = getFilteredDevices();
  totalCountSpan.textContent = devices.length;

  if (filtered.length === 0) {
    tableBody.innerHTML = '';
    emptyMessage.style.display = 'flex';
    return;
  }
  emptyMessage.style.display = 'none';

  let html = '';
  filtered.forEach(d => {
    html += `
      <tr data-id="${d.id}">
        <td style="font-weight: 500;">${escapeHtml(d.fabricante || '—')} ${escapeHtml(d.modelo || '')}</td>
        <td>${escapeHtml(d.tipo || '—')}</td>
        <td>${escapeHtml(d.fabricante || '—')} / ${escapeHtml(d.modelo || '—')}</td>
        <td>${escapeHtml(d.departamento || '—')} - ${escapeHtml(d.usuario_responsable || '—')}</td>
        <td>—</td> <!-- Columna DUEÑO (vacía como en tu captura) -->
        <td>${getBadgeEstado(d.estado)}</td>
        <td>
          <div class="actions">
            <button class="btn-icon maintenance" data-id="${d.id}" title="Mantenimiento">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
            </button>
            <button class="btn-icon edit" data-id="${d.id}" title="Editar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            </button>
            <button class="btn-icon delete" data-id="${d.id}" title="Eliminar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  });
  tableBody.innerHTML = html;

  document.querySelectorAll('.btn-icon.maintenance').forEach(btn => btn.addEventListener('click', (e) => openMaintenanceModal(e.currentTarget.dataset.id)));
  document.querySelectorAll('.btn-icon.edit').forEach(btn => btn.addEventListener('click', (e) => openEditModal(e.currentTarget.dataset.id)));
  document.querySelectorAll('.btn-icon.delete').forEach(btn => btn.addEventListener('click', (e) => {
    const id = e.currentTarget.dataset.id;
    const d = devices.find(x => String(x.id) === String(id));
    if (!d) return;
    mostrarConfirmacion(`¿Estás seguro de eliminar el equipo <b>${escapeHtml(d.modelo)}</b> de ${escapeHtml(d.departamento)}?`, () => {
      eliminarDispositivo(id);
    }, true);
  }));
}

async function eliminarDispositivo(id) {
  try {
    await apiFetch(`/api/dispositivos/${id}`, { method: 'DELETE' });
    showToast('Equipo eliminado');
    await cargarDispositivos();
  } catch (err) { showToast(err.message, true); }
}

async function openMaintenanceModal(id) {
  const d = devices.find(x => String(x.id) === String(id));
  if (!d) return;
  currentMaintenanceDeviceId = id;
  const nombreTecnico = currentUser ? currentUser.nombre : 'Desconocido';
  maintenanceDeviceInfo.innerHTML = `Equipo: <b>${escapeHtml(d.fabricante)} ${escapeHtml(d.modelo)}</b><br><span style="color:var(--primary); font-weight:bold;">👨‍🔧 Técnico en sesión: ${escapeHtml(nombreTecnico)}</span>`;
  maintenanceForm.reset();
  maintenanceHistoryBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Cargando historial...</td></tr>`;
  maintenanceModalOverlay.classList.add('active');
  try {
    const historial = await apiFetch(`/api/dispositivos/${id}/mantenimientos`);
    if (historial.length === 0) {
      maintenanceHistoryBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No hay mantenimientos previos.</td></tr>`;
    } else {
      let html = '';
      historial.forEach(h => {
        const fecha = new Date(h.fecha).toLocaleString('es-ES');
        html += `<tr><td style="font-size:0.75rem;">${fecha}</td><td style="font-size:0.75rem; font-weight:bold;">${escapeHtml(h.tecnico)}</td><td style="font-size:0.75rem; color:var(--danger);">${escapeHtml(h.falla)}</td><td style="font-size:0.75rem; color:var(--success);">${escapeHtml(h.solucion)}</td></tr>`;
      });
      maintenanceHistoryBody.innerHTML = html;
    }
  } catch (err) {
    maintenanceHistoryBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--danger);">Error al cargar historial</td></tr>`;
    showToast("Error: " + err.message, true);
  }
}

async function handleMaintenanceSubmit(e) {
  e.preventDefault();
  const falla = document.getElementById('falla').value.trim();
  const solucion = document.getElementById('solucion').value.trim();
  if (!falla || !solucion) return showToast('Falla y Solución son obligatorios', true);
  try {
    await apiFetch(`/api/dispositivos/${currentMaintenanceDeviceId}/mantenimientos`, { method: 'POST', body: JSON.stringify({ falla, solucion }) });
    showToast('Mantenimiento guardado correctamente');
    openMaintenanceModal(currentMaintenanceDeviceId);
    maintenanceForm.reset();
  } catch (err) { showToast("Error al guardar: " + err.message, true); }
}

function closeMaintenanceModal() {
  maintenanceModalOverlay.classList.remove('active');
  currentMaintenanceDeviceId = null;
}

function openNewModal() {
  modalTitle.textContent = 'Agregar dispositivo';
  deviceForm.reset();
  fieldId.value = '';
  fieldTipo.value = 'Desktop';
  fieldEstado.value = 'Activo';
  modalOverlay.classList.add('active');
}

function openEditModal(id) {
  const d = devices.find(x => String(x.id) === String(id));
  if (!d) return;
  modalTitle.textContent = 'Editar dispositivo';
  fieldId.value = d.id;
  fieldDepartamento.value = d.departamento || '';
  fieldUsuario.value = d.usuario_responsable || '';
  fieldFabricante.value = d.fabricante || '';
  fieldModelo.value = d.modelo || '';
  fieldTipo.value = d.tipo || 'Desktop';
  fieldEstado.value = d.estado || 'Activo';
  fieldProcesador.value = d.procesador || '';
  fieldNucleos.value = d.nucleos || '';
  fieldFrecuencia.value = d.frecuencia || '';
  fieldRamTotal.value = d.ram_total || '';
  fieldDetallesRam.value = d.detalles_ram || '';
  modalOverlay.classList.add('active');
}

function closeModal() {
  modalOverlay.classList.remove('active');
  deviceForm.reset();
  fieldId.value = '';
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const id = fieldId.value;
  const payload = {
    departamento: fieldDepartamento.value.trim(), usuario_responsable: fieldUsuario.value.trim(),
    fabricante: fieldFabricante.value.trim(), modelo: fieldModelo.value.trim(), tipo: fieldTipo.value, estado: fieldEstado.value,
    procesador: fieldProcesador.value.trim(), nucleos: fieldNucleos.value.trim(), frecuencia: fieldFrecuencia.value.trim(),
    ram_total: fieldRamTotal.value.trim(), detalles_ram: fieldDetallesRam.value.trim()
  };
  if (!payload.departamento || !payload.tipo) return showToast('Departamento y Tipo son obligatorios', true);
  try {
    if (id) {
      await apiFetch(`/api/dispositivos/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Equipo actualizado');
    } else {
      await apiFetch('/api/dispositivos', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Equipo agregado');
    }
    closeModal();
    await cargarDispositivos();
  } catch (err) { showToast(err.message, true); }
}

function exportarExcel() { /* ... (Igual que en el mensaje anterior) ... */ }
function parsearCSV(texto) { /* ... */ }
function procesarFilas(filasCrudas) { /* ... */ }
function mostrarPrevisualizacion(resultados) { /* ... */ }
async function manejarArchivoSeleccionado(file) { /* ... */ }
async function confirmarImportacion() { /* ... */ }

function initEvents() {
  openModalBtn.addEventListener('click', openNewModal);
  if (addEmptyBtn) addEmptyBtn.addEventListener('click', openNewModal);
  closeModalBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
  deviceForm.addEventListener('submit', handleFormSubmit);
  searchInput.addEventListener('input', renderTable);
  filterType.addEventListener('change', renderTable);
  
  manageUsersBtn.addEventListener('click', abrirModalUsuarios);
  closeUsersModalBtn.addEventListener('click', () => usersModalOverlay.classList.remove('active'));
  usersModalOverlay.addEventListener('click', (e) => { if (e.target === usersModalOverlay) usersModalOverlay.classList.remove('active'); });
  newUserForm.addEventListener('submit', handleNewUserSubmit);

  cancelConfirmBtn.addEventListener('click', cerrarConfirmacion);
  confirmModalOverlay.addEventListener('click', (e) => { if (e.target === confirmModalOverlay) cerrarConfirmacion(); });

  exportExcelBtn.addEventListener('click', exportarExcel);
  closeMaintenanceModalBtn.addEventListener('click', closeMaintenanceModal);
  maintenanceModalOverlay.addEventListener('click', (e) => { if (e.target === maintenanceModalOverlay) closeMaintenanceModal(); });
  maintenanceForm.addEventListener('submit', handleMaintenanceSubmit);
  
  changePasswordBtn.addEventListener('click', () => { passwordForm.reset(); passwordModalOverlay.classList.add('active'); });
  closePasswordModalBtn.addEventListener('click', () => passwordModalOverlay.classList.remove('active'));
  passwordModalOverlay.addEventListener('click', (e) => { if (e.target === passwordModalOverlay) closePasswordModalBtn.click(); });
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const actual = document.getElementById('passActual').value;
    const nueva = document.getElementById('passNueva').value;
    const confirmar = document.getElementById('passConfirmar').value;
    if (nueva !== confirmar) return showToast('Las contraseñas no coinciden', true);
    if (nueva.length < 6) return showToast('Mínimo 6 caracteres', true);
    try {
      await apiFetch('/api/cambiar-password', { method: 'POST', body: JSON.stringify({ passwordActual: actual, passwordNueva: nueva }) });
      showToast('Contraseña actualizada');
      passwordModalOverlay.classList.remove('active');
    } catch (err) { showToast(err.message, true); }
  });
  
  logoutBtn.addEventListener('click', () => {
    mostrarConfirmacion('¿Estás seguro de que deseas cerrar sesión?', async () => {
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = '/login.html';
    });
  });
  
  importExcelBtn.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', (e) => manejarArchivoSeleccionado(e.target.files[0]));
  cancelImportBtn.addEventListener('click', () => { importModalOverlay.classList.remove('active'); importFileInput.value = ''; importRows = []; });
  importModalOverlay.addEventListener('click', (e) => { if (e.target === importModalOverlay) { importModalOverlay.classList.remove('active'); importFileInput.value = ''; importRows = []; } });
  confirmImportBtn.addEventListener('click', confirmarImportacion);
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalOverlay.classList.contains('active')) closeModal();
      if (usersModalOverlay.classList.contains('active')) usersModalOverlay.classList.remove('active');
      if (passwordModalOverlay.classList.contains('active')) closePasswordModalBtn.click();
      if (importModalOverlay.classList.contains('active')) { importModalOverlay.classList.remove('active'); importFileInput.value = ''; importRows = []; }
      if (maintenanceModalOverlay.classList.contains('active')) closeMaintenanceModal();
      if (confirmModalOverlay.classList.contains('active')) cerrarConfirmacion();
    }
  });
}

(async function init() {
  try {
    const data = await fetch('/api/session').then(r => r.json());
    if (!data.autenticado) { window.location.href = '/login.html'; return; }
    currentUser = data.usuario;
    document.getElementById('userName').textContent = currentUser.nombre;
    document.getElementById('userRole').textContent = currentUser.rol;
    document.getElementById('userAvatar').textContent = currentUser.nombre.charAt(0).toUpperCase();
    
    if (currentUser.rol === 'admin') {
      manageUsersBtn.style.display = 'flex';
    }
  } catch { window.location.href = '/login.html'; }
  initEvents();
  await cargarDispositivos();
})();