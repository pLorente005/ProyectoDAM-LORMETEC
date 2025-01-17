<?php
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'domain' => '', // Deja vacío para usar el dominio actual
    'secure' => false, // Cambia a true si usas HTTPS
    'httponly' => true,
    'samesite' => 'Lax',
]);

session_start();

header('Content-Type: application/json');

$authenticated = isset($_SESSION['usuario_id']);

echo json_encode(['authenticated' => $authenticated]);
?>
