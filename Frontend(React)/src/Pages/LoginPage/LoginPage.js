// React Component Login.js
import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Importar Link
import { AuthContext } from '../../context/AuthContext';
import Button from '../../components/Button/Button';
import PageTitle from '../../components/PageTitle/PageTitle';
import './LoginPage.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { setIsAuthenticated } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/login.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', 
        body: JSON.stringify({
          email: email,
          contrasena: password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('Inicio de sesión exitoso:', data);

        // Actualizar el estado de autenticación
        setIsAuthenticated(true);

        // Verificar si el usuario es administrador y redirigir
        if (data.is_admin === 1) {
          navigate('/admin-page'); // Redirigir a la página de administración
        } else {
          navigate('/panel-control'); // Redirigir al panel de control
        }
      } else {
        setErrorMessage(data.message || 'Error desconocido.');
      }
    } catch (error) {
      console.error('Error en la solicitud:', error);
      setErrorMessage(error.message || 'Error desconocido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <PageTitle title="Iniciar Sesión" />
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Correo Electrónico</label>
          <input
            type="email"
            className="form-control"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Ingresa tu correo electrónico"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Contraseña</label>
          <input
            type="password"
            className="form-control"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingresa tu contraseña"
            required
          />
        </div>
        <Button
          text={loading ? 'Cargando...' : 'Ingresar'}
          className="btn-primary btn-login"
          type="submit"
          onClick={handleSubmit}
        />
      </form>
      {errorMessage && <p className="error-message text-center text-danger">{errorMessage}</p>}
      <p className="text-center mt-3">
        ¿No tienes una cuenta? <Link to="/register">Regístrate aquí</Link>
      </p>
    </div>
  );
};

export default Login;
