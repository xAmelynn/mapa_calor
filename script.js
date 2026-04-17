const map = L.map("map").setView([23.5, -102.0], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

let capaEntidades = null;
let unidadesData = null;
let capaUnidadesCluster = null;
let controlCapas = null;
let ultimasFiltradas = [];
let vistaInicialBounds = null;

let indicadorActual = "camas";
let sectorActual = "total";

const indicadorSelect = document.getElementById("indicador");
const sectorSelect = document.getElementById("sector");
const tituloMapa = document.getElementById("titulo-mapa");
const detalleContenido = document.getElementById("detalleContenido");
const contadorResultados = document.getElementById("contadorResultados");
const chipsActivos = document.getElementById("chipsActivos");

const panelFiltros = document.getElementById("panelFiltros");
const panelDetalle = document.getElementById("panelDetalle");
const btnFiltros = document.getElementById("btnFiltros");
const btnDetalle = document.getElementById("btnDetalle");
const btnMinimizarFiltros = document.getElementById("btnMinimizarFiltros");
const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltros");
const btnZoomResultados = document.getElementById("btnZoomResultados");
const btnVistaNacional = document.getElementById("btnVistaNacional");
const btnExportarCsv = document.getElementById("btnExportarCsv");
const sinResultados = document.getElementById("sinResultados");

const filtros = {
  institucion: new Set(),
  entidad: new Set(),
  municipio: new Set(),
  tipo: new Set(),
  tipologia: new Set()
};

const etiquetasFiltro = {
  institucion: "Institución",
  entidad: "Entidad",
  municipio: "Municipio",
  tipo: "Tipo",
  tipologia: "Tipología"
};

const elementosFiltro = {
  institucion: document.getElementById("filtroInstitucion"),
  entidad: document.getElementById("filtroEntidad"),
  municipio: document.getElementById("filtroMunicipio"),
  tipo: document.getElementById("filtroTipo"),
  tipologia: document.getElementById("filtroTipologia")
};

const buscadores = {
  institucion: document.getElementById("buscarInstitucion"),
  entidad: document.getElementById("buscarEntidad"),
  municipio: document.getElementById("buscarMunicipio"),
  tipo: document.getElementById("buscarTipo"),
  tipologia: document.getElementById("buscarTipologia")
};

let opcionesVisibles = {
  institucion: [],
  entidad: [],
  municipio: [],
  tipo: [],
  tipologia: []
};

function obtenerCampo() {
  const campos = {
    camas: {
      publico: "indice_camas_publico",
      privado: "indice_camas_privado",
      total: "indice_camas_total"
    },
    medicos: {
      publico: "indice_medicos_publico",
      privado: "indice_medicos_privado",
      total: "indice_medicos_total"
    }
  };
  return campos[indicadorActual][sectorActual];
}

function getColor(valor) {
  if (valor === null || valor === undefined || isNaN(valor)) return "#cccccc";
  if (valor < 0.75) return "#67000d";
  if (valor < 1.50) return "#a50f15";
  if (valor < 2.25) return "#de2d26";
  if (valor < 3.00) return "#fb6a4a";
  if (valor < 3.75) return "#fdae6b";
  if (valor < 4.50) return "#fdd0a2";
  if (valor <= 5.00) return "#feedde";
  if (valor <= 6.00) return "#a1d99b";
  if (valor <= 7.00) return "#74c476";
  return "#238b45";
}

function estiloEntidad(feature) {
  const campo = obtenerCampo();
  const valor = feature.properties[campo];
  return {
    fillColor: getColor(valor),
    weight: 1,
    opacity: 1,
    color: "#666",
    fillOpacity: 0.2
  };
}

function formatearNumero(valor) {
  if (valor === null || valor === undefined || isNaN(valor)) return "Sin dato";
  return Number(valor).toFixed(2);
}

function nombreIndicador() {
  return indicadorActual === "camas" ? "camas" : "médicos";
}

function nombreSector() {
  if (sectorActual === "publico") return "Público";
  if (sectorActual === "privado") return "Privado";
  return "General";
}

function actualizarTitulo() {
  tituloMapa.textContent = `Índice de ${nombreIndicador()} - ${nombreSector()}`;
}

function popupContenidoEntidad(props) {
  return `
    <div>
      <strong>${props.ENTIDAD || "Sin nombre"}</strong><br><br>
      <strong>Población:</strong> ${Number(props.poblacion || 0).toLocaleString("es-MX")}<br><br>
      <strong>Camas censables</strong><br>
      Públicas: ${Number(props.camas_censables_publicas || 0).toLocaleString("es-MX")}<br>
      Índice público: ${formatearNumero(props.indice_camas_publico)}<br>
      Privadas: ${Number(props.camas_censables_privadas || 0).toLocaleString("es-MX")}<br>
      Índice privado: ${formatearNumero(props.indice_camas_privado)}<br>
      Totales: ${Number(props.camas_censables_totales || 0).toLocaleString("es-MX")}<br>
      Índice total: ${formatearNumero(props.indice_camas_total)}<br><br>
      <strong>Médicos</strong><br>
      Públicos: ${Number(props.medicos_publicos || 0).toLocaleString("es-MX")}<br>
      Índice público: ${formatearNumero(props.indice_medicos_publico)}<br>
      Privados: ${Number(props.medicos_privados || 0).toLocaleString("es-MX")}<br>
      Índice privado: ${formatearNumero(props.indice_medicos_privado)}<br>
      Totales: ${Number(props.medicos_total || 0).toLocaleString("es-MX")}<br>
      Índice total: ${formatearNumero(props.indice_medicos_total)}
    </div>
  `;
}

function onEachFeatureEntidad(feature, layer) {
  layer.bindPopup(popupContenidoEntidad(feature.properties));
  layer.on({
    mouseover: function (e) {
      e.target.setStyle({
        weight: 2,
        color: "#222",
        fillOpacity: 0.9
      });
    },
    mouseout: function (e) {
      if (capaEntidades) capaEntidades.resetStyle(e.target);
    }
  });
}

function actualizarMapaIndices() {
  if (!capaEntidades) return;
  capaEntidades.setStyle(estiloEntidad);
  actualizarTitulo();
}

function valorSeguro(v) {
  return v === null || v === undefined || v === "" ? "N/D" : v;
}

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function obtenerIcono(props) {
  let ruta = "img/default.svg";

  if (props.institucion_siglas === "IMSS") ruta = "img/IMSS.svg";
  else if (props.institucion_siglas === "ISSSTE") ruta = "img/ISSSTE.svg";
  else if (props.institucion_siglas === "SSA") ruta = "img/SSA.svg";
  else if (props.institucion_siglas === "DIF") ruta = "img/DIF.svg";
  else if (props.institucion_siglas === "IMSS-BIENESTAR") ruta = "img/BIENESTAR.svg";
  else if (props.institucion_siglas === "PEMEX") ruta = "img/PEMEX.svg";
  else if (props.institucion_siglas === "SEDENA") ruta = "img/SEDENA.svg";
  else if (props.institucion_siglas === "SEMAR") ruta = "img/SEMAR.svg";
  else if (props.institucion_siglas === "SME") ruta = "img/SME.svg";
  else if (props.institucion_siglas === "SMM") ruta = "img/SMM.svg";
  else if (props.institucion_siglas === "SMU") ruta = "img/SMU.svg";

  return L.icon({
    iconUrl: ruta,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26]
  });
}

function actualizarEstadoBotones() {
  const esMovil = window.innerWidth <= 900;

  document.body.classList.toggle("filtros-minimizados", panelFiltros.classList.contains("minimizado"));
  document.body.classList.toggle(
    "filtros-cerrados",
    !panelFiltros.classList.contains("abierto") && !panelFiltros.classList.contains("minimizado")
  );
  document.body.classList.toggle("detalle-abierto", panelDetalle.classList.contains("abierto"));

  if (panelFiltros.classList.contains("abierto")) {
    btnFiltros.textContent = esMovil ? "✕ Filtros" : "☰ Filtros";
  } else {
    btnFiltros.textContent = "☰ Filtros";
  }

  btnDetalle.textContent = panelDetalle.classList.contains("abierto") ? "✕ Detalle" : "ℹ Detalle";
}

function abrirPanelDetalle() {
  panelDetalle.classList.add("abierto");
  actualizarEstadoBotones();
}

function renderDetalleUnidad(props) {
  const nombre = valorSeguro(props.nombre_unidad);
  const institucion = valorSeguro(props["institución"]);
  const siglas = valorSeguro(props.institucion_siglas);
  const direccion = valorSeguro(props.direccion_completa);
  const clues = valorSeguro(props.clues);
  const mapsQuery = encodeURIComponent(
    [props.nombre_unidad, props.direccion_completa, props.municipio, props.entidad]
      .filter(Boolean)
      .join(", ")
  );

  detalleContenido.innerHTML = `
    <div class="detalle-card">
      <h3>${nombre}</h3>
      <div class="detalle-subtitulo">${institucion} (${siglas})</div>

      <div class="detalle-tags">
        <span class="detalle-tag">${valorSeguro(props.nivel_atencion)}</span>
        <span class="detalle-tag">${valorSeguro(props.tipo_establecimiento)}</span>
        <span class="detalle-tag">${valorSeguro(props.nombre_tipologia)}</span>
      </div>

      <div class="detalle-acciones">
        <button class="btn-accion" type="button" data-copy="${clues.replace(/"/g, '&quot;')}">Copiar CLUES</button>
        <button class="btn-accion" type="button" data-copy="${direccion.replace(/"/g, '&quot;')}">Copiar dirección</button>
        <a class="btn-accion" href="https://www.google.com/maps/search/?api=1&query=${mapsQuery}" target="_blank" rel="noopener noreferrer">Abrir en Google Maps</a>
      </div>

      <div class="detalle-grid">
        <div class="detalle-item"><span>CLUES</span><strong>${clues}</strong></div>
        <div class="detalle-item"><span>Entidad</span><strong>${valorSeguro(props.entidad)}</strong></div>
        <div class="detalle-item"><span>Municipio</span><strong>${valorSeguro(props.municipio)}</strong></div>
        <div class="detalle-item"><span>Tipo de establecimiento</span><strong>${valorSeguro(props.tipo_establecimiento)}</strong></div>
        <div class="detalle-item"><span>Tipología</span><strong>${valorSeguro(props.nombre_tipologia)}</strong></div>
        <div class="detalle-item"><span>Nivel de atención</span><strong>${valorSeguro(props.nivel_atencion)}</strong></div>
        <div class="detalle-item"><span>Sector</span><strong>${valorSeguro(props.sector)}</strong></div>
        <div class="detalle-item"><span>Latitud</span><strong>${valorSeguro(props.latitud)}</strong></div>
        <div class="detalle-item"><span>Longitud</span><strong>${valorSeguro(props.longitud)}</strong></div>
        <div class="detalle-item"><span>Dirección</span><strong>${direccion}</strong></div>
      </div>
    </div>
  `;
  abrirPanelDetalle();
}
function cumpleFiltro(setFiltro, valor) {
  if (setFiltro.size === 0) return true;
  return setFiltro.has(valor);
}

function obtenerOpcionesBase() {
  const features = unidadesData.features.map(f => f.properties);

  const instituciones = [...new Set(features.map(f => f["institución"]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  const entidades = [...new Set(features.map(f => f.entidad).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  const tipos = [...new Set(features.map(f => f.tipo_establecimiento).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));

  return { instituciones, entidades, tipos };
}

function municipiosDisponibles() {
  const props = unidadesData.features.map(f => f.properties);
  let filtrados = props;

  if (filtros.entidad.size > 0) {
    filtrados = filtrados.filter(p => filtros.entidad.has(p.entidad));
  }

  return [...new Set(filtrados.map(p => p.municipio).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
}

function tipologiasDisponibles() {
  const props = unidadesData.features.map(f => f.properties);
  let filtrados = props;

  if (filtros.institucion.size > 0) {
    filtrados = filtrados.filter(p => filtros.institucion.has(p["institución"]));
  }

  return [...new Set(filtrados.map(p => p.nombre_tipologia).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
}

function crearCheckboxList(contenedor, nombreFiltro, opciones, textoBusqueda = "") {
  const busqueda = normalizarTexto(textoBusqueda);
  const opcionesFiltradas = opciones.filter(op => normalizarTexto(op).includes(busqueda));
  opcionesVisibles[nombreFiltro] = opcionesFiltradas;

  if (opcionesFiltradas.length === 0) {
    contenedor.innerHTML = `<div class="checkbox-item"><label>Sin coincidencias</label></div>`;
    return;
  }

  contenedor.innerHTML = opcionesFiltradas.map((op, i) => {
    const id = `${nombreFiltro}-${i}-${normalizarTexto(op).replace(/\s+/g, "-")}`;
    const checked = filtros[nombreFiltro].has(op) ? "checked" : "";
    return `
      <div class="checkbox-item">
        <input type="checkbox" id="${id}" data-filtro="${nombreFiltro}" value="${op}" ${checked}>
        <label for="${id}">${op}</label>
      </div>
    `;
  }).join("");
}

function renderChipsActivos() {
  const chips = [];

  Object.entries(filtros).forEach(([clave, setValores]) => {
    setValores.forEach(valor => {
      chips.push(`
        <span class="chip">
          ${etiquetasFiltro[clave]}: ${valor}
          <button type="button" data-remove-chip="${clave}" data-value="${valor}">×</button>
        </span>
      `);
    });
  });

  chipsActivos.innerHTML = chips.length
    ? chips.join("")
    : '<span class="chip-placeholder">No hay filtros activos</span>';
}

function renderFiltros() {
  const base = obtenerOpcionesBase();
  const municipios = municipiosDisponibles();
  const tipologias = tipologiasDisponibles();

  for (const m of [...filtros.municipio]) {
    if (!municipios.includes(m)) filtros.municipio.delete(m);
  }

  for (const t of [...filtros.tipologia]) {
    if (!tipologias.includes(t)) filtros.tipologia.delete(t);
  }

  crearCheckboxList(elementosFiltro.institucion, "institucion", base.instituciones, buscadores.institucion.value);
  crearCheckboxList(elementosFiltro.entidad, "entidad", base.entidades, buscadores.entidad.value);
  crearCheckboxList(elementosFiltro.municipio, "municipio", municipios, buscadores.municipio.value);
  crearCheckboxList(elementosFiltro.tipo, "tipo", base.tipos, buscadores.tipo.value);
  crearCheckboxList(elementosFiltro.tipologia, "tipologia", tipologias, buscadores.tipologia.value);
  renderChipsActivos();
}

function filtrarFeatures() {
  return unidadesData.features.filter(feature => {
    const p = feature.properties;

    return (
      cumpleFiltro(filtros.institucion, p["institución"]) &&
      cumpleFiltro(filtros.entidad, p.entidad) &&
      cumpleFiltro(filtros.municipio, p.municipio) &&
      cumpleFiltro(filtros.tipo, p.tipo_establecimiento) &&
      cumpleFiltro(filtros.tipologia, p.nombre_tipologia)
    );
  });
}


function mostrarEstadoSinResultados(mostrar) {
  sinResultados.classList.toggle("oculto", !mostrar);
}

function exportarCSV() {
  if (!ultimasFiltradas.length) {
    alert("No hay resultados filtrados para exportar.");
    return;
  }

  const columnas = [
    ["nombre_unidad", "Nombre unidad"],
    ["institución", "Institución"],
    ["institucion_siglas", "Siglas"],
    ["entidad", "Entidad"],
    ["municipio", "Municipio"],
    ["tipo_establecimiento", "Tipo establecimiento"],
    ["nombre_tipologia", "Tipología"],
    ["nivel_atencion", "Nivel atención"],
    ["sector", "Sector"],
    ["clues", "CLUES"],
    ["direccion_completa", "Dirección"],
    ["latitud", "Latitud"],
    ["longitud", "Longitud"]
  ];

  const escapeCSV = (valor) => {
    const texto = valor == null ? "" : String(valor);
    return `"${texto.replace(/"/g, '""')}"`;
  };

  const filas = [
    columnas.map(([, nombre]) => escapeCSV(nombre)).join(","),
    ...ultimasFiltradas.map((feature) => {
      const p = feature.properties;
      return columnas.map(([clave]) => escapeCSV(p[clave])).join(",");
    })
  ];

  const blob = new Blob(["\ufeff" + filas.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = "unidades_filtradas.csv";
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

function volverVistaNacional() {
  if (vistaInicialBounds && vistaInicialBounds.isValid()) {
    map.fitBounds(vistaInicialBounds, { padding: [20, 20] });
  } else {
    map.setView([23.5, -102.0], 5);
  }
}
function actualizarControlCapas() {
  if (!capaEntidades || !capaUnidadesCluster) return;

  if (controlCapas) {
    controlCapas.remove();
  }

  const overlays = {
    "Índice de salud": capaEntidades,
    "Unidades públicas": capaUnidadesCluster
  };

  controlCapas = L.control.layers(null, overlays, { collapsed: false }).addTo(map);
}

function construirCluster(featuresFiltradas) {
  if (capaUnidadesCluster) {
    map.removeLayer(capaUnidadesCluster);
  }

  capaUnidadesCluster = L.markerClusterGroup({
    chunkedLoading: true,
    chunkInterval: 200,
    chunkDelay: 50,
    disableClusteringAtZoom: 12,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    removeOutsideVisibleBounds: true,
    iconCreateFunction: function (cluster) {
      const total = cluster.getChildCount();
      let clase = "marker-cluster-small";
      if (total >= 100) clase = "marker-cluster-large";
      else if (total >= 20) clase = "marker-cluster-medium";

      return L.divIcon({
        html: `<div><span>${total}</span></div>`,
        className: `marker-cluster ${clase}`,
        iconSize: L.point(42, 42)
      });
    }
  });

  const capaFiltrada = L.geoJSON(
    { type: "FeatureCollection", features: featuresFiltradas },
    {
      pointToLayer: function (feature, latlng) {
        return L.marker(latlng, {
          icon: obtenerIcono(feature.properties)
        });
      },
      onEachFeature: function (feature, layer) {
        layer.on("click", function () {
          renderDetalleUnidad(feature.properties);
        });
      }
    }
  );

  capaUnidadesCluster.addLayer(capaFiltrada);
  map.addLayer(capaUnidadesCluster);
  ultimasFiltradas = featuresFiltradas;
  contadorResultados.textContent = featuresFiltradas.length.toLocaleString("es-MX");
  mostrarEstadoSinResultados(featuresFiltradas.length === 0);

  actualizarControlCapas();
}

function aplicarFiltros() {
  renderFiltros();
  const filtradas = filtrarFeatures();
  construirCluster(filtradas);
}

function acercarAResultados() {
  if (!capaUnidadesCluster) return;
  const bounds = capaUnidadesCluster.getBounds();
  if (bounds && bounds.isValid()) {
    map.fitBounds(bounds, { padding: [30, 30] });
  } else {
    alert("No hay resultados visibles para acercar.");
  }
}

function manejarCambioCheckbox(event) {
  const input = event.target;
  if (!input.matches('input[type="checkbox"][data-filtro]')) return;

  const nombreFiltro = input.dataset.filtro;
  const valor = input.value;

  if (input.checked) filtros[nombreFiltro].add(valor);
  else filtros[nombreFiltro].delete(valor);

  aplicarFiltros();
}

function limpiarFiltros() {
  Object.values(filtros).forEach(set => set.clear());
  Object.values(buscadores).forEach(input => input.value = "");
  aplicarFiltros();
}

function seleccionarVisibles(nombreFiltro) {
  opcionesVisibles[nombreFiltro].forEach(valor => filtros[nombreFiltro].add(valor));
  aplicarFiltros();
}

function setEstadoPanelFiltros(estado) {
  panelFiltros.classList.remove("abierto", "minimizado");

  if (estado === "abierto") {
    panelFiltros.classList.add("abierto");
  } else if (estado === "minimizado") {
    panelFiltros.classList.add("minimizado");
  }

  actualizarEstadoBotones();
}

function toggleFiltros() {
  const esMovil = window.innerWidth <= 900;

  if (esMovil) {
    if (panelFiltros.classList.contains("abierto")) setEstadoPanelFiltros("cerrado");
    else setEstadoPanelFiltros("abierto");
    return;
  }

  if (panelFiltros.classList.contains("abierto")) {
    setEstadoPanelFiltros("minimizado");
  } else {
    setEstadoPanelFiltros("abierto");
  }
}

function toggleDetalle() {
  panelDetalle.classList.toggle("abierto");
  actualizarEstadoBotones();
}

const legend = L.control({ position: "bottomright" });

legend.onAdd = function () {
  const div = L.DomUtil.create("div", "info legend");
  div.innerHTML = `
    <div><i style="background:#67000d"></i> < 0.75</div>
    <div><i style="background:#a50f15"></i> 0.75 - 1.49</div>
    <div><i style="background:#de2d26"></i> 1.50 - 2.24</div>
    <div><i style="background:#fb6a4a"></i> 2.25 - 2.99</div>
    <div><i style="background:#fdae6b"></i> 3.00 - 3.74</div>
    <div><i style="background:#fdd0a2"></i> 3.75 - 4.49</div>
    <div><i style="background:#feedde"></i> 4.50 - 5.00</div>
    <div><i style="background:#a1d99b"></i> 5.01 - 6.00</div>
    <div><i style="background:#74c476"></i> 6.01 - 7.00</div>
    <div><i style="background:#238b45"></i> > 7.00</div>
    <div><i style="background:#cccccc"></i> Sin dato</div>
  `;
  return div;
};

actualizarTitulo();
actualizarEstadoBotones();

fetch("data/entidades_salud.geojson")
  .then((response) => {
    if (!response.ok) throw new Error(`No se pudo cargar el archivo: ${response.status}`);
    return response.json();
  })
  .then((data) => {
    capaEntidades = L.geoJSON(data, {
      style: estiloEntidad,
      onEachFeature: onEachFeatureEntidad
    }).addTo(map);

    map.fitBounds(capaEntidades.getBounds());
    vistaInicialBounds = capaEntidades.getBounds();
    legend.addTo(map);
    actualizarMapaIndices();
    actualizarControlCapas();
  })
  .catch((error) => {
    console.error("Error al cargar el GeoJSON de entidades:", error);
    alert("No se pudo cargar el GeoJSON de entidades.");
  });

fetch("data/unidades_publicas.geojson")
  .then((response) => {
    if (!response.ok) throw new Error(`No se pudo cargar el archivo: ${response.status}`);
    return response.json();
  })
  .then((data) => {
    unidadesData = data;
    renderFiltros();
    aplicarFiltros();
  })
  .catch((error) => {
    console.error("Error al cargar las unidades:", error);
    alert("No se pudo cargar el GeoJSON de unidades.");
  });

indicadorSelect.addEventListener("change", (e) => {
  indicadorActual = e.target.value;
  actualizarMapaIndices();
});

sectorSelect.addEventListener("change", (e) => {
  sectorActual = e.target.value;
  actualizarMapaIndices();
});

Object.values(elementosFiltro).forEach(contenedor => {
  contenedor.addEventListener("change", manejarCambioCheckbox);
});

Object.entries(buscadores).forEach(([, input]) => {
  input.addEventListener("input", () => renderFiltros());
});

chipsActivos.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-remove-chip]");
  if (!btn) return;

  const filtro = btn.dataset.removeChip;
  const valor = btn.dataset.value;
  filtros[filtro].delete(valor);
  aplicarFiltros();
});

document.querySelectorAll("[data-select-all]").forEach(btn => {
  btn.addEventListener("click", () => {
    seleccionarVisibles(btn.dataset.selectAll);
  });
});

btnLimpiarFiltros.addEventListener("click", limpiarFiltros);
btnZoomResultados.addEventListener("click", acercarAResultados);

btnFiltros.addEventListener("click", toggleFiltros);
btnDetalle.addEventListener("click", toggleDetalle);
btnMinimizarFiltros.addEventListener("click", () => {
  if (window.innerWidth <= 900) setEstadoPanelFiltros("cerrado");
  else if (panelFiltros.classList.contains("minimizado")) setEstadoPanelFiltros("abierto");
  else setEstadoPanelFiltros("minimizado");
});

document.querySelectorAll("[data-close]").forEach(btn => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.close;
    const panel = document.getElementById(id);

    if (id === "panelFiltros") {
      if (window.innerWidth <= 900) setEstadoPanelFiltros("cerrado");
      else setEstadoPanelFiltros("minimizado");
    } else {
      panel.classList.remove("abierto");
      actualizarEstadoBotones();
    }
  });
});


detalleContenido.addEventListener("click", async (event) => {
  const btn = event.target.closest("[data-copy]");
  if (!btn) return;
  const texto = btn.dataset.copy || "";
  try {
    await navigator.clipboard.writeText(texto);
    const textoOriginal = btn.textContent;
    btn.textContent = "Copiado";
    setTimeout(() => {
      btn.textContent = textoOriginal;
    }, 1200);
  } catch (error) {
    console.error("No se pudo copiar:", error);
    alert("No se pudo copiar al portapapeles.");
  }
});

map.on("overlayadd", (event) => {
  if (event.layer === capaEntidades) {
    if (!map.hasLayer(legend)) legend.addTo(map);
  }
});

map.on("overlayremove", (event) => {
  if (event.layer === capaEntidades && map.hasLayer(legend)) {
    map.removeControl(legend);
  }
});

btnVistaNacional.addEventListener("click", volverVistaNacional);
btnExportarCsv.addEventListener("click", exportarCSV);

window.addEventListener("resize", () => {
  if (window.innerWidth <= 900 && panelFiltros.classList.contains("minimizado")) {
    setEstadoPanelFiltros("cerrado");
  }
  actualizarEstadoBotones();
});
