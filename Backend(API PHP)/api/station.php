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

    // 1) Obtener info de la estación (para saber zona horaria)
    $stmt = $conn->prepare("
        SELECT model, user_id, max_temperature, min_temperature,
               max_humidity, min_humidity, location, timezone,
               latitude, altitude
        FROM station
        WHERE serial_number = ?
    ");
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

    // Obtenemos la zona horaria de la estación
    $stationTimezone = $stationInfo['timezone'] ?: 'UTC';
    $tz = new DateTimeZone($stationTimezone);

    // 2) Obtener activa_desde (el registro más antiguo)
    $stmt = $conn->prepare("
        SELECT MIN(recorded_at) AS activa_desde
        FROM station_data
        WHERE serial_number = ?
    ");
    $stmt->bind_param("s", $serialNumber);
    $stmt->execute();
    $resActiva = $stmt->get_result();
    $activaDesde = null;
    if ($row = $resActiva->fetch_assoc()) {
        $activaDesde = $row['activa_desde'];
    }
    $stmt->close();

    // 3) Obtener último registro para estado (Operativa si datos en la última hora)
    $stmt = $conn->prepare("
        SELECT MAX(recorded_at) AS last_reading
        FROM station_data
        WHERE serial_number = ?
    ");
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

    // 4) Construir la parte de la consulta que filtra por fecha/hora (o no)
    $whereClause = "";
    $params = [];
    $types = "s"; // Siempre al menos para el serial_number
    $serialParam = $serialNumber;

    // Verificamos si tenemos fecha y hora
    if (!empty($fecha) && !empty($hora)) {
        // Interpretar fecha/hora como hora local de la estación
        if (strlen($hora) === 5) {
            $hora .= ":00"; // añadir segundos
        }
        $localDateTimeString = $fecha . " " . $hora;

        // Crear DateTime interpretado en la zona horaria de la estación
        $stationDateTimeStart = new DateTime($localDateTimeString, $tz);
        // Clonar para tener el final (+1 hora, por ejemplo)
        $stationDateTimeEnd = clone $stationDateTimeStart;
        $stationDateTimeEnd->modify('+1 hour');

        // Convertir ambos a UTC para filtrar en la base de datos (asumiendo que stored_at es UTC)
        $stationDateTimeStart->setTimezone(new DateTimeZone('UTC'));
        $stationDateTimeEnd->setTimezone(new DateTimeZone('UTC'));

        $startDateTimeUTC = $stationDateTimeStart->format("Y-m-d H:i:s");
        $endDateTimeUTC   = $stationDateTimeEnd->format("Y-m-d H:i:s");

        $whereClause = " AND recorded_at >= ? AND recorded_at < ? ";
        $params = [$serialParam, $startDateTimeUTC, $endDateTimeUTC];
        $types = "sss"; // serial, start, end
    } else {
        // No se especificó fecha/hora -> solo los últimos 60 registros
        $whereClause = "";
        $params = [$serialParam];
        $types = "s";
    }

    // 5) Consulta principal: tomamos en cuenta la cláusula y limitamos a 60 resultados
    //    IMPORTANTE: consultamos en orden DESC para coger los últimos 60, luego daremos la vuelta al array.
    $sqlData = "
        SELECT temperature, humidity, recorded_at
        FROM station_data
        WHERE serial_number = ? 
        $whereClause
        ORDER BY recorded_at DESC
        LIMIT 60
    ";
    $stmt = $conn->prepare($sqlData);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $resData = $stmt->get_result();

    $datosEstacion = [];
    while ($row = $resData->fetch_assoc()) {
        $datosEstacion[] = [
            'temperature' => (float)$row['temperature'],
            'humidity'    => (float)$row['humidity'],
            'timestamp'   => $row['recorded_at']
        ];
    }
    $stmt->close();

    // Invertimos el array para que quede en orden ascendente por fecha/hora
    $datosEstacion = array_reverse($datosEstacion);

    // 6) Datos actuales (último registro de la lista, si existe)
    $currentTemperature = null;
    $currentHumidity = null;
    if (count($datosEstacion) > 0) {
        $lastData = end($datosEstacion); // el último del array (ya en asc)
        $currentTemperature = $lastData['temperature'];
        $currentHumidity = $lastData['humidity'];
    } else {
        // Si no hay datos en este rango, buscamos el último registro global de la estación
        $stmt = $conn->prepare("
            SELECT temperature, humidity
            FROM station_data
            WHERE serial_number = ?
            ORDER BY recorded_at DESC
            LIMIT 1
        ");
        $stmt->bind_param("s", $serialNumber);
        $stmt->execute();
        $resCurrent = $stmt->get_result();
        if ($c = $resCurrent->fetch_assoc()) {
            $currentTemperature = (float)$c['temperature'];
            $currentHumidity = (float)$c['humidity'];
        }
        $stmt->close();
    }

    // 7) Construir infoEstacion
    $infoEstacion = [
        'nombre'       => $stationInfo['model'],
        'location'     => $stationInfo['location'],
        'timezone'     => $stationInfo['timezone'],
        'activa_desde' => $activaDesde
    ];

    // 8) Respuesta final
    echo json_encode([
        'success'            => true,
        'infoEstacion'       => $infoEstacion,
        'estadoEstacion'     => $estadoEstacion,
        'serialNumber'       => $serialNumber,
        'latitude'           => (float)$stationInfo['latitude'],
        'longitude'          => (float)$stationInfo['altitude'], // Ajusta según tu base de datos.
        'currentTemperature' => $currentTemperature,
        'currentHumidity'    => $currentHumidity,
        'tempMax'            => (float)$stationInfo['max_temperature'],
        'tempMin'            => (float)$stationInfo['min_temperature'],
        'humMax'             => (float)$stationInfo['max_humidity'],
        'humMin'             => (float)$stationInfo['min_humidity'],
        'datosEstacion'      => $datosEstacion
    ]);

    $conn->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
