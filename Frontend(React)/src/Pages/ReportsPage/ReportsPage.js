import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTitle from '../../components/PageTitle/PageTitle';
import './ReportsPage.css';

// Función para traducir parámetros
function getParametroDesc(rawParam) {
  switch (rawParam) {
    case 'HUMIDITY_HIG':
      return 'Humedad Alta';
    case 'HUMIDITY_LOW':
      return 'Humedad Baja';
    case 'TEMPERATURE_HIG':
      return 'Temperatura Alta';
    case 'TEMPERATURE_LOW':
      return 'Temperatura Baja';
    default:
      return rawParam; 
  }
}

const Report = () => {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [reportes, setReportes] = useState([]);
  const [alerta, setAlerta] = useState(null);
  const [loading, setLoading] = useState(false);

  // Filtro (all, day, week, month)
  const [filtro, setFiltro] = useState('all');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [stationModalData, setStationModalData] = useState(null);

  const navigate = useNavigate();

  // Cargar reportes con un filtro
  const cargarReportes = async (filtroSeleccionado) => {
    setLoading(true);
    try {
      const url = `/api/report.php?filter=${filtroSeleccionado}`;
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setNombreUsuario(data.nombreUsuario);
        setReportes(data.reportes || []);
      } else if (response.status === 401) {
        navigate('/login');
      } else {
        setAlerta({
          tipo: 'danger',
          texto: data.message || 'No se pudieron cargar las incidencias.'
        });
      }
    } catch (error) {
      setAlerta({ tipo: 'danger', texto: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Cargar al inicio y cada vez que cambie "filtro"
  useEffect(() => {
    cargarReportes(filtro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  // Ocultar alerta tras 5s
  useEffect(() => {
    if (alerta) {
      const timer = setTimeout(() => setAlerta(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alerta]);

  // Agrupar por serial_number
  const agruparPorEstacion = (reportesArray) => {
    const agrupados = {};
    reportesArray.forEach((reporte) => {
      const serial = reporte.serial_number;
      if (!agrupados[serial]) {
        agrupados[serial] = [];
      }
      agrupados[serial].push(reporte);
    });
    return agrupados;
  };

  const reportesAgrupados = agruparPorEstacion(reportes);

  // Manejo modal
  const handleVerDetalles = (serialNumber) => {
    const reportesDeEstaEstacion = reportesAgrupados[serialNumber];
    if (reportesDeEstaEstacion && reportesDeEstaEstacion.length > 0) {
      // Obtenemos datos del primer reporte
      const info = reportesDeEstaEstacion[0];
      const detalles = {
        serial_number: info.serial_number,
        station_name: info.station_name,
        min_temperature: info.min_temperature,
        max_temperature: info.max_temperature,
        location: info.location,
        timezone: info.timezone,
        latitude: info.latitude,
        altitude: info.altitude
      };
      setStationModalData(detalles);
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setStationModalData(null);
  };

  // Al cambiar el <select> del filtro
  const handleFiltroChange = (e) => {
    const nuevoValor = e.target.value;
    setFiltro(nuevoValor); 
  };

  return (
    <div className="container mt-4 report-page-container">
      <PageTitle title="Incidencias de las Estaciones" />
      {/* Filtro */}
      <div className="form-group mt-4">
        <label htmlFor="filtroTiempo"><strong>Filtrar por fecha:</strong></label>
        <select
          id="filtroTiempo"
          className="form-control"
          value={filtro}
          onChange={handleFiltroChange}
        >
          <option value="all">Desde inicio</option>
          <option value="day">Último día</option>
          <option value="week">Última semana</option>
          <option value="month">Último mes</option>
        </select>
      </div>

      {loading && <p>Cargando incidencias...</p>}
      {!loading && reportes.length === 0 && (
        <p>No se encontraron incidencias con el filtro seleccionado.</p>
      )}

      {/* Tabla por estación */}
      {Object.keys(reportesAgrupados).map((serialNumber, index) => {
        const reportesDeEstaEstacion = reportesAgrupados[serialNumber];
        const nombreEstacion = reportesDeEstaEstacion[0]?.station_name || 'No especificada';

        return (
          <div key={index} className="mt-4">
            <h4 className="mb-3">
              Estación Serial: <strong>{serialNumber}</strong><br />
              Nombre Estación: <em>{nombreEstacion}</em>
            </h4>

            {/* Botón Ver Detalles con color #17a2b8 */}
            <button
              style={{ backgroundColor: '#17a2b8', color: '#fff' }}
              className="btn mb-2"
              onClick={() => handleVerDetalles(serialNumber)}
            >
              Ver detalles
            </button>

            <div className="table-responsive">
              {/* Tabla redondeada, sin encabezado negro */}
              <table className="table table-striped table-bordered rounded">
                <thead className="thead-light">
                  <tr>
                    <th>Parámetro Excedido</th>
                    <th>Fecha de Inicio</th>
                    <th>Fecha de Fin</th>
                    <th>Duración</th>
                  </tr>
                </thead>
                <tbody>
                  {reportesDeEstaEstacion.map((r, idx2) => {
                    const fechaInicio = r.fecha_inicio
                      ? new Date(r.fecha_inicio).toLocaleString('es-ES')
                      : 'No especificada';
                    const fechaFin = r.fecha_fin
                      ? new Date(r.fecha_fin).toLocaleString('es-ES')
                      : 'No especificada';

                    return (
                      <tr key={idx2}>
                        <td>{getParametroDesc(r.parametro)}</td>
                        <td>{fechaInicio}</td>
                        <td>{fechaFin}</td>
                        <td>{r.duracion || 'No especificada'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {alerta && (
        <div className={`alert alert-${alerta.tipo} custom-alert mt-4`} role="alert">
          {alerta.texto}
        </div>
      )}

      {/* Modal con animación y fondo oscuro */}
      {showModal && stationModalData && (
        <>
          {/* Backdrop con fade */}
          <div className="modal-backdrop fade show"></div>

          <div
            className="modal fade show"
            style={{ display: 'block' }}
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-dialog modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    Detalles de la Estación: {stationModalData.station_name}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={handleCloseModal}
                  ></button>
                </div>

                <div className="modal-body">
                  <p><strong>Serial:</strong> {stationModalData.serial_number}</p>
                  <p><strong>Nombre:</strong> {stationModalData.station_name}</p>
                  <p><strong>Temp. Mínima:</strong> {stationModalData.min_temperature} °C</p>
                  <p><strong>Temp. Máxima:</strong> {stationModalData.max_temperature} °C</p>
                  <p><strong>Ubicación:</strong> {stationModalData.location || 'N/D'}</p>
                  <p><strong>TimeZone:</strong> {stationModalData.timezone || 'N/D'}</p>
                  <p><strong>Latitud:</strong> {stationModalData.latitude || 'N/D'}</p>
                  <p><strong>Altitud:</strong> {stationModalData.altitude || 'N/D'}</p>
                </div>

                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={handleCloseModal}>
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Report;
