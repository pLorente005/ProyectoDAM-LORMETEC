<?php
require 'db.php';  // Incluir la conexión a la base de datos
require 'auth.php'; // Incluir manejo de autenticación

header('Content-Type: application/json');

// Iniciar la sesión
session_start();

// Verificar si el usuario está autenticado y es administrador
if (!isset($_SESSION['usuario_id']) || $_SESSION['is_admin'] != 1) {
    http_response_code(403); // Prohibido
    echo json_encode(['success' => false, 'message' => 'No tienes permisos para realizar esta acción.']);
    exit;
}

// Leer los datos recibidos en la solicitud
$data = json_decode(file_get_contents("php://input"), true);
$serial_number = $data['serial_number'] ?? '';
$model = $data['model'] ?? '';

// Validar que los datos necesarios estén presentes
if (empty($serial_number) || empty($model)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan datos: número de serie o modelo.']);
    exit;
}

try {
    // Obtener la conexión a la base de datos
    $conn = getDbConnection();

    // Preparar la consulta SQL para insertar una nueva estación
    $sql = "INSERT INTO station (serial_number, model) VALUES (?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $serial_number, $model);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Estación añadida exitosamente.']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al añadir la estación.']);
    }

    // Cerrar la conexión
    $stmt->close();
    $conn->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
