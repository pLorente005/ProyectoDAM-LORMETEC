import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageTitle from '../../components/PageTitle/PageTitle';
import './StationPage.css';

const Station = () => {
  const navigate = useNavigate();
  const query = new URLSearchParams(useLocation().search);

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
  
  const [alerta, setAlerta] = useState(null);

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
        setAlerta(null);
      } else if (response.status === 401) {
        navigate('/login');
      } else {
        setAlerta({ tipo: 'danger', texto: data.message || 'No se pudieron cargar los datos de la estación.' });
      }
    } catch (error) {
      setAlerta({ tipo: 'danger', texto: error.message });
    }
  };

  useEffect(() => {
    if (serialNumber) {
      cargarDatos();
    }
  }, [serialNumber, fecha, hora]);

  useEffect(() => {
    if (alerta) {
      const timer = setTimeout(() => setAlerta(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alerta]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set('serial_number', serialNumber);
    if (fecha) params.set('fecha', fecha);
    if (hora) params.set('hora', hora);
    navigate(`/estacion?${params.toString()}`);
    cargarDatos();
  };

  return (
    <div className="container mt-4 panel-control-container">
      <PageTitle title="Datos de la Estación" />
      {infoEstacion && (
        <div className="info-mapa-container mt-4">
          <div className="info">
            <h3>{infoEstacion.nombre}</h3>
            <p><strong>Número de Serie:</strong> {serialNumber}</p>
            <p><strong>Ubicación:</strong> {infoEstacion.location}</p>
            <p><strong>Zona Horaria:</strong> {infoEstacion.timezone}</p>
            <p><strong>Activa Desde:</strong> {infoEstacion.activa_desde}</p>
            <p><strong>Estado:</strong> {estadoEstacion}</p>
          </div>
        </div>
      )}

      <div className="row mt-4">
        <div className="col-md-6">
          <div className="card text-center">
            <div className="card-header bg-info text-white">
              <h4>Temperatura Actual</h4>
            </div>
            <div className="card-body">
              <p className="display-4">{currentTemperature !== null ? `${currentTemperature} °C` : '--'}</p>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card text-center">
            <div className="card-header bg-info text-white">
              <h4>Humedad Actual</h4>
            </div>
            <div className="card-body">
              <p className="display-4">{currentHumidity !== null ? `${currentHumidity} %` : '--'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="accordion form-container mt-4" id="accordionExample">
        <div className="card">
          <div className="card-header" id="headingOne">
            <h2 className="mb-0">
              <button className="btn btn-link btn-block text-left" type="button" data-toggle="collapse" data-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
                Seleccionar Fecha y Hora
              </button>
            </h2>
          </div>
          <div id="collapseOne" className="collapse show" aria-labelledby="headingOne" data-parent="#accordionExample">
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="fecha">Fecha</label>
                  <input type="date" className="form-control" id="fecha" name="fecha" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="hora">Hora</label>
                  <input type="time" className="form-control" id="hora" name="hora" value={hora} onChange={(e) => setHora(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary mt-2">Ver Datos</button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="accordion mt-4" id="accordionDatos">
        <div className="card">
          <div className="card-header" id="headingTwo">
            <h2 className="mb-0">
              <button className="btn btn-link btn-block text-left" type="button" data-toggle="collapse" data-target="#collapseTwo" aria-expanded="true" aria-controls="collapseTwo">
                Mostrar Datos de la Estación
              </button>
            </h2>
          </div>
          <div id="collapseTwo" className="collapse show" aria-labelledby="headingTwo" data-parent="#accordionDatos">
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
                        <td style={{color: (tempMax !== null && tempMin !== null && (dato.temperature > tempMax || dato.temperature < tempMin)) ? 'red' : 'black'}}>
                          {dato.temperature}
                        </td>
                        <td style={{color: (humMax !== null && humMin !== null && (dato.humidity > humMax || dato.humidity < humMin)) ? 'red' : 'black'}}>
                          {dato.humidity}
                        </td>
                        <td>{dato.timestamp}</td>
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

      {alerta && (
        <div className={`alert alert-${alerta.tipo} custom-alert mt-4`} role="alert">
          {alerta.texto}
        </div>
      )}
    </div>
  );
};

export default Station;
