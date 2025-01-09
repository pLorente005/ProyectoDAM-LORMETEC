<?php
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'domain' => '', // Deja vacío para usar el dominio actual
    'secure' => false, // Cambia a true si usas HTTPS
    'httponly' => true,
    'samesite' => 'Lax', // 'Lax' está bien para same-origin
]);

session_start(); // Iniciar sesión

header('Content-Type: application/json');
$conn = new mysqli($hostname, $username, $password, $database);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error de conexión a la base de datos.']);
    exit;
}

// Leer los datos recibidos en la solicitud
$data = json_decode(file_get_contents("php://input"), true);
$email = $data['email'] ?? '';
$contrasena = $data['contrasena'] ?? '';

// Validar que los datos necesarios estén presentes
if (empty($email) || empty($contrasena)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan datos: email o contraseña.']);
    exit;
}

// Preparar la consulta SQL para verificar al usuario
$sql = "SELECT id, name, password, is_admin FROM user WHERE email = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $email);
$stmt->execute();
$stmt->store_result();
$stmt->bind_result($id, $name, $hashed_password, $is_admin);

// Verificar si el usuario existe
if ($stmt->num_rows > 0) {
    $stmt->fetch();
    if (password_verify($contrasena, $hashed_password)) {
        // Si la contraseña es correcta, guardar datos en la sesión
        $_SESSION['usuario_id'] = $id;
        $_SESSION['nombre'] = $name;
        $_SESSION['email'] = $email;
        $_SESSION['is_admin'] = $is_admin;

        echo json_encode([
            'success' => true,
            'message' => 'Inicio de sesión exitoso.'
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Contraseña incorrecta.']);
    }
} else {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Usuario no encontrado.']);
}

// Cerrar la conexión
$stmt->close();
$conn->close();
?>