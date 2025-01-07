import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Carousel.css'; // Importar el CSS existente

const Carousel = () => {
  return (
    <div id="carouselExampleIndicators" className="carousel slide" data-bs-ride="carousel">
      {/* Indicadores */}
      <ol className="carousel-indicators">
        <li data-bs-target="#carouselExampleIndicators" data-bs-slide-to="0" className="active"></li>
        <li data-bs-target="#carouselExampleIndicators" data-bs-slide-to="1"></li>
        <li data-bs-target="#carouselExampleIndicators" data-bs-slide-to="2"></li>
      </ol>
      {/* Slides */}
      <div className="carousel-inner">
        <div
          className="carousel-item active"
          style={{
            backgroundImage: `url('/images/campo.jpg')`,
          }}
        >
          <div className="carousel-caption d-none d-md-block">
            <h5>Calidad y Precisión</h5>
            <p>Nuestras estaciones meteorológicas garantizan datos precisos y confiables.</p>
          </div>
        </div>
        <div
          className="carousel-item"
          style={{
            backgroundImage: `url('/images/bodega.jpg')`,
          }}
        >
          <div className="carousel-caption d-none d-md-block">
            <h5>Monitoreo en Tiempo Real</h5>
            <p>Obtén acceso instantáneo a la información meteorológica actual.</p>
          </div>
        </div>
        <div
          className="carousel-item"
          style={{
            backgroundImage: `url('/images/queso.jpg')`,
          }}
        >
          <div className="carousel-caption d-none d-md-block">
            <h5>Soluciones Personalizadas</h5>
            <p>Diseñamos sistemas a la medida de tus necesidades.</p>
          </div>
        </div>
      </div>
      {/* Controles */}
      <a
        className="carousel-control-prev"
        href="#carouselExampleIndicators"
        role="button"
        data-bs-slide="prev"
      >
        <span className="carousel-control-prev-icon" aria-hidden="true"></span>
        <span className="visually-hidden">Anterior</span>
      </a>
      <a
        className="carousel-control-next"
        href="#carouselExampleIndicators"
        role="button"
        data-bs-slide="next"
      >
        <span className="carousel-control-next-icon" aria-hidden="true"></span>
        <span className="visually-hidden">Siguiente</span>
      </a>
    </div>
  );
};

export default Carousel;
