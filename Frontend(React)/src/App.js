import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import Login from './Pages/LoginPage/LoginPage';
import Register from './Pages/RegisterPage/RegisterPage';
import ControlPanel from './Pages/ControlPanelPage/ControlPanelPage';
import Station from './Pages/StationPage/StationPage';
import HomePage from './Pages/HomePage/HomePage';
import Configuration from './Pages/ConfigurationPage/ConfigurationPage';
import Report from './Pages/ReportsPage/ReportsPage';
import PrivateRoute from './components/routes/PrivateRoute';
import { AuthProvider } from './context/AuthContext';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div>
          <Navbar />
          <Routes>
            {/* Página Principal */}
            <Route path="/" element={<HomePage />} />
            {/* Página de inicio de sesión */}
            <Route path="/login" element={<Login />} />
            {/* Página de registro */}
            <Route path="/register" element={<Register />} />
            {/* Ruta protegida para el Panel de Control */}
            <Route path="/panel-control" element={<PrivateRoute element={<ControlPanel/>} />} />
            {/* Página de configuración de la estación */}
            <Route path="/configurar-estacion" element={<Configuration/>} />

            {/* Ruta protegida para el incidencias */}
            <Route path="/incidencias" element={<PrivateRoute element={<Report/>} />} />
            {/* Página de detalles de la estación meteorológica */}
            <Route path="/estacion" element={<Station/>} />
          </Routes>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
