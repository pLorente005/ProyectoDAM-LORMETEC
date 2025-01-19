<?php
require_once 'db.php';
require_once 'auth.php';

header('Content-Type: application/json');

try {
    // Verificar autenticación
    $sessionData = verifyAuthentication();
    $usuarioID = $sessionData['usuario_id'];
    $nombreUsuario = $sessionData['nombre'];
    $usuarioEmail = $sessionData['email'];

    // Conexión a la base de datos
    $conn = getDbConnection();

    // Manejar la eliminación de una estación si se ha solicitado
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE' && isset($_GET['serial_number'])) {
        $serialNumber = $_GET['serial_number'];
        $resultado = eliminarEstacion($conn, $usuarioID, $serialNumber);
        $success = strpos($resultado, "correctamente") !== false;
        $tipo = $success ? 'success' : 'warning';

        echo json_encode([
            'success' => $success,
            'message' => $resultado,
            'tipo' => $tipo
        ]);
        $conn->close();
        exit;
    }

    // Manejar la adición de una estación si se ha enviado el formulario
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $numeroSerie = $data['numeroSerie'] ?? '';
        $modelo = $data['modelo'] ?? '';

        if (empty($numeroSerie) || empty($modelo)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Número de serie y modelo son requeridos.']);
            $conn->close();
            exit;
        }

        $mensaje = añadirEstacion($conn, $usuarioID, $numeroSerie, $modelo);
        $success = strpos($mensaje, "exitosamente") !== false;
        $tipo = $success ? 'success' : 'warning';

        echo json_encode([
            'success' => $success,
            'message' => $mensaje,
            'tipo' => $tipo
        ]);
        $conn->close();
        exit;
    }

    // Obtener todas las estaciones vinculadas al usuario
    $estaciones = obtenerEstacionesVinculadas($conn, $usuarioID);

    // Devolver los datos en formato JSON
    echo json_encode([
        'success' => true,
        'nombreUsuario' => $nombreUsuario,
        'estaciones' => $estaciones
    ]);

    // Cerrar la conexión
    $conn->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

/**
 * Función para añadir una estación.
 */
function añadirEstacion($conn, $usuarioID, $numeroSerie, $modelo) {
    $sqlCheckDevice = "SELECT * FROM station WHERE serial_number = ? AND model = ?";
    $stmtCheckDevice = $conn->prepare($sqlCheckDevice);
    $stmtCheckDevice->bind_param("ss", $numeroSerie, $modelo);
    $stmtCheckDevice->execute();
    $resultDevice = $stmtCheckDevice->get_result();

    if ($resultDevice->num_rows > 0) {
        $sqlCheckUserStation = "SELECT * FROM station WHERE serial_number = ? AND user_id = ?";
        $stmtCheckUserStation = $conn->prepare($sqlCheckUserStation);
        $stmtCheckUserStation->bind_param("si", $numeroSerie, $usuarioID);
        $stmtCheckUserStation->execute();
        $resultUserStation = $stmtCheckUserStation->get_result();

        if ($resultUserStation->num_rows > 0) {
            return "El dispositivo ya está asociado a este usuario.";
        }

        $sqlAssociateStation = "UPDATE station SET user_id = ? WHERE serial_number = ?";
        $stmtAssociateStation = $conn->prepare($sqlAssociateStation);
        $stmtAssociateStation->bind_param("is", $usuarioID, $numeroSerie);
        if ($stmtAssociateStation->execute()) {
            return "Estación asociada exitosamente.";
        }
        return "Error al asociar la estación.";
    }

    return "El número de serie '$numeroSerie' no existe en la base de datos.";
}

/**
 * Función para obtener estaciones vinculadas a un usuario.
 */
function obtenerEstacionesVinculadas($conn, $usuarioID) {
    $sql = "SELECT serial_number, model, location FROM station WHERE user_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $usuarioID);
    $stmt->execute();
    $result = $stmt->get_result();
    $estaciones = [];

    while ($row = $result->fetch_assoc()) {
        $estaciones[] = $row;
    }
    return $estaciones;
}

/**
 * Función para eliminar una estación vinculada a un usuario.
 */
function eliminarEstacion($conn, $usuarioID, $serialNumber) {
    $sqlVerify = "SELECT * FROM station WHERE serial_number = ? AND user_id = ?";
    $stmtVerify = $conn->prepare($sqlVerify);
    $stmtVerify->bind_param("si", $serialNumber, $usuarioID);
    $stmtVerify->execute();
    $resultVerify = $stmtVerify->get_result();

    if ($resultVerify->num_rows === 0) {
        return "Error: La estación no está asociada a este usuario o no existe.";
    }

    $sqlDelete = "UPDATE station SET user_id = NULL WHERE serial_number = ? AND user_id = ?";
    $stmtDelete = $conn->prepare($sqlDelete);
    $stmtDelete->bind_param("si", $serialNumber, $usuarioID);
    if ($stmtDelete->execute()) {
        return "Estación desasociada correctamente.";
    }
    return "Error al desasociar la estación.";
}
?>
