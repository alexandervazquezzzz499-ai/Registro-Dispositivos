let devices = [];
let currentUser = null;
let importRows = [];
let currentMaintenanceDeviceId = null;

// 🚫 LISTA DE PALABRAS GROSERAS
const PALABRAS_GROSERAS = ['puta', 'mierda', 'pendejo', 'cabron', 'cabrón', 'verga', 'coño', 'joder', 'estupido', 'estúpido', 'idiota', 'culero', 'marico', 'maricón', 'zorra', 'perra', 'gonorrea', 'malparido', 'hijueputa', 'imbecil', 'imbécil'];

// DOM Elements
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
const fieldSerie = document.getElementById('serie'); 
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
    'detalles ram / ranuras / velocidad': 'detalles_ram', 'detalles ram': 'detalles_ram', 'ram detalles': 'detalles_ram'
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
  btnAceptar.style.backgroundColor = esEliminar ? '#dc2626' : '#2a6df4';
  btnAceptar.onclick = () => {
    confirmModalOverlay.classList.remove('active');
    callbackAceptar();
  };
  confirmModalOverlay.classList.add('active');
}

function cerrarConfirmacion() { confirmModalOverlay.classList.remove('active'); }

async function abrirModalUsuarios() {
  usersModalOverlay.classList.add('active');
  usersTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Cargando usuarios...</td></tr>`;
  try {
    const users = await apiFetch('/api/usuarios');
    let html = '';
    users.forEach(u => {
      const fecha = new Date(u.creado_en).toLocaleDateString();
      html += `<tr><td>${u.id}</td><td style="font-weight:600;">${escapeHtml(u.usuario)}</td><td>${escapeHtml(u.nombre)}</td><td>${u.rol === 'admin' ? '<span class="badge badge-disponible">Admin</span>' : '<span class="badge badge-activo">Usuario</span>'}</td><td style="color:var(--text-muted);">${fecha}</td></tr>`;
    });
    usersTableBody.innerHTML = html;
  } catch (err) { usersTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Error al cargar usuarios</td></tr>`; }
}

async function handleNewUserSubmit(e) {
  e.preventDefault();
  const nombre = document.getElementById('newUserNombre').value.trim();
  const usuario = document.getElementById('newUserUsername').value.trim();
  
  if (contieneGroserias(nombre) || contieneGroserias(usuario)) {
    return showToast('El nombre o usuario contiene palabras no permitidas.', true);
  }

  const payload = {
    nombre: nombre, usuario: usuario,
    password: document.getElementById('newUserPassword').value,
    rol: document.getElementById('newUserRol').value
  };
  try {
    await apiFetch('/api/usuarios', { method: 'POST', body: JSON.stringify(payload) });
    showToast('Usuario creado exitosamente');
    newUserForm.reset();
    abrirModalUsuarios();
  } catch (err) { showToast(err.message, true); }
}

async function cargarDispositivos(silencioso = false) {
  try {
    if (silencioso && (document.querySelector('.modal-overlay.active') || document.activeElement.tagName === 'INPUT')) {
      return; 
    }
    devices = await apiFetch('/api/dispositivos');
    renderTable();
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
                    (d.serie && d.serie.toLowerCase().includes(searchTerm));
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
        <td>—</td>
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
    mostrarConfirmacion(`¿Estás seguro de eliminar el equipo <b>${escapeHtml(d.modelo)}</b> de ${escapeHtml(d.departamento)}?`, () => { eliminarDispositivo(id); }, true);
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
  }
}

async function handleMaintenanceSubmit(e) {
  e.preventDefault();
  const falla = document.getElementById('falla').value.trim();
  const solucion = document.getElementById('solucion').value.trim();
  
  if (!falla || !solucion) return showToast('Falla y Solución son obligatorios', true);
  
  if (contieneGroserias(falla) || contieneGroserias(solucion)) {
    return showToast('El texto contiene palabras no permitidas.', true);
  }

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
  if (fieldSerie) fieldSerie.value = d.serie || '';
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
    serie: fieldSerie ? fieldSerie.value.trim() : '',
    procesador: fieldProcesador.value.trim(), nucleos: fieldNucleos.value.trim(), frecuencia: fieldFrecuencia.value.trim(),
    ram_total: fieldRamTotal.value.trim(), detalles_ram: fieldDetallesRam.value.trim()
  };
  
  if (!payload.departamento || !payload.tipo) return showToast('Departamento y Tipo son obligatorios', true);

  const camposAValidar = [payload.departamento, payload.usuario_responsable, payload.fabricante, payload.modelo, payload.procesador, payload.detalles_ram];
  for (let campo of camposAValidar) {
    if (contieneGroserias(campo)) {
      return showToast('El formulario contiene palabras no permitidas.', true);
    }
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
  const headers = ['Estado', 'Departamento', 'Usuario', 'Fabricante', 'Modelo', 'Tipo', 'Serie', 'Procesador', 'Núcleos/CPUs', 'Frecuencia CPU', 'RAM Capacidad Total', 'Detalles RAM / Ranuras / Velocidad'];
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
      </tr>
    `;
  });
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><style>table { border-collapse: collapse; }</style></head><body><table><tr><td colspan="12" style="background:#1f4e78; color:white; font-size:16px; font-weight:bold; padding:12px; text-align:center; border:1px solid #143454;">INVENTARIO GENERAL DE EQUIPOS DE CÓMPUTO Y HARDWARE</td></tr><tr><td colspan="12" style="background:#ddebf7; color:#1e2b3c; font-size:10px; padding:6px; text-align:center; border:1px solid #b4c6e7;">Reporte generado el ${fecha.toLocaleDateString()} · Total equipos: ${filtered.length}</td></tr><tr><td colspan="12" style="height:8px;"></td></tr><tr>${headers.map(h => `<th style="background:#1f4e78; color:white; font-size:11px; padding:8px; border:1px solid #143454; text-transform:uppercase;">${h}</th>`).join('')}</tr>${filasHtml}<tr><td colspan="12" style="height:10px;"></td></tr><tr><td colspan="12" style="background:#f2f2f2; color:#666; font-size:10px; padding:6px; text-align:center; border:1px solid #ccc;">TOTAL EQUIPOS REGISTRADOS: ${filtered.length}</td></tr></table></body></html>`;
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
      estado: datos.estado || 'Activo', serie: datos.serie || '',
      procesador: datos.procesador || '', nucleos: datos.nucleos || '',
      frecuencia: datos.frecuencia || '', ram_total: datos.ram_total || '', detalles_ram: datos.detalles_ram || ''
    };
    const errores = [];
    if (!dispositivo.departamento) errores.push('Falta Departamento');
    return { numero: idx + 1, dispositivo, valido: errores.length === 0, errores };
  });
}

function mostrarPrevisualizacion(resultados) {
  const validos = resultados.filter(r => r.valido).length;
  const invalidos = resultados.length - validos;
  importSummary.innerHTML = `Se detectaron <b>${resultados.length}</b> fila(s): <span style="color:var(--success); font-weight:600;">${validos} válida(s)</span>${invalidos > 0 ? ` · <span style="color:var(--danger); font-weight:600;">${invalidos} con errores</span>` : ''}.`;
  if (resultados.length === 0) {
    importPreviewBody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:2rem; color:var(--text-muted);">No se encontraron filas.</td></tr>`;
    confirmImportBtn.disabled = true;
    return;
  }
  let html = '';
  resultados.forEach(r => {
    const d = r.dispositivo;
    html += `<tr style="${r.valido ? '' : 'background:#fff5f5;'}"><td>${r.numero}</td><td>${escapeHtml(d.departamento)}</td><td>${escapeHtml(d.usuario_responsable)}</td><td>${escapeHtml(d.fabricante)}</td><td>${escapeHtml(d.modelo)}</td><td>${escapeHtml(d.tipo)}</td><td>${escapeHtml(d.estado)}</td><td>${escapeHtml(d.procesador)}</td><td>${escapeHtml(d.nucleos)}</td><td>${escapeHtml(d.frecuencia)}</td><td>${escapeHtml(d.ram_total)}</td><td>${r.valido ? '<span class="import-ok">✔ OK</span>' : `<span class="import-error" title="${escapeHtml(r.errores.join(', '))}">✖ Error</span>`}</td></tr>`;
  });
  importPreviewBody.innerHTML = html;
  confirmImportBtn.disabled = validos === 0;
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
      if (typeof XLSX === 'undefined') { showToast('Error: No se pudo cargar la librería para leer Excel.', true); return; }
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      const matrizCruda = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '' });
      
      let indiceFilaEncabezado = -1;
      for (let i = 0; i < matrizCruda.length; i++) {
        const fila = matrizCruda[i].map(c => normalizar(String(c)));
        if (fila.includes('departamento') || fila.includes('modelo') || fila.includes('fabricante')) {
          indiceFilaEncabezado = i;
          break;
        }
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
    if (filasCrudas.length === 0) { showToast('El archivo está vacío.', true); return; }
    
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
  if (fail === 0) showToast(`✔ ${ok} equipos importados exitosamente`);
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
    if (currentUser.rol === 'admin') { manageUsersBtn.style.display = 'flex'; }
  } catch { window.location.href = '/login.html'; }
  
  initEvents();
  await cargarDispositivos();

  // ⏱️ AUTO-REFRESH CADA 10 SEGUNDOS
  setInterval(() => {
    cargarDispositivos(true);
  }, 10000);
})();