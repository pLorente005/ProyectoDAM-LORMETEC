<?php
function verifyAuthentication() {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '', 
        'secure' => false, 
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    session_start();

    if (!isset($_SESSION['usuario_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Usuario no autenticado.']);
        exit;
    }

    return [
        'usuario_id' => $_SESSION['usuario_id'],
        'nombre' => $_SESSION['nombre'] ?? '',
        'email' => $_SESSION['email'] ?? ''
    ];
}
?>
