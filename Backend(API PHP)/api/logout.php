<?php
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'domain' => '',
    'secure' => false, // Cambia a true si usas HTTPS
    'httponly' => true,
    'samesite' => 'Lax',
]);

session_start();

header('Content-Type: application/json');

session_unset();
session_destroy();

echo json_encode(['success' => true, 'message' => 'Sesión cerrada correctamente.']);
?>
