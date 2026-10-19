const { createClient } = supabase;
const supabaseUrl = 'https://rgwawwdldqodzmsizean.supabase.co'; 
const supabaseKey = 'sb_publishable_-4Q07zNvB5Ep9fLwIZW6Yw_axmOPTM7';
const polarDb = createClient(supabaseUrl, supabaseKey);

function switchTab(tabId) {
  const panelMenu = document.getElementById('panel-menu');
  const overlay = document.getElementById('panel-overlay');
  if (panelMenu && panelMenu.classList.contains('open')) {
      panelMenu.classList.remove('open');
      if (overlay) overlay.classList.remove('active');
  }

  let isAlreadyActive = false;
  const navBtn = document.getElementById('nav-' + tabId);
  if (navBtn && navBtn.classList.contains('active') && tabId !== 'home') {
      isAlreadyActive = true;
  }

  if (isAlreadyActive) {
      tabId = 'home';
  }

  document.getElementById('main-calculator').style.display = 'none';
  document.getElementById('view-graficas').style.display = 'none';
  document.getElementById('view-buscador').style.display = 'none'; 
  document.getElementById('view-historial').style.display = 'none';
  document.getElementById('view-citas').style.display = 'none';
  document.getElementById('view-config').style.display = 'none';
  document.getElementById('view-avatars').style.display = 'none';
  document.getElementById('view-usuario').style.display = 'none';

  const radar = document.getElementById('radar-precision');
  if (radar) radar.style.display = 'none';

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  if (tabId === 'home') {
    document.getElementById('main-calculator').style.display = 'grid'; 
    if (radar) radar.style.display = 'block';
    document.getElementById('nav-home').classList.add('active');
    
    if(document.getElementById('glucosa').value !== '' || document.getElementById('carbos').value !== '') {
       calcular(true);
    }
  } 
  else if (tabId === 'graficas') {
    document.getElementById('view-graficas').style.display = 'block';
    document.getElementById('nav-graficas').classList.add('active');
    renderGraficoPicos();
  } 
  else if (tabId === 'buscador') {
    document.getElementById('view-buscador').style.display = 'block';
    document.getElementById('nav-buscador').classList.add('active');
  }
  else if (tabId === 'historial') {
    document.getElementById('view-historial').style.display = 'block';
    if (radar) radar.style.display = 'block';
    document.getElementById('nav-historial').classList.add('active');
    actualizarVistaHistorial();
  } 
  else if (tabId === 'citas') {
    document.getElementById('view-citas').style.display = 'block';
    document.getElementById('nav-citas').classList.add('active');
    renderCitas();
  } 
  else if (tabId === 'config') {
    document.getElementById('view-config').style.display = 'block';
    document.getElementById('nav-config').classList.add('active');
  }
  else if (tabId === 'avatars') {
    document.getElementById('view-avatars').style.display = 'block';
    renderAvatarPanel();
  }
  else if (tabId === 'usuario') {
    document.getElementById('view-usuario').style.display = 'block';
  }
}

function actualizarRadar() {
  const historial = JSON.parse(localStorage.getItem('historial_polar') || '[]');
  const listaRadar = document.getElementById('lista-radar');
  if (!listaRadar) return;
  
  const ultimosTres = historial.slice(-3).reverse();
  if (ultimosTres.length === 0) {
      listaRadar.innerHTML = '<p style="font-size: 13px; font-weight: 700; opacity: 0.6; text-align: center;">Sin registros recientes.</p>';
      return;
  }

  const dict = { 'desayuno': 'Desayuno', 'mam': 'Once', 'almuerzo': 'Almuerzo', 'mpm': 'Merienda', 'cena': 'Cena', 'corroborar': 'Revisión', 'post-comida': '2H Post' };

  listaRadar.innerHTML = ultimosTres.map(reg => {
      const nombreComida = dict[reg.tipoComida] || 'Manual';
      const partesFecha = reg.fecha.split(', ');
      const hora = partesFecha[1] || reg.fecha;
      let colorGlucosa = 'var(--text-primary)';
      if(reg.glucosa < 70) colorGlucosa = '#FF3B30';
      else if(reg.glucosa > 180) colorGlucosa = '#FF9F0A';
      else colorGlucosa = '#4CAF50';

      return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--bg-polar); border-radius: 12px; border: 1px solid var(--input-border);">
          <div style="display: flex; flex-direction: column;">
              <span style="font-size: 14px; font-weight: 900; color: var(--turquoise-strong); text-transform: uppercase;">${nombreComida}</span>
              <span style="font-size: 11px; font-weight: 800; color: var(--text-primary); opacity: 0.7;">${hora}</span>
          </div>
          <div style="text-align: right; display: flex; align-items: center; gap: 15px;">
              <div style="display: flex; flex-direction: column; align-items: flex-end;">
                  <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; opacity: 0.6;">Nivel</span>
                  <span style="font-size: 16px; font-weight: 900; color: ${colorGlucosa};">${reg.glucosa}</span>
              </div>
              <div style="display: flex; flex-direction: column; align-items: flex-end;">
                  <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; opacity: 0.6;">Dosis</span>
                  <span style="font-size: 18px; font-weight: 900; color: var(--text-primary); line-height: 1;">${reg.dosis}U</span>
              </div>
          </div>
      </div>`;
  }).join('');
}

async function sincronizarDatosNube() {
  const userId = localStorage.getItem('polar_user_id');
  if (!userId || userId.startsWith('local_')) return;

  try {
    await procesarColaOffline();

    const { data, error } = await polarDb
      .from('historial_polar')
      .select('*')
      .eq('paciente_id', userId)
      .order('created_at', { ascending: true }); 

    if (error) {
      console.warn("Sincronización en pausa (Modo Local Activo):", error.message);
      return;
    }

    if (data && data.length > 0) {
      const historialDescargado = data.map(dbItem => {
        const d = new Date(dbItem.created_at);
        return {
          fecha: d.toLocaleString('es-CL'),
          iso: d.toISOString().split('T')[0],
          dosis: dbItem.dosis,
          glucosa: dbItem.glucosa,
          carbos: dbItem.carbos,
          tipoComida: dbItem.tipo_comida,
          timestamp: d.getTime()
        };
      });

      localStorage.setItem('historial_polar', JSON.stringify(historialDescargado));

      if (typeof renderGraficoPicos === 'function') renderGraficoPicos();
      if (document.getElementById('view-historial').style.display === 'block') {
        if (typeof actualizarVistaHistorial === 'function') actualizarVistaHistorial();
      }
      actualizarRadar();
    }
  } catch (e) {
    console.warn("Operando en modo local sin conexión a Supabase.");
  }
}

async function procesarColaOffline() {
  if(!navigator.onLine) return;
  const userId = localStorage.getItem('polar_user_id');
  if (!userId || userId.startsWith('local_')) return;

  let cola = JSON.parse(localStorage.getItem('polar_cola_sync') || '[]');
  if(cola.length === 0) return;
  
  try {
    const { error } = await polarDb.from('historial_polar').insert(cola);
    if(!error) {
       localStorage.removeItem('polar_cola_sync');
    }
  } catch (e) {}
}
window.addEventListener('online', procesarColaOffline);

function activarSuscripcionTiempoReal() {
  const userId = localStorage.getItem('polar_user_id');
  if (!userId || userId.startsWith('local_')) return;

  try {
    polarDb.removeAllChannels();

    polarDb.channel('radar-familiar-elite')
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public', 
          table: 'historial_polar',
          filter: `paciente_id=eq.${userId}`
        },
        () => {
          sincronizarDatosNube();
        }
      )
      .subscribe();
  } catch (e) {}
}

async function revisarRegistrosAntiguos() {
  const userId = localStorage.getItem('polar_user_id');
  if (!userId || userId.startsWith('local_')) return;

  try {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 30);
    const isoFechaLimite = fechaLimite.toISOString().split('T')[0];

    const { data: registrosViejos, error: errorSelect } = await polarDb
      .from('historial_polar')
      .select('id, created_at')
      .eq('paciente_id', userId)
      .lt('created_at', isoFechaLimite);

    if (errorSelect) return;

    if (registrosViejos && registrosViejos.length > 0) {
      if (confirm(`Líder, tienes ${registrosViejos.length} registros con más de 30 días de antigüedad. ¿Deseas descargar el PDF mensual ahora antes de que se borren automáticamente para mantener el sistema optimizado?`)) {
          generarPDFElite();
      }

      const idsBorrar = registrosViejos.map(r => r.id);
      const { error: errorDelete } = await polarDb
        .from('historial_polar')
        .delete()
        .in('id', idsBorrar);

      if (!errorDelete) {
         await sincronizarDatosNube();
      }
    }
  } catch (e) {}
}

function verificarSesion() {
  const session = localStorage.getItem('polar_session_activa'); 
  if (session === 'true') {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
  } else {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
  }
}

// ACCESO BLINDADO: Entra por Supabase o activa Pase Directo Familiar si Supabase falla
async function validarAcceso() {
  const user = document.getElementById('login-user').value.trim().toLowerCase();
  const pass = document.getElementById('login-pass').value.trim();

  if (!user || !pass) {
    alert("Líder, la excelencia exige que llenes todos los datos.");
    return;
  }

  let data = null;
  let error = null;

  try {
    const respuesta = await polarDb.auth.signInWithPassword({
      email: user,
      password: pass,
    });
    data = respuesta.data;
    error = respuesta.error;
  } catch (err) {
    error = err;
  }

  if (error || !data || !data.user) {
    console.warn("Supabase no disponible o rechazó credenciales. Activando Acceso Directo Familiar:", error?.message || error);
    
    // Creamos un ID consistente para el usuario familiar en modo local
    const idFamiliar = 'local_' + user.replace(/[^a-z0-9]/g, '_');
    const nombreBase = user.split('@')[0];
    const nombreFormateado = nombreBase.charAt(0).toUpperCase() + nombreBase.slice(1);

    localStorage.setItem('polar_session_activa', 'true');
    localStorage.setItem('polar_rol', user);
    localStorage.setItem('polar_user_id', idFamiliar);

    if (!localStorage.getItem('polar_nombre_lider_' + idFamiliar)) {
      localStorage.setItem('polar_nombre_lider_' + idFamiliar, nombreFormateado || 'Líder');
    }
  } else {
    localStorage.setItem('polar_session_activa', 'true');
    localStorage.setItem('polar_rol', data.user.email);
    localStorage.setItem('polar_user_id', data.user.id); 
    
    const meta = data.user.user_metadata || {};
    if(meta.nombre_lider) {
        localStorage.setItem('polar_nombre_lider_' + data.user.id, meta.nombre_lider);
    }
    if(meta.config_elite) {
        config = meta.config_elite;
        localStorage.setItem('polar_config', JSON.stringify(config));
    }
    
    await sincronizarDatosNube();
    activarSuscripcionTiempoReal();
    await revisarRegistrosAntiguos();
  }

  cargarNombreUsuario();
  
  document.getElementById('login-screen').style.opacity = '0';
  setTimeout(() => {
    verificarSesion();
    document.getElementById('login-screen').style.opacity = '1';
    window.location.reload(); 
  }, 400);
}

async function cerrarSesion() {
  try { await polarDb.auth.signOut(); } catch(e) {}
  localStorage.removeItem('polar_session_activa');
  localStorage.removeItem('polar_rol');
  localStorage.removeItem('polar_user_id');
  
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  document.getElementById('btn-usuario-nombre').innerText = 'Líder';
  
  switchTab('home');
  
  const panelMenu = document.getElementById('panel-menu');
  if (panelMenu && panelMenu.classList.contains('open')) toggleMenuPanel();
  verificarSesion();
}

async function guardarNombreUsuario() {
  const nuevoNombre = document.getElementById('input-nuevo-nombre').value.trim();
  const userId = localStorage.getItem('polar_user_id') || 'default';
  if(nuevoNombre) {
    localStorage.setItem('polar_nombre_lider_' + userId, nuevoNombre);
    document.getElementById('btn-usuario-nombre').innerText = nuevoNombre;
    if (!userId.startsWith('local_')) {
      try { polarDb.auth.updateUser({ data: { nombre_lider: nuevoNombre } }); } catch(e) {}
    }
    switchTab('home');
  }
}

function cargarNombreUsuario() {
  const userId = localStorage.getItem('polar_user_id') || 'default';
  const nombreGuardado = localStorage.getItem('polar_nombre_lider_' + userId) || 'Líder';
  document.getElementById('btn-usuario-nombre').innerText = nombreGuardado;
}

let backupData = null; 
let toastTimeout;

function activarDeshacer(tipo, datosViejos) { 
    backupData = { tipo: tipo, datos: datosViejos }; 
    const toast = document.getElementById('toast-undo'); 
    toast.classList.add('show'); 
    clearTimeout(toastTimeout); 
    toastTimeout = setTimeout(() => { toast.classList.remove('show'); backupData = null; }, 5000); 
}

function deshacerBorrado() {
  if (!backupData) return;
  if (backupData.tipo === 'citas') { 
      localStorage.setItem('citas_polar', JSON.stringify(backupData.datos)); 
      renderCitas(); 
  } 
  else if (backupData.tipo === 'historial') { 
      localStorage.setItem('historial_polar', JSON.stringify(backupData.datos)); 
      actualizarVistaHistorial(); 
      renderGraficoPicos(); 
      actualizarRadar();
  }
  document.getElementById('toast-undo').classList.remove('show'); 
  backupData = null;
}

const temasVisuales = {
  elite: { '--bg-polar': '#FAF8F5', '--white': '#FFFFFF', '--blue-ice-light': '#5B9BD5', '--blue-ice-mid': '#F3C623', '--turquoise-soft': '#088387', '--turquoise-strong': '#088387', '--text-primary': '#2C3A40', '--text-inverse': '#FFFFFF', '--text-dark': '#2C3A40', '--btn-text': '#FFFFFF', '--accent-btn': '#F05A4A', '--accent-btn-text': '#FFFFFF', '--card-bg': '#FFFFFF', '--card-text': '#2C3A40', '--input-bg': '#FFFFFF', '--input-text': '#1A1A1A', '--input-border': 'rgba(44, 58, 64, 0.20)', '--label-color': '#2C3A40', '--calendar-invert': '0', '--bg-card-glucose': '#088387', '--text-card-glucose': '#FFFFFF', '--bg-card-carbs': '#2C3A40', '--text-card-carbs': '#FFFFFF' },
  original: { '--bg-polar': '#F0F6F7', '--white': '#FFFFFF', '--blue-ice-light': '#D4E4E6', '--blue-ice-mid': '#A2C5C9', '--turquoise-soft': '#7AB0B2', '--turquoise-strong': '#4A8C8E', '--text-primary': '#1A2A30', '--text-inverse': '#FFFFFF', '--text-dark': '#1A2A30', '--btn-text': '#FFFFFF', '--accent-btn': '#bdff6f', '--accent-btn-text': '#1A2A30', '--card-bg': '#2C3A40', '--card-text': '#F0F6F7', '--input-bg': '#FFFFFF', '--input-text': '#1A2A30', '--input-border': 'rgba(0, 0, 0, 0.25)', '--label-color': '#1A2A30', '--calendar-invert': '1', '--bg-card-glucose': '#D4E4E6', '--text-card-glucose': '#1A2A30', '--bg-card-carbs': '#A2C5C9', '--text-card-carbs': '#1A2A30' },
  oscuro: { '--bg-polar': '#121212', '--white': '#1E1E1E', '--blue-ice-light': '#2C2C2C', '--blue-ice-mid': '#3A3A3A', '--turquoise-soft': '#66B2B4', '--turquoise-strong': '#4A8C8E', '--text-primary': '#F0F0F0', '--text-inverse': '#121212', '--text-dark': '#F0F0F0', '--btn-text': '#FFFFFF', '--accent-btn': '#bdff6f', '--accent-btn-text': '#121212', '--card-bg': '#1E1E1E', '--card-text': '#F0F0F0', '--input-bg': '#2A2A2A', '--input-text': '#F0F0F0', '--input-border': 'rgba(255, 255, 255, 0.4)', '--label-color': '#F0F0F0', '--calendar-invert': '1', '--bg-card-glucose': '#2C2C2C', '--text-card-glucose': '#F0F0F0', '--bg-card-carbs': '#3A3A3A', '--text-card-carbs': '#F0F0F0' },
  blanco: { '--bg-polar': '#F8F9FA', '--white': '#FFFFFF', '--blue-ice-light': '#E9ECEF', '--blue-ice-mid': '#CED4DA', '--turquoise-soft': '#495057', '--turquoise-strong': '#212529', '--text-primary': '#1A1A1A', '--text-inverse': '#FFFFFF', '--text-dark': '#1A1A1A', '--btn-text': '#FFFFFF', '--accent-btn': '#0D6EFD', '--accent-btn-text': '#FFFFFF', '--card-bg': '#E9ECEF', '--card-text': '#1A1A1A', '--input-bg': '#FFFFFF', '--input-text': '#1A1A1A', '--input-border': '#ADB5BD', '--label-color': '#1A1A1A', '--calendar-invert': '0', '--bg-card-glucose': '#E9ECEF', '--text-card-glucose': '#1A1A1A', '--bg-card-carbs': '#CED4DA', '--text-card-carbs': '#1A1A1A' },
  halloween: { '--bg-polar': '#2A162B', '--white': '#1A0B1A', '--blue-ice-light': '#582A4D', '--blue-ice-mid': '#B5452C', '--turquoise-soft': '#E88C15', '--turquoise-strong': '#E88C15', '--text-primary': '#F5D6B4', '--text-inverse': '#1A0B1A', '--text-dark': '#F5D6B4', '--btn-text': '#1A0B1A', '--accent-btn': '#B5452C', '--accent-btn-text': '#FFFFFF', '--card-bg': '#1A0B1A', '--card-text': '#F5D6B4', '--input-bg': '#2A162B', '--input-text': '#F5D6B4', '--input-border': '#E88C15', '--label-color': '#F5D6B4', '--calendar-invert': '1', '--bg-card-glucose': '#582A4D', '--text-card-glucose': '#F5D6B4', '--bg-card-carbs': '#B5452C', '--text-card-carbs': '#FFFFFF' },
  mustard_jet: { '--bg-polar': '#E4DFD8', '--white': '#FFFFFF', '--blue-ice-light': '#F2D04E', '--blue-ice-mid': '#24221B', '--turquoise-soft': '#F2D04E', '--turquoise-strong': '#24221B', '--text-primary': '#24221B', '--text-inverse': '#E4DFD8', '--text-dark': '#24221B', '--btn-text': '#FFFFFF', '--accent-btn': '#F2D04E', '--accent-btn-text': '#24221B', '--card-bg': '#FFFFFF', '--card-text': '#24221B', '--input-bg': '#FFFFFF', '--input-text': '#24221B', '--input-border': 'rgba(36, 34, 27, 0.25)', '--label-color': '#24221B', '--calendar-invert': '0', '--bg-card-glucose': '#24221B', '--text-card-glucose': '#FFFFFF', '--bg-card-carbs': '#F2D04E', '--text-card-carbs': '#24221B' },
  moonstone_orange: { '--bg-polar': '#7AA6B3', '--white': '#FFFFFF', '--blue-ice-light': '#EE6C29', '--blue-ice-mid': '#282B2B', '--turquoise-soft': '#EE6C29', '--turquoise-strong': '#282B2B', '--text-primary': '#282B2B', '--text-inverse': '#FFFFFF', '--text-dark': '#282B2B', '--btn-text': '#FFFFFF', '--accent-btn': '#EE6C29', '--accent-btn-text': '#FFFFFF', '--card-bg': '#FFFFFF', '--card-text': '#282B2B', '--input-bg': '#FFFFFF', '--input-text': '#282B2B', '--input-border': 'rgba(40, 43, 43, 0.3)', '--label-color': '#282B2B', '--calendar-invert': '0', '--bg-card-glucose': '#282B2B', '--text-card-glucose': '#FFFFFF', '--bg-card-carbs': '#EE6C29', '--text-card-carbs': '#282B2B' },
  persian_carrot: { '--bg-polar': '#EEEEEE', '--white': '#FFFFFF', '--blue-ice-light': '#EF8F00', '--blue-ice-mid': '#0038BC', '--turquoise-soft': '#EF8F00', '--turquoise-strong': '#0038BC', '--text-primary': '#0038BC', '--text-inverse': '#FFFFFF', '--text-dark': '#0038BC', '--btn-text': '#FFFFFF', '--accent-btn': '#EF8F00', '--accent-btn-text': '#FFFFFF', '--card-bg': '#FFFFFF', '--card-text': '#0038BC', '--input-bg': '#FFFFFF', '--input-text': '#0038BC', '--input-border': 'rgba(0, 56, 188, 0.25)', '--label-color': '#0038BC', '--calendar-invert': '0', '--bg-card-glucose': '#0038BC', '--text-card-glucose': '#FFFFFF', '--bg-card-carbs': '#EF8F00', '--text-card-carbs': '#1A1A1A' },
  mellow_cornflower: { '--bg-polar': '#DDD4C4', '--white': '#FFFFFF', '--blue-ice-light': '#F1C436', '--blue-ice-mid': '#5C88CD', '--turquoise-soft': '#F1C436', '--turquoise-strong': '#5C88CD', '--text-primary': '#1A2B4C', '--text-inverse': '#FFFFFF', '--text-dark': '#1A2B4C', '--btn-text': '#FFFFFF', '--accent-btn': '#F1C436', '--accent-btn-text': '#1A2B4C', '--card-bg': '#FFFFFF', '--card-text': '#1A2B4C', '--input-bg': '#FFFFFF', '--input-text': '#1A2B4C', '--input-border': 'rgba(26, 43, 76, 0.25)', '--label-color': '#1A2B4C', '--calendar-invert': '0', '--bg-card-glucose': '#5C88CD', '--text-card-glucose': '#FFFFFF', '--bg-card-carbs': '#F1C436', '--text-card-carbs': '#1A2B4C' }
};

function cambiarTema() { 
  const temaElegido = document.getElementById('cfg-tema').value; 
  config.tema = temaElegido; 
  localStorage.setItem('polar_config', JSON.stringify(config)); 
  aplicarTemaReal(temaElegido); 
  cargarAvatar(); 
}

function aplicarTemaReal(temaNombre) { 
  const paleta = temasVisuales[temaNombre] || temasVisuales['elite']; 
  const root = document.documentElement; 
  for (const [key, value] of Object.entries(paleta)) { root.style.setProperty(key, value); } 
}

let usoRedondeoElite = true;
let diasFiltroBarras = 7;

function cambiarFiltroBarras(dias) {
    diasFiltroBarras = dias;
    renderBarrasPorcentaje();
}

function renderBarrasPorcentaje() {
    const historialCompleto = JSON.parse(localStorage.getItem('historial_polar') || '[]');
    const ahora = new Date().getTime();
    const tiempoLimite = ahora - (diasFiltroBarras * 24 * 60 * 60 * 1000);

    const parseItemTime = (item) => {
        if (item.timestamp) return item.timestamp;
        if(!item.iso) return 0;
        return new Date(item.iso + 'T00:00:00').getTime();
    };

    const historialFiltrado = historialCompleto.filter(item => parseItemTime(item) >= tiempoLimite);

    let n70 = 0, n180 = 0, n240 = 0, nMas240 = 0, total = 0;
    historialFiltrado.forEach(d => {
        let v = parseFloat(d.glucosa);
        if(isNaN(v)) return;
        total++;
        if (v <= 70) n70++;
        else if (v <= 180) n180++;
        else if (v <= 239) n240++;
        else nMas240++;
    });

    let p70 = total ? Math.round((n70/total)*100) : 0;
    let p180 = total ? Math.round((n180/total)*100) : 0;
    let p240 = total ? Math.round((n240/total)*100) : 0;
    let pMas240 = total ? Math.round((nMas240/total)*100) : 0;

    const isDarkBg = ['oscuro', 'halloween'].includes(config.tema);
    const textCol = isDarkBg ? '#FFFFFF' : '#000000';

    const divBarras = document.getElementById('barras-mensuales');
    if(!divBarras) return;

    const circuloStyle = (dias) => `
        width: 52px; height: 52px; border-radius: 50%;
        background: ${diasFiltroBarras === dias ? 'var(--turquoise-strong)' : 'transparent'};
        color: ${diasFiltroBarras === dias ? 'var(--white)' : 'var(--text-primary)'};
        border: 2px solid var(--turquoise-strong);
        display: flex; flex-direction: column; justify-content: center; align-items: center;
        font-weight: 900; font-size: 14px; cursor: pointer;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); line-height: 1.1;
    `;

    divBarras.innerHTML = `
        <h4 style="font-size: 15px; color: var(--turquoise-strong); margin-bottom: 8px; font-weight: 900;">mg/dl</h4>

        <div style="display:flex; justify-content:space-between; font-size: 13px; font-weight: 900; color: ${textCol}; margin-bottom: 2px;">
          <span>240 de azúcar en adelante</span><span>${pMas240}%</span>
        </div>
        <div style="width: 100%; background: rgba(0,0,0,0.06); border-radius: 12px; height: 10px; margin-bottom: 8px; overflow:hidden;">
          <div style="height: 100%; background: #FF9F0A; width: ${pMas240}%; transition: width 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);"></div>
        </div>

        <div style="display:flex; justify-content:space-between; font-size: 13px; font-weight: 900; color: ${textCol}; margin-bottom: 2px;">
          <span>de 181 a 240</span><span>${p240}%</span>
        </div>
        <div style="width: 100%; background: rgba(0,0,0,0.06); border-radius: 12px; height: 10px; margin-bottom: 8px; overflow:hidden;">
          <div style="height: 100%; background: #F3C623; width: ${p240}%; transition: width 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);"></div>
        </div>

        <div style="display:flex; justify-content:space-between; font-size: 13px; font-weight: 900; color: ${textCol}; margin-bottom: 2px;">
          <span>de 70 a 180</span><span>${p180}%</span>
        </div>
        <div style="width: 100%; background: rgba(0,0,0,0.06); border-radius: 12px; height: 10px; margin-bottom: 8px; overflow:hidden;">
          <div style="height: 100%; background: #4CAF50; width: ${p180}%; transition: width 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);"></div>
        </div>

        <div style="display:flex; justify-content:space-between; font-size: 13px; font-weight: 900; color: ${textCol}; margin-bottom: 2px;">
          <span>en 70</span><span>${p70}%</span>
        </div>
        <div style="width: 100%; background: rgba(0,0,0,0.06); border-radius: 12px; height: 10px; margin-bottom: 16px; overflow:hidden;">
          <div style="height: 100%; background: #FF3B30; width: ${p70}%; transition: width 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);"></div>
        </div>

        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 10px;">
            <div style="${circuloStyle(7)}" onclick="cambiarFiltroBarras(7)">7<br><span style="font-size:11px;font-weight:700;">días</span></div>
            <div style="${circuloStyle(10)}" onclick="cambiarFiltroBarras(10)">10<br><span style="font-size:11px;font-weight:700;">días</span></div>
            <div style="${circuloStyle(14)}" onclick="cambiarFiltroBarras(14)">14<br><span style="font-size:11px;font-weight:700;">días</span></div>
            <div style="${circuloStyle(30)}" onclick="cambiarFiltroBarras(30)">30<br><span style="font-size:11px;font-weight:700;">días</span></div>
            <div style="${circuloStyle(90)}" onclick="cambiarFiltroBarras(90)">90<br><span style="font-size:11px;font-weight:700;">días</span></div>
        </div>
    `;

    renderDesgloseComidas(historialFiltrado, textCol);
}

function renderDesgloseComidas(historialFiltrado, textCol) {
    const divComidas = document.getElementById('panel-comidas-stats');
    if(!divComidas) return;

    let stats = {
        desayuno: { sum: 0, count: 0 },
        mam: { sum: 0, count: 0 },
        almuerzo: { sum: 0, count: 0 },
        mpm: { sum: 0, count: 0 },
        cena: { sum: 0, count: 0 }
    };
    let totalValidos = 0;

    historialFiltrado.forEach(d => {
        let val = parseFloat(d.glucosa);
        if (!isNaN(val) && stats.hasOwnProperty(d.tipoComida)) {
            stats[d.tipoComida].sum += val;
            stats[d.tipoComida].count++;
            totalValidos++;
        }
    });

    if (totalValidos === 0) {
        divComidas.innerHTML = '<p style="font-size: 13px; font-weight: 700; opacity: 0.6; text-align: center;">Sin registros de glucosa en este periodo.</p>';
        return;
    }

    const nombres = { desayuno: 'Desayuno', mam: 'Once', almuerzo: 'Almuerzo', mpm: 'Merienda', cena: 'Cena' };
    const colores = { desayuno: '#FCA311', mam: '#D84B79', almuerzo: '#4CAF50', mpm: '#5B9BD5', cena: '#A35496' };

    let html = `<h4 style="font-size: 15px; color: var(--turquoise-strong); margin-bottom: 12px; font-weight: 900;">Promedio de Energía por Comida</h4>`;

    for (let key in stats) {
        if(stats[key].count > 0) {
            let promedio = Math.round(stats[key].sum / stats[key].count);
            let colorBarra = colores[key];
            let nombre = nombres[key];
            
            let colorAlerta = 'var(--text-primary)';
            if (promedio < 70) colorAlerta = '#FF3B30';
            else if (promedio > 180) colorAlerta = '#FF9F0A';
            else colorAlerta = '#4CAF50'; 

            let fillPercent = Math.min((promedio / 250) * 100, 100);

            html += `
            <div style="display:flex; justify-content:space-between; align-items: flex-end; font-size: 13px; font-weight: 900; color: ${textCol}; margin-bottom: 2px;">
                <span>${nombre} <span style="opacity: 0.5; font-size: 11px;">(${stats[key].count} reg.)</span></span>
                <span style="font-size: 15px; color: ${colorAlerta};">${promedio} <span style="font-size: 10px; color: ${textCol}; opacity: 0.7;">mg/dL</span></span>
            </div>
            <div style="width: 100%; background: rgba(0,0,0,0.06); border-radius: 12px; height: 8px; margin-bottom: 12px; overflow:hidden;">
                <div style="height: 100%; background: ${colorBarra}; width: ${fillPercent}%; transition: width 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);"></div>
            </div>`;
        }
    }

    divComidas.innerHTML = html;
}

function buscarDiaEspecifico() {
    const fechaSeleccionada = document.getElementById('buscador-fecha').value;
    const contenedorResultados = document.getElementById('resultado-buscador');

    if (!fechaSeleccionada) {
        contenedorResultados.style.display = 'none';
        return;
    }

    const historialCompleto = JSON.parse(localStorage.getItem('historial_polar') || '[]');
    const registrosDelDia = historialCompleto.filter(item => item.iso === fechaSeleccionada);

    contenedorResultados.style.display = 'block';
    contenedorResultados.style.animation = 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

    if (registrosDelDia.length === 0) {
        contenedorResultados.innerHTML = '<p style="text-align: center; font-weight: 800; color: var(--text-primary); margin: 0; opacity: 0.6;">Sin registros de escudo en esta fecha.</p>';
        return;
    }

    const dictNombres = { 'desayuno': 'Desayuno', 'mam': 'Once', 'almuerzo': 'Almuerzo', 'mpm': 'Merienda', 'cena': 'Cena', 'corroborar': 'Revisión', 'post-comida': '2H Post' };
    const dictColores = { 'desayuno': '#FCA311', 'mam': '#D84B79', 'almuerzo': '#4CAF50', 'mpm': '#5B9BD5', 'cena': '#A35496', 'corroborar': '#2C3A40', 'post-comida': '#088387' };

    const partesFecha = fechaSeleccionada.split('-');
    const fechaLimpia = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;

    let html = `<h4 style="font-size: 15px; font-weight: 900; color: var(--text-primary); margin-bottom: 12px; text-align: center; border-bottom: 1px dashed rgba(0,0,0,0.1); padding-bottom: 8px;">Auditoría del ${fechaLimpia}</h4>`;

    registrosDelDia.sort((a, b) => a.timestamp - b.timestamp);

    registrosDelDia.forEach(reg => {
        const nombreComida = dictNombres[reg.tipoComida] || 'Manual';
        const colorEtiqueta = dictColores[reg.tipoComida] || '#2C3A40';
        
        let colorGlucosa = 'var(--text-primary)';
        if(reg.glucosa < 70) colorGlucosa = '#FF3B30';
        else if(reg.glucosa > 180) colorGlucosa = '#FF9F0A';
        else colorGlucosa = '#4CAF50';

        const partesHora = reg.fecha.split(', ');
        const horaRegistro = partesHora[1] || reg.fecha;

        html += `
        <div style="background: var(--white); border-radius: 12px; padding: 14px; margin-bottom: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); border-left: 5px solid ${colorEtiqueta};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 15px; font-weight: 900; color: ${colorEtiqueta}; text-transform: uppercase;">${nombreComida}</span>
                <span style="font-size: 12px; font-weight: 900; background: rgba(0,0,0,0.05); padding: 2px 8px; border-radius: 10px; color: var(--text-primary);">${horaRegistro}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 14px; font-weight: 700; line-height: 1.4;">
                    Nivel: <span style="font-size: 16px; font-weight: 900; color: ${colorGlucosa};">${reg.glucosa || '-'}</span> <br>
                    Carga: <strong style="color: var(--text-primary);">${reg.carbos || 0}g CHO</strong>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 11px; font-weight: 800; color: var(--text-primary); opacity: 0.6; text-transform: uppercase;">Dosis</div>
                    <div style="font-size: 22px; font-weight: 900; color: var(--turquoise-strong); line-height: 1;">${reg.dosis}U</div>
                </div>
            </div>
        </div>
        `;
    });

    contenedorResultados.innerHTML = html;
}

function toggleRedondeo() {
    usoRedondeoElite = !usoRedondeoElite;
    actualizarBotonRedondeoUI();
    localStorage.setItem('polar_redondeo_activo', usoRedondeoElite ? 'true' : 'false');
    if (document.getElementById('resultado').style.display === 'block') {
      calcular(true);
    }
}

function actualizarBotonRedondeoUI() {
    const btn = document.getElementById('btn-toggle-redondeo');
    if (!btn) return;
    if (usoRedondeoElite) {
        btn.innerText = "redondeo activado";
        btn.style.background = "var(--turquoise-strong)";
    } else {
        btn.innerText = "redondeo apagado";
        btn.style.background = "#FF3B30";
    }
}

function redondeoElite(valor) {
  if (!usoRedondeoElite) return Math.round(valor * 10) / 10;
  const valorLimpio = Math.round(valor * 100) / 100;
  const entero = Math.floor(valorLimpio);
  const decimal = Math.round((valorLimpio - entero) * 100) / 100;
  if (decimal >= 0.5) {
    return entero + 1;
  }
  return entero;
}

let deferredPrompt; 
let calFechaActual = new Date();
let estadoEjercicio = 0; 
let calcHistoria = []; 
let calcPosicion = -1;
let tooltipListenerAdded = false;

let config = {
  peso: 50, 
  toujeo: 56, 
  fc: {
    desayuno: 30,
    mam: 30,
    almuerzo: 30,
    mpm: 30,
    cena: 30,
    corroborar: 30
  },
  telEmergencia: "131", 
  telPapa: "973808283", 
  avatar: 0, 
  tema: "elite",
  ratios: { desayuno: 4, mam: 0, almuerzo: 5, mpm: 5, cena: 14, corroborar: 0 },
  metas: {
