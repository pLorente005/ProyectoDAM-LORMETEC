<?php
require_once 'db.php';
require_once 'auth.php';

header('Content-Type: application/json');

try {
    // Verificar autenticación
    verifyAuthentication();

    // Conexión a la base de datos
    $conn = getDbConnection();

    // Obtener parámetros
    $serialNumber = isset($_GET['serial_number']) ? $_GET['serial_number'] : '';
    $fecha = isset($_GET['fecha']) ? $_GET['fecha'] : '';
    $hora = isset($_GET['hora']) ? $_GET['hora'] : '';

    if (empty($serialNumber)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Falta el parámetro serial_number.']);
        exit;
    }

    // Obtener info de la estación
    $stmt = $conn->prepare("SELECT model, user_id, max_temperature, min_temperature, max_humidity, min_humidity, location, timezone, latitude, altitude FROM station WHERE serial_number = ?");
    $stmt->bind_param("s", $serialNumber);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Estación no encontrada.']);
        exit;
    }
    $stationInfo = $result->fetch_assoc();
    $stmt->close();

    // Obtener activa_desde (el registro más antiguo)
    $stmt = $conn->prepare("SELECT MIN(recorded_at) AS activa_desde FROM station_data WHERE serial_number = ?");
    $stmt->bind_param("s", $serialNumber);
    $stmt->execute();
    $resActiva = $stmt->get_result();
    $activaDesde = null;
    if ($row = $resActiva->fetch_assoc()) {
        $activaDesde = $row['activa_desde'];
    }
    $stmt->close();

    // Obtener último registro para estado (Operativa si datos en la última hora)
    $stmt = $conn->prepare("SELECT MAX(recorded_at) AS last_reading FROM station_data WHERE serial_number = ?");
    $stmt->bind_param("s", $serialNumber);
    $stmt->execute();
    $resLast = $stmt->get_result();
    $estadoEstacion = "Inactiva";
    if ($row = $resLast->fetch_assoc()) {
        $last_reading = $row['last_reading'];
        if ($last_reading) {
            $lastTime = strtotime($last_reading);
            $oneHourAgo = strtotime("-1 hour");
            if ($lastTime >= $oneHourAgo) {
                $estadoEstacion = "Operativa";
            }
        }
    }
    $stmt->close();

    // Obtener datos filtrados
    $whereClause = "";
    $params = [];
    $types = "";

    if (!empty($fecha) && !empty($hora)) {
        if (strlen($hora) == 5) {
            $hora .= ":00";
        }
        $startDateTime = $fecha . " " . $hora;
        $endTimestamp = date("Y-m-d H:i:s", strtotime($startDateTime . " +1 hour"));

        $whereClause = "AND recorded_at >= ? AND recorded_at < ?";
        $params = [$serialNumber, $startDateTime, $endTimestamp];
        $types = "sss";
    } else {
        $whereClause = "AND recorded_at >= (NOW() - INTERVAL 24 HOUR)";
        $params = [$serialNumber];
        $types = "s";
    }

    $sqlData = "SELECT temperature, humidity, recorded_at FROM station_data WHERE serial_number = ? $whereClause ORDER BY recorded_at ASC";
    $stmt = $conn->prepare($sqlData);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $resData = $stmt->get_result();

    $datosEstacion = [];
    while ($row = $resData->fetch_assoc()) {
        $datosEstacion[] = [
            'temperature' => (float)$row['temperature'],
            'humidity' => (float)$row['humidity'],
            'timestamp' => $row['recorded_at']
        ];
    }
    $stmt->close();

    // Datos actuales (último registro para currentTemperature/currentHumidity)
    $currentTemperature = null;
    $currentHumidity = null;
    if (count($datosEstacion) > 0) {
        $lastData = end($datosEstacion);
        $currentTemperature = $lastData['temperature'];
        $currentHumidity = $lastData['humidity'];
    } else {
        $stmt = $conn->prepare("SELECT temperature, humidity FROM station_data WHERE serial_number = ? ORDER BY recorded_at DESC LIMIT 1");
        $stmt->bind_param("s", $serialNumber);
        $stmt->execute();
        $resCurrent = $stmt->get_result();
        if ($c = $resCurrent->fetch_assoc()) {
            $currentTemperature = (float)$c['temperature'];
            $currentHumidity = (float)$c['humidity'];
        }
        $stmt->close();
    }

    // Construir infoEstacion
    $infoEstacion = [
        'nombre' => $stationInfo['model'],
        'location' => $stationInfo['location'],
        'timezone' => $stationInfo['timezone'],
        'activa_desde' => $activaDesde
    ];

    echo json_encode([
        'success' => true,
        'infoEstacion' => $infoEstacion,
        'estadoEstacion' => $estadoEstacion,
        'serialNumber' => $serialNumber,
        'latitude' => (float)$stationInfo['latitude'],
        'longitude' => (float)$stationInfo['altitude'], // Ajusta según tu base de datos.
        'currentTemperature' => $currentTemperature,
        'currentHumidity' => $currentHumidity,
        'tempMax' => (float)$stationInfo['max_temperature'],
        'tempMin' => (float)$stationInfo['min_temperature'],
        'humMax' => (float)$stationInfo['max_humidity'],
        'humMin' => (float)$stationInfo['min_humidity'],
        'datosEstacion' => $datosEstacion
    ]);

    $conn->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>