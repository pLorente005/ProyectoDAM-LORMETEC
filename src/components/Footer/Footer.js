import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="py-5 bg-dark text-white">
      <div className="container">
        <div className="row">
          <div className="col-md-4">
            <h5>Sobre LORMETEC</h5>
            <p>
              Somos líderes en la venta, instalación y mantenimiento de estaciones meteorológicas, 
              ofreciendo soluciones personalizadas para tus necesidades.
            </p>
          </div>
          <div className="col-md-4">
            <h5>Enlaces Rápidos</h5>
            <ul className="list-unstyled">
              <li><a href="#services" className="text-white">Servicios</a></li>
              <li><a href="#features" className="text-white">Características</a></li>
              <li><a href="#product" className="text-white">Producto</a></li>
              <li><a href="#contact" className="text-white">Contacto</a></li>
              <li><a href="login_form.php" className="text-white">Ingresar</a></li>
            </ul>
          </div>
          <div className="col-md-4">
            <h5>Contacto</h5>
            <p><i className="fas fa-map-marker-alt"></i> Dirección de la Empresa</p>
            <p><i className="fas fa-phone"></i> +123 456 7890</p>
            <p><i className="fas fa-envelope"></i> contacto@lormetec.com</p>
            <div className="social-icons">
              <a href="#" className="text-white mr-2"><i className="fab fa-facebook-f"></i></a>
              <a href="#" className="text-white mr-2"><i className="fab fa-twitter"></i></a>
              <a href="#" className="text-white"><i className="fab fa-linkedin-in"></i></a>
            </div>
          </div>
        </div>
        <hr className="bg-white" />
        <div className="row">
          <div className="col text-center">
            <small>&copy; 2024 Estaciones Meteorológicas LORMETEC. Todos los derechos reservados.</small>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
