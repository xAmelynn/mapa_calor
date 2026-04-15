const map = L.map("map").setView([23.5, -102.0], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

let geojsonLayer = null;
let indicadorActual = "camas";
let sectorActual = "total";

const indicadorSelect = document.getElementById("indicador");
const sectorSelect = document.getElementById("sector");
const tituloMapa = document.getElementById("titulo-mapa");

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
  if (valor === null || valor === undefined || isNaN(valor)) {
    return "#cccccc";
  }

  if (indicadorActual === "camas") {
    // Menor a 3: varios tonos de rojo
    if (valor < 0.75) return "#67000d";
    if (valor < 1.50) return "#a50f15";
    if (valor < 2.25) return "#de2d26";
    if (valor < 3.00) return "#fb6a4a";

    // De 3 a 5: varios tonos amarillo/naranja
    if (valor < 3.75) return "#fdae6b";
    if (valor < 4.50) return "#fdd0a2";
    if (valor <= 5.00) return "#feedde";

    // Mayor a 5: varios tonos de verde
    if (valor <= 6.00) return "#a1d99b";
    if (valor <= 7.00) return "#74c476";
    return "#238b45";
  }

  if (indicadorActual === "medicos") {
    // Por ahora usa la misma lógica visual
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

  return "#cccccc";
}

function estilo(feature) {
  const campo = obtenerCampo();
  const valor = feature.properties[campo];

  return {
    fillColor: getColor(valor),
    weight: 1,
    opacity: 1,
    color: "#666",
    fillOpacity: 0.8
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

function popupContenido(props) {
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

function onEachFeature(feature, layer) {
  layer.bindPopup(popupContenido(feature.properties));

  layer.on({
    mouseover: function (e) {
      e.target.setStyle({
        weight: 2,
        color: "#222",
        fillOpacity: 0.9
      });
    },
    mouseout: function (e) {
      if (geojsonLayer) {
        geojsonLayer.resetStyle(e.target);
      }
    }
  });
}

function actualizarMapa() {
  if (!geojsonLayer) return;
  geojsonLayer.setStyle(estilo);
  actualizarTitulo();
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

fetch("./entidades_salud.geojson")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`No se pudo cargar el archivo: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {
    console.log("GeoJSON cargado correctamente:", data);

    geojsonLayer = L.geoJSON(data, {
      style: estilo,
      onEachFeature: onEachFeature
    }).addTo(map);

    map.fitBounds(geojsonLayer.getBounds());
    legend.addTo(map);
    actualizarMapa();
  })
  .catch((error) => {
    console.error("Error al cargar el GeoJSON:", error);
    alert("No se pudo cargar el GeoJSON. Revisa la ruta del archivo y abre el proyecto con Live Server.");
  });

indicadorSelect.addEventListener("change", (e) => {
  indicadorActual = e.target.value;
  actualizarMapa();
});

sectorSelect.addEventListener("change", (e) => {
  sectorActual = e.target.value;
  actualizarMapa();
});