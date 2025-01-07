import React, { useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, setIsAuthenticated } = useContext(AuthContext);

  const handleLogout = async () => {
    try {
      await fetch('/api/logout.php', {
        method: 'GET',
        credentials: 'include', // Importante para enviar cookies
      });
      setIsAuthenticated(false);
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark" style={{ backgroundColor: '#2e7d32' }}>
      <Link className="navbar-brand ms-3" to="/">
        <img src="/images/lormetec.png" alt="Lormetec Logo" style={{ height: '40px' }} />
      </Link>
      <button
        className="navbar-toggler me-3"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarNav"
        aria-controls="navbarNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span className="navbar-toggler-icon"></span>
      </button>
      <div className="collapse navbar-collapse" id="navbarNav">
        <ul className="navbar-nav ms-auto me-3">
          {isAuthenticated ? (
            <>
              {/* Mostrar secciones solo en la página principal */}
              {location.pathname === '/' && (
                <>
                  <li className="nav-item">
                    <a className="nav-link ms-3 me-2" href="#empresa">
                      Sobre Nosotros
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link ms-3 me-2" href="#empresa">
                      Servicios
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link ms-3 me-2" href="#empresa">
                      Características
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link ms-3 me-2" href="#empresa">
                      Características
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link ms-3 me-2" href="#empresa">
                      Producto
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link ms-3 me-2" href="#empresa">
                      Contacto
                    </a>
                  </li>
                  {/* ...otros enlaces... */}
                </>
              )}
              {/* Botón para volver al Panel de Control si no estamos ya en él */}
              {location.pathname !== '/panel-control' && (
                <li className="nav-item">
                  <button className="btn btn-primary ms-3 me-2" onClick={() => navigate('/panel-control')}>
                    Ir al Panel de Control
                  </button>
                </li>
              )}
              {/* Botón de Cerrar Sesión */}
              <li className="nav-item">
                <button className="btn btn-danger ms-3 me-2" onClick={handleLogout}>
                  Cerrar Sesión
                </button>
              </li>
            </>
          ) : (
            <>
              {location.pathname === '/login' ? (
                <li className="nav-item">
                  <Link className="nav-link ms-3 me-2" to="/register">
                    Registrarse
                  </Link>
                </li>
              ) : (
                <>
                  <li className="nav-item">
                    <a className="nav-link ms-3 me-2" href="#empresa">
                      Sobre Nosotros
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link ms-3 me-2" href="#empresa">
                      Servicios
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link ms-3 me-2" href="#empresa">
                      Características
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link ms-3 me-2" href="#empresa">
                      Características
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link ms-3 me-2" href="#empresa">
                      Producto
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link ms-3 me-2" href="#empresa">
                      Contacto
                    </a>
                  </li>
                  {/* ...otros enlaces... */}
                  <li className="nav-item">
                    <Link className="nav-link ms-3 me-2" to="/login">
                      Ingresar
                    </Link>
                  </li>
                </>
              )}
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
