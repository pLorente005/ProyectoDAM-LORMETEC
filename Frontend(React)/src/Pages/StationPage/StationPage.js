import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
import './StationPage.css'; // Aquí puedes incluir tu estilo, ver nota abajo para el #map-leaflet

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

  // Estado para el mapa
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [map, setMap] = useState(null); // referencia al mapa Leaflet

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
        setAlerta({ tipo: 'danger', texto: data.message || 'No se pudieron cargar los datos de la estación.' });
      }
    } catch (error) {
      setAlerta({ tipo: 'danger', texto: error.message });
    }
  };

  // Efecto para cargar datos cuando cambia el serialNumber, fecha u hora
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

        // Opcional: agregar un nuevo marcador o mover el existente
        // Para simplificar, añadimos un nuevo marcador cada vez
        L.marker([latitude, longitude]).addTo(map);
      }
    }
  }, [latitude, longitude, map]);

  /**
   * Manejar el envío del formulario: cambiamos la URL con los params
   * y React Router recargará el componente con esos valores.
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set('serial_number', serialNumber);
    if (fecha) params.set('fecha', fecha);
    if (hora) params.set('hora', hora);

    navigate(`/estacion?${params.toString()}`);
    // No llamo aquí a cargarDatos() porque ya lo hará el effect
  };

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
              <strong>Activa Desde:</strong>{' '}
              {formatLocalTimestamp(infoEstacion.activa_desde, infoEstacion.timezone)}
            </p>
            <p><strong>Estado:</strong> {estadoEstacion}</p>
          </div>

          {/* Mapa con Leaflet */}
          <div className="map-container">
            {/*
              Asegúrate de que #map-leaflet tenga un tamaño fijo en CSS.
              Por ejemplo, en StationPage.css:
              #map-leaflet {
                width: 100%;
                height: 400px;
              }
            */}
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
