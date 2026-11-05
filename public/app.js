let devices = [];
let currentUser = null;
let importRows = [];
let currentMaintenanceDeviceId = null;
let lastNotifTime = 0;

const PALABRAS_GROSERAS = ['mierda', 'pendejo', 'cabron', 'cabrón', 'verga', 'coño', 'joder', 'estupido', 'estúpido', 'idiota', 'culero', 'marico', 'maricón', 'zorra', 'perra', 'gonorrea', 'malparido', 'hijueputa', 'imbecil', 'imbécil'];

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
const globalImportState = document.getElementById('globalImportState');
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

const configBtn = document.getElementById('configBtn');
const configModalOverlay = document.getElementById('configModalOverlay');
const closeConfigModalBtn = document.getElementById('closeConfigModalBtn');
const configDias = document.getElementById('configDias');
const saveDiasBtn = document.getElementById('saveDiasBtn');
const festivoForm = document.getElementById('festivoForm');
const festivosTableBody = document.getElementById('festivosTableBody');

const notifBellBtn = document.getElementById('notifBellBtn');
const notifBadge = document.getElementById('notifBadge');
const notifDropdown = document.getElementById('notifDropdown');
const notifList = document.getElementById('notifList');
const closeNotifBtn = document.getElementById('closeNotifBtn');
const notifPopupContainer = document.getElementById('notifPopupContainer');

const qrModalOverlay = document.getElementById('qrModalOverlay');
const qrDeviceInfo = document.getElementById('qrDeviceInfo');
const qrcodeContainer = document.getElementById('qrcode');
const closeQrModalBtn = document.getElementById('closeQrModalBtn');
const downloadQrBtn = document.getElementById('downloadQrBtn');

const fieldId = document.getElementById('deviceId');
const fieldDepartamento = document.getElementById('departamento');
const fieldUsuario = document.getElementById('usuario_responsable');
const fieldFabricante = document.getElementById('fabricante');
const fieldModelo = document.getElementById('modelo');
const fieldTipo = document.getElementById('tipo');
const fieldEstado = document.getElementById('estado');
const fieldSerie = document.getElementById('serie');
const fieldProcesador = document.getElementById('procesador');
const fieldNucleos = document.getElementById('nucleos');
const fieldFrecuencia = document.getElementById('frecuencia');
const fieldRamTotal = document.getElementById('ram_total');
const fieldDetallesRam = document.getElementById('detalles_ram');
const fieldPerifericos = document.getElementById('perifericos');

const TIPOS_VALIDOS = ['Desktop', 'All In One', 'Portátil', 'Monitor', 'Impresora', 'Servidor', 'Otro'];

const SVG_TRASH = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
const SVG_PENCIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>';
const SVG_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
const SVG_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
const SVG_TOOL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>';
const SVG_REFRESH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>';

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

function normalizar(texto) {
  if (!texto) return '';
  return String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function contieneGroserias(texto) {
  if (!texto) return false;
  const limpio = normalizar(texto);
  return PALABRAS_GROSERAS.some(palabra => limpio.includes(palabra));
}

function getBadgeEstado(estado) {
  if (!estado) estado = 'Activo';
  const est = estado.toLowerCase();
  let clase = 'badge-activo';
  if (est.includes('mantenimiento')) clase = 'badge-mantenimiento';
  else if (est.includes('baja')) clase = 'badge-baja';
  else if (est.includes('disponible')) clase = 'badge-disponible';
  else if (est.includes('falla')) clase = 'badge-falla';
  else if (est.includes('bloqueado')) clase = 'badge-bloqueado';
  return `<span class="badge ${clase}">${escapeHtml(estado)}</span>`;
}

function mapearColumna(col) {
  const n = normalizar(col);
  const mapa = {
    'departamento': 'departamento', 'depto': 'departamento', 'area': 'departamento',
    'usuario': 'usuario_responsable', 'responsable': 'usuario_responsable',
    'fabricante': 'fabricante', 'marca': 'fabricante',
    'modelo': 'modelo',
    'tipo': 'tipo', 'estado': 'estado',
    'serie': 'serie', 'serial': 'serie', 'n/serie': 'serie', 'n serie': 'serie',
    'procesador': 'procesador', 'cpu': 'procesador',
    'nucleos/cpus': 'nucleos', 'nucleos': 'nucleos',
    'frecuencia cpu': 'frecuencia', 'frecuencia': 'frecuencia',
    'ram capacidad total': 'ram_total', 'ram total': 'ram_total', 'ram': 'ram_total',
    'detalles ram / ranuras / velocidad': 'detalles_ram', 'detalles ram': 'detalles_ram', 'ram detalles': 'detalles_ram',
    'perifericos': 'perifericos'
  };
  return mapa[n] || null;
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, cache: 'no-store', ...options });
  if (res.status === 401) { window.location.href = '/login.html'; throw new Error('No autorizado'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error en la petición');
  return data;
}

function mostrarConfirmacion(mensaje, callbackAceptar, esEliminar = false) {
  confirmMessage.innerHTML = mensaje;
  const btnAceptar = document.getElementById('acceptConfirmBtn');
  btnAceptar.textContent = 'Aceptar';
  btnAceptar.className = esEliminar ? 'btn-danger' : 'btn-primary';
  btnAceptar.onclick = () => {
    confirmModalOverlay.classList.remove('active');
    callbackAceptar();
  };
  confirmModalOverlay.classList.add('active');
}

function cerrarConfirmacion() { confirmModalOverlay.classList.remove('active'); }

async function cargarNotificaciones(isInitial = false) {
  try {
    const notifs = await apiFetch('/api/notificaciones');
    
    if (notifs.length === 0) {
      notifList.innerHTML = `<div style="padding:1rem; text-align:center; color:var(--text-subtle); font-size:0.8125rem;">No hay notificaciones recientes</div>`;
      notifBadge.style.display = 'none';
    } else {
      notifBadge.textContent = notifs.length;
      notifBadge.style.display = 'flex';
      
      let html = '';
      notifs.forEach(n => {
        const isReport = n.type === 'reporte';
        html += `
          <div class="notif-item">
            <div class="notif-icon ${isReport ? 'report' : 'update'}">${isReport ? SVG_TOOL : SVG_REFRESH}</div>
            <div class="notif-content">
              <div class="notif-title">${escapeHtml(n.title)}</div>
              <div class="notif-desc">${escapeHtml(n.desc)}</div>
              <span class="notif-time">${new Date(n.date).toLocaleString('es-ES')}</span>
            </div>
          </div>
        `;
      });
      notifList.innerHTML = html;

      const latestDate = new Date(notifs[0].date).getTime();
      if (isInitial) {
        lastNotifTime = latestDate;
      } else if (latestDate > lastNotifTime) {
        showNotifPopup(notifs[0]);
        lastNotifTime = latestDate;
      }
    }
  } catch (err) { console.error('Error al cargar notificaciones', err); }
}

function showNotifPopup(notif) {
  if (!notifPopupContainer) return;
  
  const div = document.createElement('div');
  div.className = 'notif-popup';
  
  const isReport = notif.type === 'reporte';
  div.innerHTML = `
    <div class="notif-icon ${isReport ? 'report' : 'update'}">${isReport ? SVG_TOOL : SVG_REFRESH}</div>
    <div class="notif-content">
      <div class="notif-title">${escapeHtml(notif.title)}</div>
      <div class="notif-desc">${escapeHtml(notif.desc)}</div>
      <span class="notif-time">Justo ahora</span>
    </div>
  `;
  
  notifPopupContainer.appendChild(div);
  
  setTimeout(() => {
    div.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => div.remove(), 300);
  }, 5000);
}

async function abrirModalUsuarios() {
  usersModalOverlay.classList.add('active');
  usersTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Cargando usuarios...</td></tr>`;
  try {
    const users = await apiFetch('/api/usuarios');
    let html = '';
    users.forEach(u => {
      const fecha = new Date(u.creado_en).toLocaleDateString();
      const btnEliminar = String(u.id) === String(currentUser.id)
        ? '<span style="color:var(--text-subtle); font-size:0.75rem;">Tú</span>'
        : `<button class="btn-icon delete-user" data-id="${u.id}" data-nombre="${escapeHtml(u.nombre)}" title="Eliminar">${SVG_TRASH}</button>`;

      const rolLabel = u.rol === 'admin' ? '<span class="badge badge-asignado">Admin</span>' : '<span class="badge badge-activo">Técnico</span>';

      html += `
        <tr>
          <td>${u.id}</td>
          <td style="font-weight:600;">${escapeHtml(u.usuario)}</td>
          <td>${escapeHtml(u.nombre)}</td>
          <td>${rolLabel}</td>
          <td style="color:var(--text-subtle);">${fecha}</td>
          <td>${btnEliminar}</td>
        </tr>
      `;
    });
    usersTableBody.innerHTML = html;

    document.querySelectorAll('.delete-user').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const nombre = e.currentTarget.dataset.nombre;
        mostrarConfirmacion(`¿Eliminar al usuario <b>${nombre}</b>?`, () => { eliminarUsuario(id); }, true);
      });
    });
  } catch (err) { usersTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--danger);">Error al cargar usuarios</td></tr>`; }
}

async function abrirModalConfig() {
  configModalOverlay.classList.add('active');
  try {
    const config = await apiFetch('/api/configuracion');
    configDias.value = config.dias_inactividad;
    
    let html = '';
    config.festivos.forEach(f => {
      const dateStr = new Date(f.fecha).toLocaleDateString();
      html += `<tr><td>${dateStr}</td><td>${escapeHtml(f.nombre)}</td><td><button class="btn-icon delete-festivo" data-id="${f.id}" title="Eliminar">${SVG_TRASH}</button></td></tr>`;
    });
    festivosTableBody.innerHTML = html || '<tr><td colspan="3" style="text-align:center; color:var(--text-subtle);">No hay festivos configurados</td></tr>';

    document.querySelectorAll('.delete-festivo').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        await apiFetch(`/api/festivos/${id}`, { method: 'DELETE' });
        abrirModalConfig(); 
      });
    });
  } catch (err) { showToast(err.message, true); }
}

async function eliminarUsuario(id) {
  try {
    await apiFetch(`/api/usuarios/${id}`, { method: 'DELETE' });
    showToast('Usuario eliminado correctamente');
    abrirModalUsuarios();
  } catch (err) { showToast(err.message, true); }
}

async function handleNewUserSubmit(e) {
  e.preventDefault();
  const nombre = document.getElementById('newUserNombre').value.trim();
  const usuario = document.getElementById('newUserUsername').value.trim();
  if (contieneGroserias(nombre) || contieneGroserias(usuario)) return showToast('El nombre o usuario contiene palabras no permitidas.', true);
  
  const payload = { nombre, usuario, password: document.getElementById('newUserPassword').value, rol: document.getElementById('newUserRol').value };
  try {
    await apiFetch('/api/usuarios', { method: 'POST', body: JSON.stringify(payload) });
    showToast('Usuario creado exitosamente');
    newUserForm.reset();
    abrirModalUsuarios();
  } catch (err) { showToast(err.message, true); }
}

async function cargarDispositivos(silencioso = false) {
  try {
    if (silencioso && document.querySelector('.modal-overlay.active')) return;
    devices = await apiFetch('/api/dispositivos');
    renderTable();

    const urlParams = new URLSearchParams(window.location.search);
    const qrParam = urlParams.get('qr');
    if (qrParam && !silencioso) {
      const dev = devices.find(x => x.qr_code === qrParam);
      if (dev) {
        openMaintenanceModal(dev.id);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        showToast('Equipo no encontrado con ese QR', true);
      }
    }
  } catch (err) {
    if (!silencioso) showToast(err.message, true);
  }
}

function getFilteredDevices() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const typeFilter = filterType.value;
  return devices.filter(d => {
    if (searchTerm) {
      const match = (d.departamento && d.departamento.toLowerCase().includes(searchTerm)) ||
                    (d.usuario_responsable && d.usuario_responsable.toLowerCase().includes(searchTerm)) ||
                    (d.modelo && d.modelo.toLowerCase().includes(searchTerm)) ||
                    (d.procesador && d.procesador.toLowerCase().includes(searchTerm)) ||
                    (d.serie && d.serie.toLowerCase().includes(searchTerm)) ||
                    (d.qr_code && d.qr_code.toLowerCase().includes(searchTerm));
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
    let deptoMostrar = d.departamento || '—';
    let duenoMostrar = d.usuario_responsable || '—';
    if (duenoMostrar === '—' && deptoMostrar.includes(' - ')) {
      const partes = deptoMostrar.split(' - ');
      deptoMostrar = partes[0].trim();
      duenoMostrar = partes.slice(1).join(' - ').trim();
    }

    const bloqueado = d.estado === 'Bloqueado';

    const btnNota = (d.estado === 'Disponible' && !bloqueado)
      ? `<button class="btn-icon print" data-id="${d.id}" title="Imprimir Nota de Entrega"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></button>`
      : '';

    const btnMaintenance = !bloqueado 
      ? `<button class="btn-icon maintenance" data-id="${d.id}" title="Mantenimiento"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg></button>`
      : `<button class="btn-icon unblock" data-id="${d.id}" title="Desbloquear Equipo" style="color:#F43F5E;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg></button>`;

    html += `
      <tr data-id="${d.id}">
        <td style="font-weight: 500;">${escapeHtml(d.fabricante || '—')} ${escapeHtml(d.modelo || '')}</td>
        <td>${escapeHtml(d.tipo || '—')}</td>
        <td>${escapeHtml(d.fabricante || '—')} / ${escapeHtml(d.modelo || '—')}</td>
        <td>${escapeHtml(deptoMostrar)}</td>
        <td>${escapeHtml(duenoMostrar)}</td>
        <td>${getBadgeEstado(d.estado)}</td>
        <td>
          <div class="actions">
            ${btnNota}
            <button class="btn-icon qr" data-id="${d.id}" title="Ver Código QR"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></button>
            <button class="btn-icon edit" data-id="${d.id}" title="Editar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></button>
            ${btnMaintenance}
            <button class="btn-icon delete" data-id="${d.id}" title="Eliminar">${SVG_TRASH}</button>
          </div>
        </td>
      </tr>
    `;
  });
  tableBody.innerHTML = html;

  document.querySelectorAll('.btn-icon.print').forEach(btn => btn.addEventListener('click', (e) => generarNotaEntregaPDF(e.currentTarget.dataset.id)));
  document.querySelectorAll('.btn-icon.qr').forEach(btn => btn.addEventListener('click', (e) => mostrarQRModal(e.currentTarget.dataset.id)));
  
  // AQUÍ ESTÁ EL INTERCAMBIO DE FUNCIONES
  document.querySelectorAll('.btn-icon.maintenance').forEach(btn => btn.addEventListener('click', (e) => openEditModal(e.currentTarget.dataset.id))); // La llave ahora Edita
  document.querySelectorAll('.btn-icon.unblock').forEach(btn => btn.addEventListener('click', async (e) => {
    const id = e.currentTarget.dataset.id;
    mostrarConfirmacion('¿Desbloquear este equipo y reactivar su contador de inactividad?', async () => {
      try {
        await apiFetch(`/api/dispositivos/${id}/desbloquear`, { method: 'POST' });
        showToast('Equipo desbloqueado correctamente');
        await cargarDispositivos();
      } catch (err) { showToast(err.message, true); }
    });
  }));
  document.querySelectorAll('.btn-icon.edit').forEach(btn => btn.addEventListener('click', (e) => openMaintenanceModal(e.currentTarget.dataset.id))); // El lápiz ahora Mantenimiento
  
  document.querySelectorAll('.btn-icon.delete').forEach(btn => btn.addEventListener('click', (e) => {
    const id = e.currentTarget.dataset.id;
    const d = devices.find(x => String(x.id) === String(id));
    if (!d) return;
    mostrarConfirmacion(`¿Eliminar el equipo <b>${escapeHtml(d.modelo)}</b>?`, () => { eliminarDispositivo(id); }, true);
  }));
}

function mostrarQRModal(id) {
  const d = devices.find(x => String(x.id) === String(id));
  if (!d) return;
  qrDeviceInfo.textContent = `${d.fabricante} ${d.modelo} (S/N: ${d.serie || 'N/A'})`;
  qrcodeContainer.innerHTML = '';
  const qrUrl = `${window.location.origin}/?qr=${d.qr_code}`;
  new QRCode(qrcodeContainer, { text: qrUrl, width: 200, height: 200, colorDark : "#0A0E1A", colorLight : "#FFFFFF", correctLevel : QRCode.CorrectLevel.H });
  qrModalOverlay.classList.add('active');
}

async function generarNotaEntregaPDF(id) {
  const d = devices.find(x => String(x.id) === String(id));
  if (!d || d.estado !== 'Disponible') return;

  showToast('Generando Nota de Entrega...');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'letter');
  
  let historial = [];
  try { historial = await apiFetch(`/api/dispositivos/${id}/mantenimientos`); } catch(e) {}
  const cambiosHardware = historial.filter(h => h.tipo_mantenimiento === 'Cambio de Hardware');

  doc.setFontSize(18);
  doc.text('NOTA DE ENTREGA DE EQUIPO', 108, 20, null, null, 'center');
  doc.setFontSize(10);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 30);
  doc.text(`Tecnico: ${currentUser ? currentUser.nombre : 'N/A'}`, 20, 35);
  doc.setFontSize(12);
  doc.text('Informacion del Equipo', 20, 50);
  doc.setFontSize(10);
  doc.text(`Tipo: ${d.tipo}`, 20, 58);
  doc.text(`Marca: ${d.fabricante}`, 20, 64);
  doc.text(`Modelo: ${d.modelo}`, 20, 70);
  doc.text(`N/S (Serie): ${d.serie || 'N/A'}`, 20, 76);
  doc.text(`Departamento: ${d.departamento}`, 120, 58);
  doc.text(`Asignado a: ${d.usuario_responsable || 'N/A'}`, 120, 64);
  doc.text('Perifericos Entregados:', 20, 90);
  doc.setFontSize(10);
  doc.text(d.perifericos || 'No se registraron perifericos.', 20, 98);

  if (cambiosHardware.length > 0) {
    doc.text('Historial de Cambios de Hardware / Mejoras:', 20, 115);
    doc.autoTable({
      startY: 120,
      head: [['Fecha', 'Componente Modificado/Agregado', 'Detalle/Notas']],
      body: cambiosHardware.map(h => [new Date(h.fecha).toLocaleDateString(), h.falla, h.solucion || 'Realizado']),
      theme: 'grid',
      headStyles: { fillColor: [13, 20, 36] }
    });
  }

  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 30 : 150;
  doc.line(20, finalY, 90, finalY);
  doc.text('Firma del Tecnico', 35, finalY + 5);
  doc.line(120, finalY, 190, finalY);
  doc.text('Firma del Usuario (Recibe)', 130, finalY + 5);
  doc.save(`Nota_Entrega_${d.serie || d.id}.pdf`);
  showToast('Nota de Entrega generada exitosamente');
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
  if (d.estado === 'Bloqueado') return showToast('El equipo esta bloqueado. Debes desbloquearlo primero.', true);
  
  currentMaintenanceDeviceId = id;
  const nombreTecnico = currentUser ? currentUser.nombre : 'Desconocido';
  maintenanceDeviceInfo.innerHTML = `Equipo: <b>${escapeHtml(d.fabricante)} ${escapeHtml(d.modelo)}</b><br><span style="color:var(--accent); font-weight:600; font-size:0.75rem;">Tecnico en sesion: ${escapeHtml(nombreTecnico)}</span>`;
  maintenanceForm.reset();
  maintenanceHistoryBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Cargando historial...</td></tr>`;
  maintenanceModalOverlay.classList.add('active');

  try {
    const historial = await apiFetch(`/api/dispositivos/${id}/mantenimientos`);
    if (historial.length === 0) {
      maintenanceHistoryBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No hay mantenimientos previos.</td></tr>`;
    } else {
      let html = '';
      historial.forEach(h => {
        const fecha = new Date(h.fecha).toLocaleString('es-ES');
        const solucionHtml = `
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:0.75rem; color:${h.solucion ? 'var(--accent)' : 'var(--text-subtle)'}; ${!h.solucion ? 'font-style:italic;' : ''}">
              ${h.solucion ? escapeHtml(h.solucion) : 'Pendiente'}
            </span>
            <button class="btn-inline btn-agregar-solucion" data-id="${h.id}" data-solucion="${escapeHtml(h.solucion || '')}" title="Modificar Solucion">${SVG_PENCIL}</button>
          </div>
        `;
        html += `
          <tr>
            <td style="font-size:0.75rem;">${fecha}<br><span style="font-size:0.625rem; color:var(--text-subtle); text-transform:uppercase; letter-spacing:0.06em;">${h.tipo_mantenimiento || 'Falla'}</span></td>
            <td style="font-size:0.75rem; font-weight:600;">${escapeHtml(h.tecnico)}</td>
            <td style="font-size:0.75rem; color:var(--danger);">${escapeHtml(h.falla)}</td>
            <td>${solucionHtml}</td>
          </tr>
        `;
      });
      maintenanceHistoryBody.innerHTML = html;

      document.querySelectorAll('.btn-agregar-solucion').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const mantId = e.currentTarget.dataset.id;
          const actual = e.currentTarget.dataset.solucion;
          const solucion = prompt('Escribe o modifica la solucion aplicada:', actual);
          if (solucion !== null && solucion.trim() !== '') {
            if (contieneGroserias(solucion)) return showToast('La solucion contiene palabras no permitidas.', true);
            try {
              await apiFetch(`/api/mantenimientos/${mantId}/solucion`, { method: 'PUT', body: JSON.stringify({ solucion }) });
              showToast('Solucion guardada correctamente');
              openMaintenanceModal(currentMaintenanceDeviceId);
            } catch (err) { showToast(err.message, true); }
          }
        });
      });
    }
  } catch (err) {
    maintenanceHistoryBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--danger);">Error al cargar historial</td></tr>`;
  }
}

async function handleMaintenanceSubmit(e) {
  e.preventDefault();
  const falla = document.getElementById('falla').value.trim();
  const solucion = document.getElementById('solucion').value.trim();
  const tipo_mantenimiento = document.getElementById('tipo_mantenimiento').value;
  if (!falla) return showToast('La falla o componente es obligatorio', true);
  if (contieneGroserias(falla) || contieneGroserias(solucion)) return showToast('El texto contiene palabras no permitidas.', true);

  try {
    await apiFetch(`/api/dispositivos/${currentMaintenanceDeviceId}/mantenimientos`, { method: 'POST', body: JSON.stringify({ falla, solucion, tipo_mantenimiento }) });
    showToast('Reporte guardado correctamente');
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
  if (fieldSerie) fieldSerie.value = d.serie || '';
  fieldProcesador.value = d.procesador || '';
  fieldNucleos.value = d.nucleos || '';
  fieldFrecuencia.value = d.frecuencia || '';
  fieldRamTotal.value = d.ram_total || '';
  fieldDetallesRam.value = d.detalles_ram || '';
  if(fieldPerifericos) fieldPerifericos.value = d.perifericos || '';
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
    serie: fieldSerie ? fieldSerie.value.trim() : '',
    procesador: fieldProcesador.value.trim(), nucleos: fieldNucleos.value.trim(), frecuencia: fieldFrecuencia.value.trim(),
    ram_total: fieldRamTotal.value.trim(), detalles_ram: fieldDetallesRam.value.trim(),
    perifericos: fieldPerifericos ? fieldPerifericos.value.trim() : ''
  };

  if (!payload.departamento || !payload.tipo) return showToast('Departamento y Tipo son obligatorios', true);
  const camposAValidar = [payload.departamento, payload.usuario_responsable, payload.fabricante, payload.modelo, payload.procesador, payload.detalles_ram, payload.perifericos];
  for (let campo of camposAValidar) {
    if (contieneGroserias(campo)) return showToast('El formulario contiene palabras no permitidas.', true);
  }

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

function exportarExcel() {
  const filtered = getFilteredDevices();
  if (filtered.length === 0) { showToast('No hay equipos para exportar', true); return; }
  const fecha = new Date();
  const headers = ['Estado', 'Departamento', 'Usuario', 'Fabricante', 'Modelo', 'Tipo', 'Serie', 'Procesador', 'Núcleos/CPUs', 'Frecuencia CPU', 'RAM Capacidad Total', 'Detalles RAM / Ranuras / Velocidad', 'Periféricos'];
  let filasHtml = '';
  filtered.forEach((d, i) => {
    const zebra = i % 2 === 0 ? '#ffffff' : '#f7f9fd';
    filasHtml += `
      <tr style="background:${zebra};">
        <td style="border:1px solid #d6ddea; padding:6px 8px; font-size:11px;">${escapeHtml(d.estado || 'Activo')}</td>
        <td style="border:1px solid #d6ddea; padding:6px 8px; font-size:11px;">${escapeHtml(d.departamento)}</td>
        <td style="border:1px solid #d6ddea; padding:6px 8px; font-size:11px;">${escapeHtml(d.usuario_responsable)}</td>
        <td style="border:1px solid #d6ddea; padding:6px 8px; font-size:11px;">${escapeHtml(d.fabricante)}</td>
        <td style="border:1px solid #d6ddea; padding:6px 8px; font-size:11px;">${escapeHtml(d.modelo)}</td>
        <td style="border:1px solid #d6ddea; padding:6px 8px; font-size:11px;">${escapeHtml(d.tipo)}</td>
        <td style="border:1px solid #d6ddea; padding:6px 8px; font-size:11px;">${escapeHtml(d.serie)}</td>
        <td style="border:1px solid #d6ddea; padding:6px 8px; font-size:11px;">${escapeHtml(d.procesador)}</td>
        <td style="border:1px solid #d6ddea; padding:6px 8px; font-size:11px;">${escapeHtml(d.nucleos)}</td>
        <td style="border:1px solid #d6ddea; padding:6px 8px; font-size:11px;">${escapeHtml(d.frecuencia)}</td>
        <td style="border:1px solid #d6ddea; padding:6px 8px; font-size:11px;">${escapeHtml(d.ram_total)}</td>
        <td style="border:1px solid #d6ddea; padding:6px 8px; font-size:11px;">${escapeHtml(d.detalles_ram)}</td>
        <td style="border:1px solid #d6ddea; padding:6px 8px; font-size:11px;">${escapeHtml(d.perifericos)}</td>
      </tr>
    `;
  });
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><style>table { border-collapse: collapse; }</style></head><body><table><tr><td colspan="13" style="background:#0D1424; color:white; font-size:16px; font-weight:bold; padding:12px; text-align:center; border:1px solid #00E0FF;">INVENTARIO GENERAL DE EQUIPOS DE COMPUTO Y HARDWARE</td></tr><tr><td colspan="13" style="background:#E8ECF1; color:#1A1A1A; font-size:10px; padding:6px; text-align:center; border:1px solid #5A6478;">Reporte generado el ${fecha.toLocaleDateString()} - Total equipos: ${filtered.length}</td></tr><tr><td colspan="13" style="height:8px;"></td></tr><tr>${headers.map(h => `<th style="background:#0D1424; color:white; font-size:11px; padding:8px; border:1px solid #00E0FF; text-transform:uppercase;">${h}</th>`).join('')}</tr>${filasHtml}<tr><td colspan="13" style="height:10px;"></td></tr><tr><td colspan="13" style="background:#f2f2f2; color:#666; font-size:10px; padding:6px; text-align:center; border:1px solid #ccc;">TOTAL EQUIPOS REGISTRADOS: ${filtered.length}</td></tr></table></body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `inventario_${fecha.toISOString().slice(0, 10)}.xls`;
  link.click(); URL.revokeObjectURL(link.href); showToast(`Exportados ${filtered.length} equipos`);
}

function parsearCSV(texto) {
  const sep = (texto.split(/\r?\n/)[0].match(/;/g) || []).length > 0 ? ';' : ',';
  const lineas = texto.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lineas.length < 2) return [];
  function parseLinea(l) {
    const res = []; let act = ''; let com = false;
    for (let i = 0; i < l.length; i++) {
      if (l[i] === '"') { if (com && l[i+1] === '"') { act += '"'; i++; } else com = !com; }
      else if (l[i] === sep && !com) { res.push(act); act = ''; }
      else { act += l[i]; }
    }
    res.push(act);
    return res;
  }
  const cabeceras = parseLinea(lineas[0]);
  return lineas.slice(1).map(l => {
    const celdas = parseLinea(l);
    const obj = {};
    cabeceras.forEach((c, i) => obj[c] = celdas[i] || '');
    return obj;
  });
}

function procesarFilas(filasCrudas) {
  return filasCrudas.map((fila, idx) => {
    const datos = {};
    Object.keys(fila).forEach(col => {
      const clave = mapearColumna(col);
      if (clave) datos[clave] = String(fila[col] ?? '').trim();
    });
    let tipoExcel = String(datos.tipo || '').trim();
    let tipoCanon = TIPOS_VALIDOS.find(t => normalizar(t) === normalizar(tipoExcel));
    if (!tipoCanon) tipoCanon = 'Otro';

    const dispositivo = {
      departamento: datos.departamento || '', usuario_responsable: datos.usuario_responsable || '',
      fabricante: datos.fabricante || '', modelo: datos.modelo || '', tipo: tipoCanon,
      estado: datos.estado || 'Disponible',
      serie: datos.serie || '',
      procesador: datos.procesador || '', nucleos: datos.nucleos || '',
      frecuencia: datos.frecuencia || '', ram_total: datos.ram_total || '', detalles_ram: datos.detalles_ram || '',
      perifericos: datos.perifericos || ''
    };
    const errores = [];
    if (!dispositivo.departamento) errores.push('Falta Departamento');
    return { numero: idx + 1, dispositivo, valido: errores.length === 0, errores };
  });
}

function mostrarPrevisualizacion(resultados) {
  const validos = resultados.filter(r => r.valido).length;
  const invalidos = resultados.length - validos;
  importSummary.innerHTML = `Se detectaron <b>${resultados.length}</b> fila(s): <span style="color:var(--success); font-weight:600;">${validos} valida(s)</span>${invalidos > 0 ? ` - <span style="color:var(--danger); font-weight:600;">${invalidos} con errores</span>` : ''}.`;
  if (resultados.length === 0) {
    importPreviewBody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:2rem; color:var(--text-muted);">No se encontraron filas.</td></tr>`;
    confirmImportBtn.disabled = true;
    return;
  }

  const estados = ['Activo', 'Mantenimiento', 'Disponible', 'Activo con fallas', 'Baja'];

  let html = '';
  resultados.forEach(r => {
    const d = r.dispositivo;
    const optionsHtml = estados.map(est => `<option value="${est}" ${est === d.estado ? 'selected' : ''}>${est}</option>`).join('');

    html += `<tr style="${r.valido ? '' : 'background:rgba(244,63,94,0.08);'}">
      <td>${r.numero}</td>
      <td>${escapeHtml(d.departamento)}</td>
      <td>${escapeHtml(d.usuario_responsable)}</td>
      <td>${escapeHtml(d.fabricante)}</td>
      <td>${escapeHtml(d.modelo)}</td>
      <td>${escapeHtml(d.tipo)}</td>
      <td><select class="import-state-select" data-index="${r.numero - 1}" style="padding:0.35rem 0.5rem; border-radius:4px; border:1px solid var(--glass-border); background:rgba(0,0,0,0.25); color:var(--text); font-size:0.75rem; font-family:var(--font-sans);">${optionsHtml}</select></td>
      <td>${escapeHtml(d.procesador)}</td>
      <td>${escapeHtml(d.nucleos)}</td>
      <td>${escapeHtml(d.frecuencia)}</td>
      <td>${escapeHtml(d.ram_total)}</td>
      <td>${r.valido ? `<span class="import-ok">${SVG_CHECK}OK</span>` : `<span class="import-error" title="${escapeHtml(r.errores.join(', '))}">${SVG_X}Error</span>`}</td>
    </tr>`;
  });
  importPreviewBody.innerHTML = html;
  confirmImportBtn.disabled = validos === 0;

  globalImportState.value = resultados[0].dispositivo.estado;
  globalImportState.addEventListener('change', (e) => {
    const selected = e.target.value;
    document.querySelectorAll('.import-state-select').forEach(sel => sel.value = selected);
  });
}

async function manejarArchivoSeleccionado(file) {
  if (!file) return;
  const nombre = file.name.toLowerCase();
  try {
    let filasCrudas = [];
    if (nombre.endsWith('.csv')) {
      const texto = await file.text();
      filasCrudas = parsearCSV(texto);
    } else if (nombre.endsWith('.xlsx') || nombre.endsWith('.xls')) {
      if (typeof XLSX === 'undefined') { showToast('Error: No se pudo cargar la libreria para leer Excel.', true); return; }
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      const matrizCruda = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '' });
      let indiceFilaEncabezado = -1;
      for (let i = 0; i < matrizCruda.length; i++) {
        const fila = matrizCruda[i].map(c => normalizar(String(c)));
        if (fila.includes('departamento') || fila.includes('modelo') || fila.includes('fabricante')) { indiceFilaEncabezado = i; break; }
      }
      if (indiceFilaEncabezado === -1) { showToast('No se encontraron los encabezados en el archivo.', true); return; }
      const encabezados = matrizCruda[indiceFilaEncabezado];
      const filasDatos = matrizCruda.slice(indiceFilaEncabezado + 1);
      filasCrudas = filasDatos.map(filaArray => {
        const obj = {};
        encabezados.forEach((encabezado, index) => {
          if (encabezado && String(encabezado).trim() !== '') {
            obj[String(encabezado).trim()] = filaArray[index] !== undefined ? filaArray[index] : '';
          }
        });
        return obj;
      });
    } else {
      showToast('Formato no soportado. Usa .xls, .xlsx o .csv', true); return;
    }
    filasCrudas = filasCrudas.filter(fila => Object.values(fila).some(v => String(v).trim() !== ''));
    if (filasCrudas.length === 0) { showToast('El archivo esta vacio.', true); return; }
    importRows = procesarFilas(filasCrudas);
    mostrarPrevisualizacion(importRows);
    importModalOverlay.classList.add('active');
  } catch (err) {
    showToast('Error al leer archivo: ' + err.message, true);
  } finally {
    importFileInput.value = '';
  }
}

async function confirmarImportacion() {
  const validas = importRows.filter(r => r.valido);
  if (validas.length === 0) return;

  confirmImportBtn.disabled = true;
  confirmImportBtn.textContent = `Importando...`;

  const selects = document.querySelectorAll('.import-state-select');
  selects.forEach(sel => {
    const idx = parseInt(sel.dataset.index);
    if(importRows[idx]) importRows[idx].dispositivo.estado = sel.value;
  });

  let ok = 0, fail = 0, primerErrorMsg = '';
  for (let i = 0; i < validas.length; i++) {
    try {
      await apiFetch('/api/dispositivos', { method: 'POST', body: JSON.stringify(validas[i].dispositivo) });
      ok++;
    } catch (err) { fail++; if (!primerErrorMsg) primerErrorMsg = err.message; }
    confirmImportBtn.textContent = `Importando ${i + 1}/${validas.length}...`;
  }
  confirmImportBtn.disabled = false;
  confirmImportBtn.textContent = 'Importar';
  importModalOverlay.classList.remove('active');
  importFileInput.value = '';
  importRows = [];
  if (fail === 0) showToast(`${ok} equipos importados exitosamente`);
  else showToast(`Fallaron ${fail} equipos. Motivo: ${primerErrorMsg}`, true);
  await cargarDispositivos();
}

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

  configBtn.addEventListener('click', abrirModalConfig);
  closeConfigModalBtn.addEventListener('click', () => configModalOverlay.classList.remove('active'));
  configModalOverlay.addEventListener('click', (e) => { if (e.target === configModalOverlay) configModalOverlay.classList.remove('active'); });
  saveDiasBtn.addEventListener('click', async () => {
    try {
      await apiFetch('/api/configuracion/dias', { method: 'POST', body: JSON.stringify({ dias: configDias.value }) });
      showToast('Dias actualizados y equipos re-evaluados');
      await cargarDispositivos();
    } catch (err) { showToast(err.message, true); }
  });
  festivoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/festivos', { method: 'POST', body: JSON.stringify({ fecha: document.getElementById('festivoFecha').value, nombre: document.getElementById('festivoNombre').value }) });
      festivoForm.reset();
      abrirModalConfig();
    } catch (err) { showToast(err.message, true); }
  });

  notifBellBtn.addEventListener('click', () => notifDropdown.classList.toggle('active'));
  closeNotifBtn.addEventListener('click', () => notifDropdown.classList.remove('active'));
  document.addEventListener('click', (e) => {
    if (!notifBellBtn.contains(e.target) && !notifDropdown.contains(e.target)) notifDropdown.classList.remove('active');
  });

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
    const nueva = document.getElementById('passNueva').value;
    const confirmar = document.getElementById('passConfirmar').value;
    if (nueva !== confirmar) return showToast('Las contrasenas no coinciden', true);
    if (nueva.length < 6) return showToast('Minimo 6 caracteres', true);
    try {
      await apiFetch('/api/cambiar-password', { method: 'POST', body: JSON.stringify({ passwordActual: document.getElementById('passActual').value, passwordNueva: nueva }) });
      showToast('Contrasena actualizada');
      passwordModalOverlay.classList.remove('active');
    } catch (err) { showToast(err.message, true); }
  });

  logoutBtn.addEventListener('click', () => {
    mostrarConfirmacion('Estas seguro de que deseas cerrar sesion?', async () => {
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = '/login.html';
    });
  });

  importExcelBtn.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', (e) => manejarArchivoSeleccionado(e.target.files[0]));
  cancelImportBtn.addEventListener('click', () => { importModalOverlay.classList.remove('active'); importFileInput.value = ''; importRows = []; });
  importModalOverlay.addEventListener('click', (e) => { if (e.target === importModalOverlay) { importModalOverlay.classList.remove('active'); importFileInput.value = ''; importRows = []; } });
  confirmImportBtn.addEventListener('click', confirmarImportacion);

  closeQrModalBtn.addEventListener('click', () => qrModalOverlay.classList.remove('active'));
  qrModalOverlay.addEventListener('click', (e) => { if (e.target === qrModalOverlay) qrModalOverlay.classList.remove('active'); });
  downloadQrBtn.addEventListener('click', () => {
    const canvas = qrcodeContainer.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `QR_${qrDeviceInfo.textContent.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalOverlay.classList.contains('active')) closeModal();
      if (usersModalOverlay.classList.contains('active')) usersModalOverlay.classList.remove('active');
      if (passwordModalOverlay.classList.contains('active')) closePasswordModalBtn.click();
      if (importModalOverlay.classList.contains('active')) { importModalOverlay.classList.remove('active'); importFileInput.value = ''; importRows = []; }
      if (maintenanceModalOverlay.classList.contains('active')) closeMaintenanceModal();
      if (confirmModalOverlay.classList.contains('active')) cerrarConfirmacion();
      if (qrModalOverlay.classList.contains('active')) qrModalOverlay.classList.remove('active');
      if (configModalOverlay.classList.contains('active')) configModalOverlay.classList.remove('active');
      if (notifDropdown.classList.contains('active')) notifDropdown.classList.remove('active');
    }
  });
}

(async function init() {
  try {
    const data = await fetch('/api/session').then(r => r.json());
    if (!data.autenticado) { window.location.href = '/login.html'; return; }
    currentUser = data.usuario;
    
    document.getElementById('userName').textContent = currentUser.nombre;
    document.getElementById('userRole').textContent = currentUser.rol === 'usuario' ? 'Técnico' : 'Administrador';
    document.getElementById('userAvatar').textContent = currentUser.nombre.charAt(0).toUpperCase();
    
    if (currentUser.rol === 'admin') { 
      manageUsersBtn.style.display = 'flex';
      configBtn.style.display = 'flex'; 
    }
  } catch { window.location.href = '/login.html'; }

  initEvents();
  await cargarDispositivos();
  await cargarNotificaciones(true);
  
  setInterval(() => { 
    cargarDispositivos(true); 
  }, 10000);
  
  setInterval(() => {
    cargarNotificaciones();
  }, 5000);
})();