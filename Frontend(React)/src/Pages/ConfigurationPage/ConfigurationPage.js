import React, { useState, useEffect } from 'react'; 
import { useLocation } from 'react-router-dom';
import PageTitle from '../../components/PageTitle/PageTitle';

const Configuration = () => {
  const location = useLocation();

  const [config, setConfig] = useState({
    nombre: '',
    temp_max: '',
    temp_min: '',
    hum_max: '',
    hum_min: '',
    latitude: '',
    altitude: '',
    location: '',
    timezone: ''
  });

  const [mensaje, setMensaje] = useState('');

  // Este estado ahora empieza vacío y lo llenaremos con la API
  const [timezones, setTimezones] = useState([]);

  const getSerialNumberFromURL = () => {
    const params = new URLSearchParams(location.search);
    return params.get('serial_number') || '';
  };

  const serialNumber = getSerialNumberFromURL();

  // 1. useEffect para cargar las ZONAS HORARIAS desde un API externo
  useEffect(() => {
    // Puedes usar la API pública de worldtimeapi.org directamente:
    fetch('https://paulorenteramos.com/api/get-timezones.php')
      .then((res) => {
        if (!res.ok) {
          throw new Error('No se pudo obtener la lista de zonas horarias');
        }
        return res.json();
      })
      .then((data) => {
        // data debería ser un array de strings con las zonas horarias
        setTimezones(data);
      })
      .catch((err) => {
        console.error(err);
        setMensaje('Error al obtener la lista de zonas horarias: ' + err.message);
      });
  }, []);

  // 2. useEffect para CARGAR la configuración de la estación
  useEffect(() => {
    if (!serialNumber) return;
    fetch(`/api/get-station-config.php?serial_number=${encodeURIComponent(serialNumber)}`, {
      credentials: 'include'
    })
      .then(res => {
        if (res.status === 401) {
          window.location.href = '/login';
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data && data.success && data.config) {
          setConfig({
            // Aquí se asume que la columna de BD se llama station_name
            nombre: data.config.station_name || '',
            temp_max: data.config.max_temperature?.toString() || '',
            temp_min: data.config.min_temperature?.toString() || '',
            hum_max: data.config.max_humidity?.toString() || '',
            hum_min: data.config.min_humidity?.toString() || '',
            latitude: data.config.latitude?.toString() || '',
            altitude: data.config.altitude?.toString() || '',
            location: data.config.location || '',
            timezone: data.config.timezone || ''
          });
        } else if (data && !data.success) {
          setMensaje(data.message || 'No se pudo cargar la configuración de la estación.');
        }
      })
      .catch(err => setMensaje('Error al cargar la configuración: ' + err.message));
  }, [serialNumber]);

  // Manejo de cambios en los inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  // Manejo de submit del formulario
  const handleSubmit = (e) => {
    e.preventDefault();

    fetch('/api/configure-station.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        serial_number: serialNumber,
        nombre: config.nombre,
        temp_max: config.temp_max,
        temp_min: config.temp_min,
        hum_max: config.hum_max,
        hum_min: config.hum_min,
        latitude: config.latitude,
        altitude: config.altitude,
        location: config.location,
        timezone: config.timezone
      })
    })
      .then(res => {
        if (res.status === 401) {
          window.location.href = '/login';
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data && data.success) {
          setMensaje('Configuración guardada con éxito.');
        } else if (data) {
          setMensaje(data.message || 'No se pudo guardar la configuración.');
        }
      })
      .catch(err => setMensaje('Error: ' + err.message));
  };

  return (
    <>
      <div className="container mt-4 panel-control-container">
        <PageTitle title="Configurar estación" />
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="nombre" style={{ fontWeight: 'bold' }}>Nombre:</label>
            <input
              type="text"
              className="form-control"
              id="nombre"
              name="nombre"
              value={config.nombre}
              onChange={handleChange}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="temp_max" style={{ fontWeight: 'bold' }}>Temperatura Máxima (°C):</label>
            <input
              type="number"
              step="0.1"
              className="form-control"
              id="temp_max"
              name="temp_max"
              value={config.temp_max}
              onChange={handleChange}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="temp_min" style={{ fontWeight: 'bold' }}>Temperatura Mínima (°C):</label>
            <input
              type="number"
              step="0.1"
              className="form-control"
              id="temp_min"
              name="temp_min"
              value={config.temp_min}
              onChange={handleChange}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="hum_max" style={{ fontWeight: 'bold' }}>Humedad Máxima (%):</label>
            <input
              type="number"
              step="0.1"
              className="form-control"
              id="hum_max"
              name="hum_max"
              value={config.hum_max}
              onChange={handleChange}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="hum_min" style={{ fontWeight: 'bold' }}>Humedad Mínima (%):</label>
            <input
              type="number"
              step="0.1"
              className="form-control"
              id="hum_min"
              name="hum_min"
              value={config.hum_min}
              onChange={handleChange}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="latitude" style={{ fontWeight: 'bold' }}>Latitud:</label>
            <input
              type="number"
              step="0.0001"
              className="form-control"
              id="latitude"
              name="latitude"
              value={config.latitude}
              onChange={handleChange}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="altitude" style={{ fontWeight: 'bold' }}>Altitud (m):</label>
            <input
              type="number"
              step="0.1"
              className="form-control"
              id="altitude"
              name="altitude"
              value={config.altitude}
              onChange={handleChange}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="location" style={{ fontWeight: 'bold' }}>Ubicación:</label>
            <input
              type="text"
              className="form-control"
              id="location"
              name="location"
              value={config.location}
              onChange={handleChange}
            />
          </div>

          {/* Aquí usamos el estado de timezones para llenar el <select> */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="timezone" style={{ fontWeight: 'bold' }}>Zona Horaria:</label>
            <select
              className="form-control"
              id="timezone"
              name="timezone"
              value={config.timezone}
              onChange={handleChange}
            >
              {timezones.length === 0 ? (
                <option value="">Cargando zonas horarias...</option>
              ) : (
                timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))
              )}
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Guardar
          </button>
        </form>

        {mensaje && (
          <div className="alert alert-info mt-3">
            {mensaje}
          </div>
        )}
      </div>
    </>
  );
};

export default Configuration;
