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
import Admin from './Pages/AdminPage/AdminPage';
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
            {/* Rutas públicas */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Rutas privadas */}
            <Route path="/admin" element={<PrivateRoute element={<Admin />} />} />
            <Route path="/panel-control" element={<PrivateRoute element={<ControlPanel />} />} />
            <Route path="/configurar-estacion" element={<PrivateRoute element={<Configuration />} />} />
            <Route path="/incidencias" element={<PrivateRoute element={<Report />} />} />
            <Route path="/estacion" element={<PrivateRoute element={<Station />} />} />

            {/* Redirección para rutas no encontradas */}
            <Route path="*" element={<HomePage />} />
          </Routes>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;