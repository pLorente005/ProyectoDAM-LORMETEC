import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ---- amCharts 4 ----
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';

// Aplicamos el tema animado de amCharts
am4core.useTheme(am4themes_animated);

// Fíjate en estos imports adicionales de los iconos por defecto de Leaflet:
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Ajustamos la ruta de los iconos para que no aparezcan rotos
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

import PageTitle from '../../components/PageTitle/PageTitle';
import './StationPage.css';

const Station = () => {
  const navigate = useNavigate();
  const query = new URLSearchParams(useLocation().search);

  // State principal
  const initialSerial = query.get('serial_number') || '';
  const [serialNumber, setSerialNumber] = useState(initialSerial);
  const [fecha, setFecha] = useState(query.get('fecha') || '');
  const [hora, setHora] = useState(query.get('hora') || '');

  const [infoEstacion, setInfoEstacion] = useState(null);
  const [estadoEstacion, setEstadoEstacion] = useState('');
  const [currentTemperature, setCurrentTemperature] = useState(null);
  const [currentHumidity, setCurrentHumidity] = useState(null);
  const [tempMax, setTempMax] = useState(null);
  const [tempMin, setTempMin] = useState(null);
  const [humMax, setHumMax] = useState(null);
  const [humMin, setHumMin] = useState(null);
  const [datosEstacion, setDatosEstacion] = useState([]);

  // Alerta
  const [alerta, setAlerta] = useState(null);

  // Estado para el mapa Leaflet
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [map, setMap] = useState(null);

  // Referencias a los gráficos (para destruirlos al recargar datos)
  const chartTempRef = useRef(null);
  const chartHumRef = useRef(null);

  /**
   * Convierte un timestamp en formato "YYYY-MM-DD HH:mm:ss" (UTC)
   * a la hora local de la estación.
   * - Añadimos 'Z' para que JS lo trate como UTC.
   * - Usamos `toLocaleString()` con la opción timeZone.
   */
  function formatLocalTimestamp(timestampUTC, stationTz) {
    if (!timestampUTC) return '';
    const date = new Date(timestampUTC + 'Z');
    return date.toLocaleString('es-ES', {
      timeZone: stationTz || 'UTC',
      dateStyle: 'short',
      timeStyle: 'medium'
    });
  }

  /**
   * Llamada al endpoint /api/estacion.php para obtener la información
   * y los datos de la estación.
   */
  const cargarDatos = async () => {
    try {
      let url = `/api/estacion.php?serial_number=${encodeURIComponent(serialNumber)}`;
      if (fecha) url += `&fecha=${encodeURIComponent(fecha)}`;
      if (hora) url += `&hora=${encodeURIComponent(hora)}`;

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setInfoEstacion(data.infoEstacion);
        setEstadoEstacion(data.estadoEstacion);
        setCurrentTemperature(data.currentTemperature);
        setCurrentHumidity(data.currentHumidity);
        setTempMax(data.tempMax);
        setTempMin(data.tempMin);
        setHumMax(data.humMax);
        setHumMin(data.humMin);
        setDatosEstacion(data.datosEstacion);

        // Guardamos lat y long para el mapa
        setLatitude(data.latitude);
        setLongitude(data.longitude);

        setAlerta(null);
      } else if (response.status === 401) {
        // Usuario no autenticado, redirigir a login (si corresponde)
        navigate('/login');
      } else {
        setAlerta({
          tipo: 'danger',
          texto: data.message || 'No se pudieron cargar los datos de la estación.'
        });
      }
    } catch (error) {
      setAlerta({ tipo: 'danger', texto: error.message });
    }
  };

  // Efecto para cargar datos cuando cambian serialNumber, fecha u hora
  useEffect(() => {
    if (serialNumber) {
      cargarDatos();
    }
    // eslint-disable-next-line
  }, [serialNumber, fecha, hora]);

  // Efecto para ocultar la alerta tras 5 segundos
  useEffect(() => {
    if (alerta) {
      const timer = setTimeout(() => setAlerta(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alerta]);

  // Inicializar/actualizar mapa Leaflet cuando tenemos lat/long
  useEffect(() => {
    if (latitude && longitude) {
      if (!map) {
        // Crear un mapa por primera vez
        const newMap = L.map('map-leaflet').setView([latitude, longitude], 13);

        // Capa base (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(newMap);

        // Añadir marcador
        L.marker([latitude, longitude]).addTo(newMap);

        // Guardar la referencia en el state
        setMap(newMap);
      } else {
        // Si el mapa ya existe, solo muevo la vista
        map.setView([latitude, longitude], 13);
        L.marker([latitude, longitude]).addTo(map);
      }
    }
  }, [latitude, longitude, map]);

  /**
   * Manejar el envío del formulario: cambiamos la URL con los params,
   * y React Router recargará el componente con esos valores.
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set('serial_number', serialNumber);
    if (fecha) params.set('fecha', fecha);
    if (hora) params.set('hora', hora);

    navigate(`/estacion?${params.toString()}`);
  };

  /**
   * Efecto que construye (o reconstruye) los dos gráficos 
   * cuando cambian los datos de la estación.
   */
  useEffect(() => {
    // Si no hay datos, destruimos los charts si existen y salimos.
    if (!datosEstacion || datosEstacion.length === 0) {
      if (chartTempRef.current) {
        chartTempRef.current.dispose();
        chartTempRef.current = null;
      }
      if (chartHumRef.current) {
        chartHumRef.current.dispose();
        chartHumRef.current = null;
      }
      return;
    }

    // Destruir instancias previas para evitar fugas de memoria
    if (chartTempRef.current) {
      chartTempRef.current.dispose();
    }
    if (chartHumRef.current) {
      chartHumRef.current.dispose();
    }

    // ---- Preparar datos para los gráficos ----
    const chartData = datosEstacion.map(dato => ({
      // Ajusta el timestamp si es necesario para interpretarlo como UTC
      timestamp: new Date(dato.timestamp + 'Z'),
      temperature: Number(dato.temperature),
      humidity: Number(dato.humidity)
    }));

    // ======================================================
    //                 GRÁFICO DE TEMPERATURA
    // ======================================================
    const chartTemp = am4core.create('graficoTemperatura', am4charts.XYChart);
    chartTemp.data = chartData;

    // Eje X (fecha-hora)
    const dateAxisTemp = chartTemp.xAxes.push(new am4charts.DateAxis());
    dateAxisTemp.title.text = 'Fecha y Hora';

    // Eje Y (temperatura)
    const valueAxisTemp = chartTemp.yAxes.push(new am4charts.ValueAxis());
    valueAxisTemp.title.text = 'Temperatura (°C)';
    // Limitar eje de temperatura entre -20 y 80
    valueAxisTemp.min = -20;
    valueAxisTemp.max = 80;

    // Ajustar el valor base para el área sombreada
    valueAxisTemp.baseValue = -20;

    // Serie de Temperatura
    const seriesTemp = chartTemp.series.push(new am4charts.LineSeries());
    seriesTemp.dataFields.valueY = 'temperature';
    seriesTemp.dataFields.dateX = 'timestamp';
    seriesTemp.name = 'Temperatura (°C)';
    seriesTemp.strokeWidth = 2;
    seriesTemp.tooltipText = '{valueY} °C';
    // Colores
    seriesTemp.stroke = am4core.color('rgba(255, 99, 132, 1)');
    seriesTemp.fillOpacity = 0.2;
    seriesTemp.fill = am4core.color('rgba(255, 99, 132, 0.2)');

    // Cursor para hover
    chartTemp.cursor = new am4charts.XYCursor();
    chartTemp.cursor.xAxis = dateAxisTemp;

    // Líneas de referencia: Temp Max
    if (tempMax != null) {
      const rangeMaxTemp = valueAxisTemp.axisRanges.create();
      rangeMaxTemp.value = tempMax;
      rangeMaxTemp.grid.stroke = am4core.color('rgba(255, 0, 0, 0.7)');
      rangeMaxTemp.grid.strokeWidth = 2;
      rangeMaxTemp.label.inside = true;
      rangeMaxTemp.label.text = 'Temp Max';
      rangeMaxTemp.label.fill = am4core.color('#FF0000');
      rangeMaxTemp.label.verticalCenter = 'bottom';
    }
    // Líneas de referencia: Temp Min
    if (tempMin != null) {
      const rangeMinTemp = valueAxisTemp.axisRanges.create();
      rangeMinTemp.value = tempMin;
      rangeMinTemp.grid.stroke = am4core.color('rgba(0, 0, 255, 0.7)');
      rangeMinTemp.grid.strokeWidth = 2;
      rangeMinTemp.label.inside = true;
      rangeMinTemp.label.text = 'Temp Min';
      rangeMinTemp.label.fill = am4core.color('#0000FF');
      rangeMinTemp.label.verticalCenter = 'top';
    }

    // Guardar referencia para destruirlo después
    chartTempRef.current = chartTemp;

    // ======================================================
    //                 GRÁFICO DE HUMEDAD
    // ======================================================
    const chartHum = am4core.create('graficoHumedad', am4charts.XYChart);
    chartHum.data = chartData;

    // Eje X (fecha-hora)
    const dateAxisHum = chartHum.xAxes.push(new am4charts.DateAxis());
    dateAxisHum.title.text = 'Fecha y Hora';

    // Eje Y (humedad)
    const valueAxisHum = chartHum.yAxes.push(new am4charts.ValueAxis());
    valueAxisHum.title.text = 'Humedad (%)';
    // Limitar eje de humedad entre 0 y 100
    valueAxisHum.min = 0;
    valueAxisHum.max = 100;

    // Serie de Humedad
    const seriesHum = chartHum.series.push(new am4charts.LineSeries());
    seriesHum.dataFields.valueY = 'humidity';
    seriesHum.dataFields.dateX = 'timestamp';
    seriesHum.name = 'Humedad (%)';
    seriesHum.strokeWidth = 2;
    seriesHum.tooltipText = '{valueY} %';
    // Colores
    seriesHum.stroke = am4core.color('rgba(54, 162, 235, 1)');
    seriesHum.fillOpacity = 0.2;
    seriesHum.fill = am4core.color('rgba(54, 162, 235, 0.2)');

    // Cursor para hover
    chartHum.cursor = new am4charts.XYCursor();
    chartHum.cursor.xAxis = dateAxisHum;

    // Líneas de referencia: Hum Max
    if (humMax != null) {
      const rangeMaxHum = valueAxisHum.axisRanges.create();
      rangeMaxHum.value = humMax;
      rangeMaxHum.grid.stroke = am4core.color('rgba(255, 0, 0, 0.7)');
      rangeMaxHum.grid.strokeWidth = 2;
      rangeMaxHum.label.inside = true;
      rangeMaxHum.label.text = 'Hum Max';
      rangeMaxHum.label.fill = am4core.color('#FF0000');
      rangeMaxHum.label.verticalCenter = 'bottom';
    }
    // Líneas de referencia: Hum Min
    if (humMin != null) {
      const rangeMinHum = valueAxisHum.axisRanges.create();
      rangeMinHum.value = humMin;
      rangeMinHum.grid.stroke = am4core.color('rgba(0, 0, 255, 0.7)');
      rangeMinHum.grid.strokeWidth = 2;
      rangeMinHum.label.inside = true;
      rangeMinHum.label.text = 'Hum Min';
      rangeMinHum.label.fill = am4core.color('#0000FF');
      rangeMinHum.label.verticalCenter = 'top';
    }

    // Guardar referencia para destruirlo después
    chartHumRef.current = chartHum;


    // Limpieza en caso de que el componente se desmonte
    return () => {
      if (chartTemp) {
        chartTemp.dispose();
      }
      if (chartHum) {
        chartHum.dispose();
      }
    };
  }, [datosEstacion, tempMax, tempMin, humMax, humMin]);

  return (
    <div className="container mt-4 panel-control-container">
      <PageTitle title="Datos de la Estación" />

      {/* Info general de la estación */}
      {infoEstacion && (
        <div className="info-mapa-container mt-4">
          <div className="info">
            <h3>{infoEstacion.nombre}</h3>
            <p><strong>Número de Serie:</strong> {serialNumber}</p>
            <p><strong>Ubicación:</strong> {infoEstacion.location}</p>
            <p><strong>Zona Horaria:</strong> {infoEstacion.timezone}</p>
            <p>
              <strong>Activa Desde: </strong>
              {formatLocalTimestamp(infoEstacion.activa_desde, infoEstacion.timezone)}
            </p>
            <p><strong>Estado:</strong> {estadoEstacion}</p>
          </div>

          {/* Mapa con Leaflet */}
          <div className="map-container">
            <div id="map-leaflet" />
          </div>
        </div>
      )}

      {/* Tarjetas de Temperatura y Humedad actuales */}
      <div className="row mt-4">
        <div className="col-md-6">
          <div className="card text-center">
            <div className="card-header bg-info text-white">
              <h4>Temperatura Actual</h4>
            </div>
            <div className="card-body">
              <p className="display-4">
                {currentTemperature !== null ? `${currentTemperature} °C` : '--'}
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card text-center">
            <div className="card-header bg-info text-white">
              <h4>Humedad Actual</h4>
            </div>
            <div className="card-body">
              <p className="display-4">
                {currentHumidity !== null ? `${currentHumidity} %` : '--'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario para filtrar por fecha/hora */}
      <div className="accordion form-container mt-4" id="accordionExample">
        <div className="card">
          <div className="card-header" id="headingOne">
            <h2 className="mb-0">
              <button
                className="btn btn-link btn-block text-left"
                type="button"
                data-toggle="collapse"
                data-target="#collapseOne"
                aria-expanded="true"
                aria-controls="collapseOne"
              >
                Seleccionar Fecha y Hora
              </button>
            </h2>
          </div>
          <div
            id="collapseOne"
            className="collapse show"
            aria-labelledby="headingOne"
            data-parent="#accordionExample"
          >
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="fecha">Fecha</label>
                  <input
                    type="date"
                    className="form-control"
                    id="fecha"
                    name="fecha"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="hora">Hora</label>
                  <input
                    type="time"
                    className="form-control"
                    id="hora"
                    name="hora"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary mt-2">
                  Ver Datos
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla con los datos de la estación */}
      <div className="accordion mt-4" id="accordionDatos">
        <div className="card">
          <div className="card-header" id="headingTwo">
            <h2 className="mb-0">
              <button
                className="btn btn-link btn-block text-left"
                type="button"
                data-toggle="collapse"
                data-target="#collapseTwo"
                aria-expanded="true"
                aria-controls="collapseTwo"
              >
                Mostrar Datos de la Estación
              </button>
            </h2>
          </div>
          <div
            id="collapseTwo"
            className="collapse show"
            aria-labelledby="headingTwo"
            data-parent="#accordionDatos"
          >
            <div className="card-body">
              {datosEstacion.length > 0 ? (
                <table className="table table-bordered data-table mt-4">
                  <thead>
                    <tr>
                      <th>Temperatura (°C)</th>
                      <th>Humedad (%)</th>
                      <th>Fecha y Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datosEstacion.map((dato, i) => (
                      <tr key={i}>
                        <td
                          style={{
                            color:
                              tempMax !== null &&
                              tempMin !== null &&
                              (dato.temperature > tempMax || dato.temperature < tempMin)
                                ? 'red'
                                : 'black'
                          }}
                        >
                          {dato.temperature}
                        </td>
                        <td
                          style={{
                            color:
                              humMax !== null &&
                              humMin !== null &&
                              (dato.humidity > humMax || dato.humidity < humMin)
                                ? 'red'
                                : 'black'
                          }}
                        >
                          {dato.humidity}
                        </td>
                        <td>
                          {formatLocalTimestamp(dato.timestamp, infoEstacion?.timezone)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No hay datos disponibles para esta estación en el rango seleccionado.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos de Temperatura y Humedad */}
      <div className="mt-5">
        <h4 className="text-center">Gráfico de Temperatura</h4>
        <div id="graficoTemperatura" style={{ width: '100%', height: '400px' }} />

        <h4 className="text-center mt-5">Gráfico de Humedad</h4>
        <div id="graficoHumedad" style={{ width: '100%', height: '400px' }} />
      </div>

      {/* Alerta */}
      {alerta && (
        <div className={`alert alert-${alerta.tipo} custom-alert mt-4`} role="alert">
          {alerta.texto}
        </div>
      )}
    </div>
  );
};

export default Station;
