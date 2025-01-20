
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Button from '../../components/Button/Button';
import PageTitle from '../../components/PageTitle/PageTitle';
import './RegisterPage.css'; // Importa el CSS aquí

const Register = () => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { setIsAuthenticated } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Validaciones básicas
    if (contrasena !== confirmarContrasena) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/register.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Si necesitas manejar cookies
        body: JSON.stringify({
          nombre: nombre,
          email: email,
          contrasena: contrasena,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('Registro exitoso:', data);
        // Redirigir a la página de inicio de sesión
        navigate('/login');
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
    <div className="register-container">
      <PageTitle title="Registrarse" />
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nombre">Nombre</label>
          <input
            type="text"
            className="form-control"
            id="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ingresa tu nombre"
            required
          />
        </div>
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
          <label htmlFor="contrasena">Contraseña</label>
          <input
            type="password"
            className="form-control"
            id="contrasena"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            placeholder="Ingresa tu contraseña"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmarContrasena">Confirmar Contraseña</label>
          <input
            type="password"
            className="form-control"
            id="confirmarContrasena"
            value={confirmarContrasena}
            onChange={(e) => setConfirmarContrasena(e.target.value)}
            placeholder="Confirma tu contraseña"
            required
          />
        </div>
        {/* Reemplazamos el botón HTML con el componente Button */}
        <Button
          text={loading ? 'Cargando...' : 'Registrarse'}
          className="btn-primary btn-register"
          type="submit"
          onClick={handleSubmit}
        />
      </form>
      {errorMessage && <p className="error-message text-center text-danger">{errorMessage}</p>}
      <p className="text-center mt-3">
        ¿Ya tienes una cuenta? <a href="/login">Inicia sesión aquí</a>
      </p>
    </div>
  );
};

export default Register;
