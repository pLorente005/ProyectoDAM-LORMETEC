import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Importamos Link
import Button from '../../components/Button/Button';
import PageTitle from '../../components/PageTitle/PageTitle';
import './ControlPanelPage.css';

const ControlPanel = () => {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [estaciones, setEstaciones] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [numeroSerie, setNumeroSerie] = useState('');
  const [modelo, setModelo] = useState('');
  const [alerta, setAlerta] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const cargarEstaciones = async () => {
    try {
      const response = await fetch('/api/panel-control.php', {
        method: 'GET',
        credentials: 'include', //cookies de sesión
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setNombreUsuario(data.nombreUsuario);
        setEstaciones(data.estaciones || []);
      } else if (response.status === 401) {
        // Usuario no autenticado
        navigate('/login');
      } else {
        setAlerta({ tipo: 'danger', texto: data.message || 'No se pudieron cargar las estaciones.' });
      }
    } catch (error) {
      setAlerta({ tipo: 'danger', texto: error.message });
    }
  };

  useEffect(() => {
    cargarEstaciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFormulario = () => {
    setMostrarFormulario(!mostrarFormulario);
    setNumeroSerie('');
    setModelo('');
  };

  const handleAñadirEstacion = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/panel-control.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ numeroSerie, modelo }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setAlerta({ tipo: 'success', texto: data.message });
        setMostrarFormulario(false);
        cargarEstaciones();
      } else {
        setAlerta({ tipo: 'warning', texto: data.message });
      }
    } catch (error) {
      setAlerta({ tipo: 'danger', texto: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Ocultar alerta automáticamente después de 5 segundos
  useEffect(() => {
    if (alerta) {
      const timer = setTimeout(() => setAlerta(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alerta]);

  const handleEliminarEstacion = async (serialNumber) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta estación?')) return;
    try {
      const response = await fetch(`/api/panel-control.php?serial_number=${encodeURIComponent(serialNumber)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setAlerta({ tipo: 'success', texto: data.message });
        cargarEstaciones();
      } else {
        setAlerta({ tipo: 'warning', texto: data.message });
      }
    } catch (error) {
      setAlerta({ tipo: 'danger', texto: error.message });
    }
  };

  return (
    <div className="container mt-4 panel-control-container">
      <PageTitle title="Panel de Control" />
      <p>Bienvenido, {nombreUsuario || 'Usuario'}.</p>

      <div className="button-group">
        <Button
          text={mostrarFormulario ? 'Cancelar' : 'Añadir Estación'}
          onClick={toggleFormulario}
          className="btn-success"
        />

        {/* Botón para ver incidencias con estilo correcto */}
        <button
          className="btn btn-incidencias"
          onClick={() => navigate('/incidencias')}
        >
          Ver Incidencias
        </button>
      </div>

      {mostrarFormulario && (
        <div className="form-container mt-4">
          <form onSubmit={handleAñadirEstacion}>
            <div className="form-group">
              <label htmlFor="numeroSerie">Número de Serie:</label>
              <input
                type="text"
                className="form-control"
                id="numeroSerie"
                value={numeroSerie}
                onChange={(e) => setNumeroSerie(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="modelo">Modelo:</label>
              <input
                type="text"
                className="form-control"
                id="modelo"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="btn-primary mt-2"
              text={loading ? 'Cargando...' : 'Añadir'}
              disabled={loading}
            />
          </form>
        </div>
      )}

      <h3 className="mt-5">Estaciones Vinculadas</h3>
      {estaciones.length > 0 ? (
        <ul className="list-group">
          {estaciones.map((estacion) => (
            <li key={estacion.serial_number} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <Link to={`/estacion?serial_number=${encodeURIComponent(estacion.serial_number)}`}>
                  <strong>Número de Serie:</strong> {estacion.serial_number}
                  <br />
                  <strong>Modelo:</strong> {estacion.model}
                  <br />
                  <strong>Ubicación:</strong> {estacion.location || 'No especificada'}
                </Link>
              </div>
              <div>
                {/* Botón para ir a la configuración de la estación */}
                <Button
                  text={<i className="bi bi-gear-fill"></i>}
                  onClick={() => navigate(`/configurar-estacion?serial_number=${encodeURIComponent(estacion.serial_number)}`)}
                  className="btn-gear"
                />
                <Button
                  text={<i className="bi bi-trash-fill"></i>}
                  onClick={() => handleEliminarEstacion(estacion.serial_number)}
                  className="btn-delete"
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No tienes estaciones vinculadas.</p>
      )}

      {alerta && (
        <div className={`alert alert-${alerta.tipo} custom-alert mt-4`} role="alert">
          {alerta.texto}
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
