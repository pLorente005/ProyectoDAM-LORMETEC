import React from 'react';
import Carousel from '../../components/Carousel/Carousel';
import Button from '../../components/Button/Button';
import Card from '../../components/Card/Card';
import './HomePage.css';

const HomePage = () => {
  return (
    <>
      <Carousel />
      <div className="text-center bg-light p-3" style={{ marginTop: 0 }}>
        <p style={{ fontSize: '1.2em', color: '#666' }}>Datos precisos, decisiones seguras</p>
        <hr style={{ width: '90%', border: '1px solid #ccc', margin: '10px auto' }} />
      </div>

      {/* Sección "Sobre Nosotros" */}
      <section id="empresa" className="py-5 bg-light">
        <div className="container">
          <div className="row">
            <div className="col text-center">
              <h2>Sobre Nosotros</h2>
              <p className="lead">Conoce más acerca de nuestra empresa</p>
            </div>
          </div>
          <div className="row align-items-center mt-5">
            <div className="col-md-6">
              <h3>Nuestra Historia</h3>
              <p>
                En LORMETEC, nos especializamos en soluciones meteorológicas que combinan tecnología y
                precisión. Desde nuestros inicios, hemos proporcionado herramientas para ayudar a nuestros
                clientes a tomar decisiones informadas basadas en datos confiables.
              </p>
              <p>
                Con años de experiencia en el mercado, ofrecemos estaciones meteorológicas adaptadas a las
                necesidades específicas de nuestros clientes, garantizando siempre la mejor calidad.
              </p>
              <div className="mt-4">
               
              </div>
            </div>
            <div className="col-md-6 text-center">
              <img
                src="/images/fabrica.webp"
                alt="Imagen de la fábrica"
                className="img-fluid"
                style={{ width: '50%', opacity: 0.8, borderRadius: '10px' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Sección "Servicios" */}
      <section id="services" className="py-5">
        <div className="container">
          <div className="row">
            <div className="col text-center">
              <h2>Servicios</h2>
              <p className="lead">Lo que ofrecemos</p>
            </div>
          </div>
          <div className="row text-center">
            <div className="col-md-4">
              <Card
                title="Venta de Estaciones"
                description="Ofrecemos una amplia variedad de estaciones meteorológicas para diversas aplicaciones."
              />
            </div>
            <div className="col-md-4">
              <Card
                title="Instalación y Mantenimiento"
                description="Nuestros expertos se encargan de la instalación y mantenimiento de los equipos."
              />
            </div>
            <div className="col-md-4">
              <Card
                title="Consultoría Meteorológica"
                description="Brindamos asesoría para proyectos meteorológicos personalizados."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Sección "Características" */}
      <section id="features" className="py-5 bg-light">
        <div className="container">
          <div className="row">
            <div className="col text-center">
              <h2>Características</h2>
              <p className="lead">Por qué elegir nuestras estaciones</p>
            </div>
          </div>
          <div className="row text-center">
            <div className="col-md-4">
              <Card
                icon={<i className="fas fa-thermometer-half"></i>}
                title="Alta Precisión"
                description="Nuestras estaciones están equipadas con sensores de alta calidad para garantizar mediciones precisas."
              />
            </div>
            <div className="col-md-4">
              <Card
                icon={<i className="fas fa-wifi"></i>}
                title="Conectividad"
                description="Conectividad avanzada para monitorear los datos en tiempo real desde cualquier dispositivo."
              />
            </div>
            <div className="col-md-4">
              <Card
                icon={<i className="fas fa-shield-alt"></i>}
                title="Durabilidad"
                description="Construidas para resistir condiciones climáticas extremas y durar por muchos años."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Sección "Producto" */}
      <section id="product" className="py-5">
        <div className="container">
          <div className="row">
            <div className="col text-center">
              <h2>Producto</h2>
              <p className="lead">Compra nuestra estación meteorológica</p>
            </div>
          </div>
          <div className="row">
            <div className="col-md-6">
              <img
                src="/images/estacion.webp"
                alt="Imagen de la estación"
                className="img-fluid"
              />
            </div>
            <div className="col-md-6">
              <h3>Estación Meteorológica Profesional</h3>
              <p>Ideal para uso profesional e industrial, esta estación meteorológica ofrece precisión y durabilidad excepcionales.</p>
              <ul className="list-unstyled">
                <li><i className="fas fa-check"></i> Sensor de temperatura y humedad de alta precisión</li>
                <li><i className="fas fa-check"></i> Conectividad WiFi para monitoreo en tiempo real</li>
                <li><i className="fas fa-check"></i> Resistente a condiciones climáticas extremas</li>
                <li><i className="fas fa-check"></i> Fácil instalación y mantenimiento</li>
              </ul>
              <Button text="Pedir oferta" link="#contact" className="btn-primary" />
            </div>
          </div>
        </div>
      </section>

      {/* Sección "Contacto" */}
      <section id="contact" className="py-5 bg-light">
        <div className="container">
          <div className="row">
            <div className="col text-center">
              <h2>Contacto</h2>
              <p className="lead">Ponte en contacto con nosotros</p>
            </div>
          </div>
          <div className="row">
            <div className="col-md-6 offset-md-3">
              <form>
                <div className="form-group">
                  <label htmlFor="name">Nombre</label>
                  <input type="text" className="form-control" id="name" required />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Correo Electrónico</label>
                  <input type="email" className="form-control" id="email" required />
                </div>
                <div className="form-group">
                  <label htmlFor="message">Mensaje</label>
                  <textarea className="form-control" id="message" rows="5" required></textarea>
                </div>
                <Button text="Enviar" type="submit" className="btn-primary btn-block" />
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default HomePage;
