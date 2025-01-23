<?php
require_once 'db.php';
require_once 'auth.php';

header('Content-Type: application/json');

try {
    $sessionData = verifyAuthentication();
    $usuarioID = $sessionData['usuario_id'];
    $nombreUsuario = $sessionData['nombre'];
    $usuarioEmail = $sessionData['email'];

    $conn = getDbConnection();

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
        $tipo = $success ? 'success' : (strpos($mensaje, "otro usuario") !== false ? 'warning' : 'danger');

        echo json_encode([
            'success' => $success,
            'message' => $mensaje,
            'tipo' => $tipo
        ]);
        $conn->close();
        exit;
    }

    $estaciones = obtenerEstacionesVinculadas($conn, $usuarioID);

    echo json_encode([
        'success' => true,
        'nombreUsuario' => $nombreUsuario,
        'estaciones' => $estaciones
    ]);

    $conn->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

function añadirEstacion($conn, $usuarioID, $numeroSerie, $modelo) {
    $sqlCheckDevice = "SELECT user_id FROM station WHERE serial_number = ? AND model = ?";
    $stmtCheckDevice = $conn->prepare($sqlCheckDevice);
    $stmtCheckDevice->bind_param("ss", $numeroSerie, $modelo);
    $stmtCheckDevice->execute();
    $resultDevice = $stmtCheckDevice->get_result();

    if ($resultDevice->num_rows > 0) {
        $row = $resultDevice->fetch_assoc();
        $currentUserId = $row['user_id'];

        if ($currentUserId === null) {
            $sqlAssociateStation = "UPDATE station SET user_id = ? WHERE serial_number = ?";
            $stmtAssociateStation = $conn->prepare($sqlAssociateStation);
            $stmtAssociateStation->bind_param("is", $usuarioID, $numeroSerie);
            if ($stmtAssociateStation->execute()) {
                return "Estación asociada exitosamente.";
            }
            return "Error al asociar la estación.";
        } elseif ($currentUserId == $usuarioID) {
            return "El dispositivo ya está asociado a este usuario.";
        } else {
            return "El dispositivo ya está asociado a otro usuario.";
        }
    }

    return "El número de serie '$numeroSerie' no existe en la base de datos.";
}

function obtenerEstacionesVinculadas($conn, $usuarioID) {
    $sql = "SELECT serial_number, station_name, model, location 
            FROM station 
            WHERE user_id = ?";
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
