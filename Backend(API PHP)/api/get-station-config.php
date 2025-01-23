<?php
require_once 'db.php';
require_once 'auth.php';

header('Content-Type: application/json');

try {
    $usuarioId = verifyAuthentication();

    $conn = getDbConnection();

    $serial_number = isset($_GET['serial_number']) ? $conn->real_escape_string($_GET['serial_number']) : '';

    if (empty($serial_number)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Falta el número de serie.']);
        exit;
    }

    $sql = "SELECT * FROM station WHERE serial_number = '$serial_number' LIMIT 1";
    $result = $conn->query($sql);

    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'La estación no existe.']);
        exit;
    }

    $row = $result->fetch_assoc();


 
    echo json_encode(['success' => true, 'config' => $row]);
    $conn->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
