<?php
require_once 'db.php';
require_once 'auth.php';

header('Content-Type: application/json');

try {
    // Verificar autenticación
    $usuarioId = verifyAuthentication();

    // Conexión a la base de datos
    $conn = getDbConnection();

    // Leer y decodificar los datos de la solicitud
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!isset($data['serial_number'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Falta el número de serie.']);
        exit;
    }

    $serial_number = $conn->real_escape_string($data['serial_number']);

    // Obtener la configuración actual de la estación
    $sqlGet = "SELECT * FROM station WHERE serial_number = '$serial_number' LIMIT 1";
    $resultGet = $conn->query($sqlGet);

    if ($resultGet->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'La estación no existe.']);
        exit;
    }

    $row = $resultGet->fetch_assoc();

    if ((int)$row['user_id'] !== (int)$usuarioId) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'No tiene permiso para configurar esta estación.']);
        exit;
    }

    // Función para mantener el valor anterior si el nuevo está vacío
    function getValueOrDefault($newValue, $oldValue) {
        return (!isset($newValue) || $newValue === '') ? $oldValue : $newValue;
    }

    // Obtener los valores actualizados o mantener los anteriores
    $nombre    = getValueOrDefault($data['nombre'] ?? null, $row['model']);
    $temp_max  = getValueOrDefault($data['temp_max'] ?? null, $row['max_temperature']);
    $temp_min  = getValueOrDefault($data['temp_min'] ?? null, $row['min_temperature']);
    $hum_max   = getValueOrDefault($data['hum_max'] ?? null, $row['max_humidity']);
    $hum_min   = getValueOrDefault($data['hum_min'] ?? null, $row['min_humidity']);
    $latitude  = getValueOrDefault($data['latitude'] ?? null, $row['latitude']);
    $altitude  = getValueOrDefault($data['altitude'] ?? null, $row['altitude']);
    $location  = getValueOrDefault($data['location'] ?? null, $row['location']);
    $timezone  = getValueOrDefault($data['timezone'] ?? null, $row['timezone']);

    // Sanitizar entradas
    $nombre   = $conn->real_escape_string($nombre);
    $location = $conn->real_escape_string($location);
    $timezone = $conn->real_escape_string($timezone);

    $temp_max = is_numeric($temp_max) ? (float)$temp_max : (float)$row['max_temperature'];
    $temp_min = is_numeric($temp_min) ? (float)$temp_min : (float)$row['min_temperature'];
    $hum_max  = is_numeric($hum_max)  ? (float)$hum_max  : (float)$row['max_humidity'];
    $hum_min  = is_numeric($hum_min)  ? (float)$hum_min  : (float)$row['min_humidity'];
    $latitude = is_numeric($latitude) ? (float)$latitude : (float)$row['latitude'];
    $altitude = is_numeric($altitude) ? (float)$altitude : (float)$row['altitude'];

    // Actualizar la configuración de la estación
    $sqlUpdate = "
        UPDATE station SET
            model = '$nombre',
            max_temperature = $temp_max,
            min_temperature = $temp_min,
            max_humidity = $hum_max,
            min_humidity = $hum_min,
            location = '$location',
            timezone = '$timezone',
            latitude = $latitude,
            altitude = $altitude
        WHERE serial_number = '$serial_number'
        LIMIT 1
    ";

    if ($conn->query($sqlUpdate) === TRUE) {
        echo json_encode(['success' => true, 'message' => 'Configuración actualizada correctamente.']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'No se pudo actualizar la configuración. Error: ' . $conn->error]);
    }

    $conn->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
