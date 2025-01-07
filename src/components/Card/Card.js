import React from 'react';

const Card = ({ title, description, image, icon, footerContent, onClick }) => {
  return (
    <div className="card mb-4 shadow-sm" onClick={onClick}>
      {image && <img src={image} alt={title} className="card-img-top" />}
      {icon && <div className="feature-icon mb-3">{icon}</div>}
      <div className="card-body">
        <h5 className="card-title">{title}</h5>
        <p className="card-text">{description}</p>
        {footerContent && <div className="card-footer">{footerContent}</div>}
      </div>
    </div>
  );
};

export default Card;
