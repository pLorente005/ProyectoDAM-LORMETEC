import React, { useState } from 'react';
import './AdminPage.css';

const Admin = () => {
    const [serialNumber, setSerialNumber] = useState('');
    const [model, setModel] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const handleAddStation = async (e) => {
        e.preventDefault();
        setSuccessMessage('');
        setErrorMessage('');

        try {
            const response = await fetch('/api/admin.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    serial_number: serialNumber,
                    model: model,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccessMessage('Estación añadida exitosamente.');
                setSerialNumber('');
                setModel('');
            } else {
                setErrorMessage(data.message || 'Error desconocido al añadir la estación.');
            }
        } catch (error) {
            setErrorMessage('Error en la solicitud: ' + (error.message || 'Error desconocido.'));
        }
    };

    return (
        <div className="admin-container">
            <h1 className="admin-title">Página de Administración</h1>
            <form onSubmit={handleAddStation} className="admin-form">
                <div className="form-group">
                    <label htmlFor="serialNumber" className="form-label">Número de Serie</label>
                    <input
                        type="text"
                        id="serialNumber"
                        className="form-control"
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value)}
                        placeholder="Ingresa el número de serie"
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="model" className="form-label">Modelo</label>
                    <input
                        type="text"
                        id="model"
                        className="form-control"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="Ingresa el modelo"
                        required
                    />
                </div>
                <button type="submit" className="btn btn-primary">Añadir Estación</button>
            </form>
            {successMessage && <p className="success-message mt-3">{successMessage}</p>}
            {errorMessage && <p className="error-message mt-3">{errorMessage}</p>}
        </div>
    );
};

export default Admin;