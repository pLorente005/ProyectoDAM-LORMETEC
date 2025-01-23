<?php

require 'db.php';    
require 'auth.php';  

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);
$nombre = trim($data['nombre'] ?? '');
$email = trim($data['email'] ?? '');
$contrasena = $data['contrasena'] ?? '';

if (empty($nombre) || empty($email) || empty($contrasena)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan datos: nombre, email o contraseña.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Formato de correo electrónico inválido.']);
    exit;
}

try {
    $conn = getDbConnection();

    $sql = "SELECT id FROM user WHERE email = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Error en la preparación de la consulta: " . $conn->error);
    }
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows > 0) {
        http_response_code(409); 
        echo json_encode(['success' => false, 'message' => 'El correo electrónico ya está registrado.']);
        $stmt->close();
        $conn->close();
        exit;
    }
    $stmt->close();

    $hashed_password = password_hash($contrasena, PASSWORD_BCRYPT);
    if ($hashed_password === false) {
        throw new Exception("Error al encriptar la contraseña.");
    }

    $sql = "INSERT INTO user (name, email, password, is_admin) VALUES (?, ?, ?, 0)";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Error en la preparación de la consulta de inserción: " . $conn->error);
    }
    $stmt->bind_param("sss", $nombre, $email, $hashed_password);
    $result = $stmt->execute();

    if ($result) {
        http_response_code(201); 
        echo json_encode([
            'success' => true,
            'message' => 'Registro exitoso. Puedes iniciar sesión ahora.'
        ]);
    } else {
        throw new Exception("Error al registrar el usuario: " . $stmt->error);
    }

    $stmt->close();
    $conn->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
