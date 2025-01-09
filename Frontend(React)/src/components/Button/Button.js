import React from 'react';

const Button = ({ text, onClick, className = 'btn-primary', type = 'button', disabled = false }) => {
  return (
    <button
      className={`btn ${className}`}
      onClick={onClick}
      type={type}
      disabled={disabled}
    >
      {text}
    </button>
  );
};

export default Button;
