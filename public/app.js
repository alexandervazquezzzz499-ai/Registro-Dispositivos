// ---------- ESTADO GLOBAL ----------
let devices = [];
let currentUser = null;
let isAdmin = false;

// ---------- REFERENCIAS DOM ----------
const tableBody = document.getElementById('deviceTableBody');
const emptyMessage = document.getElementById('emptyMessage');
const totalCountSpan = document.getElementById('totalCount');
const searchInput = document.getElementById('searchInput');
const filterType = document.getElementById('filterType');
const filterStatus = document.getElementById('filterStatus');
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const deviceForm = document.getElementById('deviceForm');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const toast = document.getElementById('toast');

const passwordModalOverlay = document.getElementById('passwordModalOverlay');
const passwordForm = document.getElementById('passwordForm');
const closePasswordModalBtn = document.getElementById('closePasswordModalBtn');
const changePasswordBtn = document.getElementById('changePasswordBtn');
const logoutBtn = document.getElementById('logoutBtn');

const usersModalOverlay = document.getElementById('usersModalOverlay');
const usersList = document.getElementById('usersList');
const userForm = document.getElementById('userForm');
const manageUsersBtn = document.getElementById('manageUsersBtn');
const closeUsersModalBtn = document.getElementById('closeUsersModalBtn');

// Campos del formulario de dispositivo
const fieldId = document.getElementById('deviceId');
const fieldName = document.getElementById('name');
const fieldType = document.getElementById('type');
const fieldStatus = document.getElementById('status');
const fieldBrand = document.getElementById('brand');
const fieldModel = document.getElementById('model');
const fieldSerial = document.getElementById('serial');
const fieldLocation = document.getElementById('location');

// ---------- UTILIDADES ----------
function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getStatusBadgeClass(status) {
  const map = {
    'Activo': 'badge-activo',
    'Mantenimiento': 'badge-mantenimiento',
    'Baja': 'badge-baja',
    'Disponible': 'badge-disponible',
    'Asignado': 'badge-asignado'
  };
  return map[status] || 'badge-activo';
}

function getDeviceIcon(type) {
  const icons = {
    'Portátil': '💻', 'Escritorio': '🖥️', 'Monitor': '🖥️',
    'Impresora': '🖨️', 'Servidor': '🗄️', 'Tablet': '📱',
    'Smartphone': '📱', 'Router': '📡', 'Otro': '📟'
  };
  return icons[type] || '📟';
}

// ---------- API ----------
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (res.status === 401) {
    window.location.href = '/login.html';
    throw new Error('No autorizado');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error en la petición');
  return data;
}

async function cargarDispositivos() {
  try {
    devices = await apiFetch('/api/dispositivos');
    renderTable();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ---------- RENDER ----------
function getFilteredDevices() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const typeFilter = filterType.value;
  const statusFilter = filterStatus.value;

  return devices.filter(device => {
    if (searchTerm) {
      const match =
        device.nombre.toLowerCase().includes(searchTerm) ||
        (device.marca && device.marca.toLowerCase().includes(searchTerm)) ||
        (device.modelo && device.modelo.toLowerCase().includes(searchTerm)) ||
        (device.serial && device.serial.toLowerCase().includes(searchTerm)) ||
        (device.ubicacion && device.ubicacion.toLowerCase().includes(searchTerm));
      if (!match) return false;
    }
    if (typeFilter && device.tipo !== typeFilter) return false;
    if (statusFilter && device.estado !== statusFilter) return false;
    return true;
  });
}

function renderTable() {
  const filtered = getFilteredDevices();
  totalCountSpan.textContent = devices.length;

  if (filtered.length === 0) {
    tableBody.innerHTML = '';
    emptyMessage.style.display = 'block';
    return;
  }
  emptyMessage.style.display = 'none';

  let html = '';
  filtered.forEach(device => {
    const badgeClass = getStatusBadgeClass(device.estado);
    const icon = getDeviceIcon(device.tipo);
    const deleteBtn = isAdmin
      ? `<button class="btn-icon delete" data-id="${device.id}" title="Eliminar">🗑️</button>`
      : '';
    html += `
      <tr data-id="${device.id}">
        <td>
          <div class="device-name">
            <div class="device-icon">${icon}</div>
            <span>${escapeHtml(device.nombre)}</span>
          </div>
        </td>
        <td>${escapeHtml(device.tipo)}</td>
        <td>${escapeHtml(device.marca || '—')}${device.modelo ? ' / ' + escapeHtml(device.modelo) : ''}</td>
        <td>${escapeHtml(device.serial || '—')}</td>
        <td>${escapeHtml(device.ubicacion || '—')}</td>
        <td><span class="badge ${badgeClass}">${escapeHtml(device.estado)}</span></td>
        <td>
          <div class="actions">
            <button class="btn-icon edit" data-id="${device.id}" title="Editar">✏️</button>
            ${deleteBtn}
          </div>
        </td>
      </tr>
    `;
  });
  tableBody.innerHTML = html;

  document.querySelectorAll('.btn-icon.edit').forEach(btn => {
    btn.addEventListener('click', (e) => openEditModal(e.currentTarget.dataset.id));
  });

  document.querySelectorAll('.btn-icon.delete').forEach(btn => {
    btn.addEventListener('click', (e) => deleteDevice(e.currentTarget.dataset.id));
  });
}

// ---------- CRUD DISPOSITIVOS ----------
function openNewModal() {
  modalTitle.textContent = 'Agregar dispositivo';
  deviceForm.reset();
  fieldId.value = '';
  fieldType.value = 'Portátil';
  fieldStatus.value = 'Activo';
  modalOverlay.classList.add('active');
}

function openEditModal(id) {
  const device = devices.find(d => String(d.id) === String(id));
  if (!device) return;

  modalTitle.textContent = 'Editar dispositivo';
  fieldId.value = device.id;
  fieldName.value = device.nombre || '';
  fieldType.value = device.tipo || 'Portátil';
  fieldStatus.value = device.estado || 'Activo';
  fieldBrand.value = device.marca || '';
  fieldModel.value = device.modelo || '';
  fieldSerial.value = device.serial || '';
  fieldLocation.value = device.ubicacion || '';

  modalOverlay.classList.add('active');
}

function closeModal() {
  modalOverlay.classList.remove('active');
  deviceForm.reset();
  fieldId.value = '';
}

async function deleteDevice(id) {
  const device = devices.find(d => String(d.id) === String(id));
  if (!device) return;
  if (!confirm(`¿Estás seguro de eliminar "${device.nombre}"?`)) return;

  try {
    await apiFetch(`/api/dispositivos/${id}`, { method: 'DELETE' });
    showToast('Dispositivo eliminado');
    await cargarDispositivos();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const id = fieldId.value;
  const payload = {
    nombre: fieldName.value.trim(),
    tipo: fieldType.value,
    estado: fieldStatus.value,
    marca: fieldBrand.value.trim(),
    modelo: fieldModel.value.trim(),
    serial: fieldSerial.value.trim(),
    ubicacion: fieldLocation.value.trim()
  };

  if (!payload.nombre || !payload.tipo || !payload.estado) {
    showToast('Completa los campos obligatorios', true);
    return;
  }

  try {
    if (id) {
      await apiFetch(`/api/dispositivos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Dispositivo actualizado');
    } else {
      await apiFetch('/api/dispositivos', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Dispositivo agregado');
    }
    closeModal();
    await cargarDispositivos();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ---------- SESIÓN ----------
async function cargarSesion() {
  try {
    const data = await fetch('/api/session').then(r => r.json());
    if (!data.autenticado) {
      window.location.href = '/login.html';
      return;
    }
    currentUser = data.usuario;
    isAdmin = currentUser.rol === 'admin';

    document.getElementById('userName').textContent = currentUser.nombre;
    document.getElementById('userRole').textContent = currentUser.rol;
    document.getElementById('userAvatar').textContent = currentUser.nombre.charAt(0).toUpperCase();

    if (isAdmin) {
      manageUsersBtn.style.display = 'inline-flex';
    }
  } catch {
    window.location.href = '/login.html';
  }
}

async function cerrarSesion() {
  if (!confirm('¿Cerrar sesión?')) return;
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login.html';
}

// ---------- CAMBIO DE CONTRASEÑA (propia) ----------
function openPasswordModal() {
  passwordForm.reset();
  passwordModalOverlay.classList.add('active');
}

function closePasswordModal() {
  passwordModalOverlay.classList.remove('active');
  passwordForm.reset();
}

async function handlePasswordSubmit(e) {
  e.preventDefault();

  const actual = document.getElementById('passActual').value;
  const nueva = document.getElementById('passNueva').value;
  const confirmar = document.getElementById('passConfirmar').value;

  if (nueva !== confirmar) {
    showToast('Las contraseñas no coinciden', true);
    return;
  }
  if (nueva.length < 6) {
    showToast('La contraseña debe tener al menos 6 caracteres', true);
    return;
  }

  try {
    await apiFetch('/api/cambiar-password', {
      method: 'POST',
      body: JSON.stringify({ passwordActual: actual, passwordNueva: nueva })
    });
    showToast('Contraseña actualizada');
    closePasswordModal();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ---------- GESTIÓN DE USUARIOS (admin) ----------
async function openUsersModal() {
  usersModalOverlay.classList.add('active');
  await cargarUsuarios();
}

function closeUsersModal() {
  usersModalOverlay.classList.remove('active');
  userForm.reset();
}

async function cargarUsuarios() {
  try {
    const usuarios = await apiFetch('/api/usuarios');
    renderUsers(usuarios);
  } catch (err) {
    showToast(err.message, true);
  }
}

function renderUsers(usuarios) {
  if (!usuarios || usuarios.length === 0) {
    usersList.innerHTML = '<p style="color:#8f9eb2;text-align:center;padding:1rem;">No hay usuarios registrados</p>';
    return;
  }

  usersList.innerHTML = usuarios.map(u => {
    const badgeClass = u.rol === 'admin' ? 'badge-admin' : 'badge-tecnico';
    const esYo = String(u.id) === String(currentUser.id);
    const deleteBtn = esYo
      ? '<span class="badge badge-self">Tú</span>'
      : `<button class="btn-icon delete" data-id="${u.id}" data-nombre="${escapeHtml(u.nombre)}" title="Eliminar">🗑️</button>`;
    return `
      <div class="user-card">
        <div>
          <strong>${escapeHtml(u.nombre)}</strong>
          <span class="user-card-username">@${escapeHtml(u.usuario)}</span>
          <span class="badge ${badgeClass}">${escapeHtml(u.rol)}</span>
        </div>
        ${deleteBtn}
      </div>
    `;
  }).join('');

  usersList.querySelectorAll('.btn-icon.delete').forEach(btn => {
    btn.addEventListener('click', () => deleteUser(btn.dataset.id, btn.dataset.nombre));
  });
}

async function deleteUser(id, nombre) {
  if (!confirm(`¿Eliminar al usuario "${nombre}"?`)) return;
  try {
    await apiFetch(`/api/usuarios/${id}`, { method: 'DELETE' });
    showToast('Usuario eliminado');
    await cargarUsuarios();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function handleUserFormSubmit(e) {
  e.preventDefault();
  const payload = {
    usuario: document.getElementById('newUserUsuario').value.trim(),
    nombre: document.getElementById('newUserNombre').value.trim(),
    password: document.getElementById('newUserPassword').value,
    rol: document.getElementById('newUserRol').value
  };

  if (!payload.usuario || !payload.nombre || !payload.password) {
    showToast('Completa todos los campos', true);
    return;
  }

  try {
    await apiFetch('/api/usuarios', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    showToast('Usuario creado correctamente');
    userForm.reset();
    await cargarUsuarios();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ---------- EVENTOS ----------
function initEvents() {
  openModalBtn.addEventListener('click', openNewModal);
  closeModalBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  deviceForm.addEventListener('submit', handleFormSubmit);

  searchInput.addEventListener('input', renderTable);
  filterType.addEventListener('change', renderTable);
  filterStatus.addEventListener('change', renderTable);

  changePasswordBtn.addEventListener('click', openPasswordModal);
  closePasswordModalBtn.addEventListener('click', closePasswordModal);
  passwordModalOverlay.addEventListener('click', (e) => {
    if (e.target === passwordModalOverlay) closePasswordModal();
  });
  passwordForm.addEventListener('submit', handlePasswordSubmit);

  if (isAdmin) {
    manageUsersBtn.addEventListener('click', openUsersModal);
    closeUsersModalBtn.addEventListener('click', closeUsersModal);
    usersModalOverlay.addEventListener('click', (e) => {
      if (e.target === usersModalOverlay) closeUsersModal();
    });
    userForm.addEventListener('submit', handleUserFormSubmit);
  }

  logoutBtn.addEventListener('click', cerrarSesion);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalOverlay.classList.contains('active')) closeModal();
      if (passwordModalOverlay.classList.contains('active')) closePasswordModal();
      if (usersModalOverlay.classList.contains('active')) closeUsersModal();
    }
  });
}

// ---------- INICIALIZACIÓN ----------
(async function init() {
  await cargarSesion();
  initEvents();
  await cargarDispositivos();
})();