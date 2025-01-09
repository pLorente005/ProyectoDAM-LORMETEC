import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const PrivateRoute = ({ element }) => {
  const { isAuthenticated } = useContext(AuthContext);

  if (isAuthenticated === null) {
    // Puedes mostrar un indicador de carga aquí si lo deseas
    return <div>Cargando...</div>;
  }

  return isAuthenticated ? element : <Navigate to="/login" />;
};

export default PrivateRoute;
