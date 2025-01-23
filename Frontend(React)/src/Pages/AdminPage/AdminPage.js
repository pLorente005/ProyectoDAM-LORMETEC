import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './AdminPage.css';

const Admin = () => {
    const [serialNumber, setSerialNumber] = useState('');
    const [model, setModel] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const { user } = useContext(AuthContext); // Obtener usuario del contexto
    const navigate = useNavigate();

    const handleAddStation = async (e) => {
        e.preventDefault();
        setSuccessMessage('');
        setErrorMessage('');

        // Verificar autenticación
        if (!user || user.role !== 'admin') {
            navigate('/login');
            return;
        }

        try {
            const response = await fetch('/api/admin.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}` // Incluir token
                },
                body: JSON.stringify({
                    serial_number: serialNumber,
                    model: model,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error en la solicitud');
            }

            setSuccessMessage('Estación añadida exitosamente.');
            setSerialNumber('');
            setModel('');

        } catch (error) {
            setErrorMessage(error.message || 'Error al procesar la solicitud');
            console.error('Error:', error);
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
            {successMessage && <div className="alert alert-success mt-3">{successMessage}</div>}
            {errorMessage && <div className="alert alert-danger mt-3">{errorMessage}</div>}
        </div>
    );
};

export default Admin;