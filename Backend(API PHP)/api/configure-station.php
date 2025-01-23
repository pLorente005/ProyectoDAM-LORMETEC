<?php
require_once 'db.php';
require_once 'auth.php';

header('Content-Type: application/json');

try {
    $usuarioId = verifyAuthentication();

    $conn = getDbConnection();

    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!isset($data['serial_number'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Falta el número de serie.']);
        exit;
    }

    $serial_number = $conn->real_escape_string($data['serial_number']);

    $sqlGet = "SELECT * FROM station WHERE serial_number = '$serial_number' LIMIT 1";
    $resultGet = $conn->query($sqlGet);

    if ($resultGet->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'La estación no existe.']);
        exit;
    }

    $row = $resultGet->fetch_assoc();



    function getValueOrDefault($newValue, $oldValue) {
        return (!isset($newValue) || $newValue === '') ? $oldValue : $newValue;
    }


    $nombre    = getValueOrDefault($data['nombre'] ?? null, $row['station_name']);
    $temp_max  = getValueOrDefault($data['temp_max'] ?? null, $row['max_temperature']);
    $temp_min  = getValueOrDefault($data['temp_min'] ?? null, $row['min_temperature']);
    $hum_max   = getValueOrDefault($data['hum_max'] ?? null, $row['max_humidity']);
    $hum_min   = getValueOrDefault($data['hum_min'] ?? null, $row['min_humidity']);
    $latitude  = getValueOrDefault($data['latitude'] ?? null, $row['latitude']);
    $altitude  = getValueOrDefault($data['altitude'] ?? null, $row['altitude']);
    $location  = getValueOrDefault($data['location'] ?? null, $row['location']);
    $timezone  = getValueOrDefault($data['timezone'] ?? null, $row['timezone']);

    $nombre   = $conn->real_escape_string($nombre);
    $location = $conn->real_escape_string($location);
    $timezone = $conn->real_escape_string($timezone);

    $temp_max = is_numeric($temp_max) ? (float)$temp_max : (float)$row['max_temperature'];
    $temp_min = is_numeric($temp_min) ? (float)$temp_min : (float)$row['min_temperature'];
    $hum_max  = is_numeric($hum_max)  ? (float)$hum_max  : (float)$row['max_humidity'];
    $hum_min  = is_numeric($hum_min)  ? (float)$hum_min  : (float)$row['min_humidity'];
    $latitude = is_numeric($latitude) ? (float)$latitude : (float)$row['latitude'];
    $altitude = is_numeric($altitude) ? (float)$altitude : (float)$row['altitude'];

    $sqlUpdate = "
        UPDATE station SET
            station_name = '$nombre',
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
