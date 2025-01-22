<?php
require_once 'db.php';
require_once 'auth.php';

header('Content-Type: application/json');

try {
    // Verificar autenticación
    $sessionData    = verifyAuthentication();
    $usuarioID      = $sessionData['usuario_id'];
    $nombreUsuario  = $sessionData['nombre'];

    // Conexión a la base de datos
    $conn = getDbConnection();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Determinar filtro
        $filter = $_GET['filter'] ?? 'all'; // day, week, month, all
        $timeCondition = '';
        if ($filter === 'day') {
            // Últimas 24 horas
            $timeCondition = " AND i.occurred_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) ";
        } elseif ($filter === 'week') {
            // Últimos 7 días
            $timeCondition = " AND i.occurred_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) ";
        } elseif ($filter === 'month') {
            // Últimos 30 días (aprox. 1 mes)
            $timeCondition = " AND i.occurred_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) ";
        }

        // Consulta principal
        $sql = "
            SELECT i.serial_number,
                   i.occurred_at,
                   i.parameter_exceeded,
                   i.value,
                   s.station_name,
                   s.min_temperature,
                   s.max_temperature,
                   s.location,
                   s.timezone,
                   s.latitude,
                   s.altitude
            FROM incident i
            INNER JOIN station s ON i.serial_number = s.serial_number
            WHERE s.user_id = ?
            $timeCondition
            ORDER BY i.serial_number ASC,
                     i.parameter_exceeded ASC,
                     i.occurred_at ASC
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $usuarioID);
        $stmt->execute();
        $result = $stmt->get_result();

        // Extraemos todas las filas
        $rawIncidencias = [];
        while ($row = $result->fetch_assoc()) {
            $rawIncidencias[] = $row;
        }

        // Tiempo máximo de separación (2 minutos)
        $TIEMPO_MAX_SEPARACION = 120; // 2 * 60

        // Arreglo final de incidencias agrupadas
        $incidenciasAgrupadas = [];

        // Variables de control del grupo actual
        $ultimoSerial = null;
        $ultimoParametro = null;
        $fechaInicio = null;
        $fechaFin = null;
        $fechaFinTimestamp = null;
        $stationDetails = [];

        foreach ($rawIncidencias as $incidencia) {
            $serialActual      = $incidencia['serial_number'];
            $paramActual       = $incidencia['parameter_exceeded'];
            $fechaActual       = $incidencia['occurred_at'];
            $valorExcedido     = $incidencia['value'];

            // Info de estación
            $nombreEstacion    = $incidencia['station_name'] ?? 'No especificada';
            $minTemp           = $incidencia['min_temperature'];
            $maxTemp           = $incidencia['max_temperature'];
            $location          = $incidencia['location'];
            $timezone          = $incidencia['timezone'];
            $latitude          = $incidencia['latitude'];
            $altitude          = $incidencia['altitude'];

            // Parche: si viene TEMPERATURE_ sin HIGH/LOW
            if ($paramActual === 'TEMPERATURE_') {
                if ($valorExcedido > $maxTemp) {
                    $paramActual = 'TEMPERATURE_HIG';
                } elseif ($valorExcedido < $minTemp) {
                    $paramActual = 'TEMPERATURE_LOW';
                }
            }

            $fechaActualTs = strtotime($fechaActual);

            if ($ultimoSerial === null) {
                // Primer grupo
                $ultimoSerial       = $serialActual;
                $ultimoParametro    = $paramActual;
                $fechaInicio        = $fechaActual;
                $fechaFin           = $fechaActual;
                $fechaFinTimestamp  = $fechaActualTs;

                $stationDetails = [
                    'station_name'   => $nombreEstacion,
                    'min_temperature'=> $minTemp,
                    'max_temperature'=> $maxTemp,
                    'location'       => $location,
                    'timezone'       => $timezone,
                    'latitude'       => $latitude,
                    'altitude'       => $altitude
                ];
                continue;
            }

            // Diferencia con el fin anterior
            $diferenciaSegundos = $fechaActualTs - $fechaFinTimestamp;

            if (
                $serialActual !== $ultimoSerial ||
                $paramActual !== $ultimoParametro ||
                $diferenciaSegundos > $TIEMPO_MAX_SEPARACION
            ) {
                // Cerrar grupo anterior
                $duracion = calcularDuracion(strtotime($fechaFin) - strtotime($fechaInicio));
                $incidenciasAgrupadas[] = [
                    'serial_number' => $ultimoSerial,
                    'parametro'     => $ultimoParametro,
                    'fecha_inicio'  => $fechaInicio,
                    'fecha_fin'     => $fechaFin,
                    'duracion'      => $duracion,
                    // Info de estación
                    'station_name'   => $stationDetails['station_name'],
                    'min_temperature'=> $stationDetails['min_temperature'],
                    'max_temperature'=> $stationDetails['max_temperature'],
                    'location'       => $stationDetails['location'],
                    'timezone'       => $stationDetails['timezone'],
                    'latitude'       => $stationDetails['latitude'],
                    'altitude'       => $stationDetails['altitude']
                ];

                // Nuevo grupo
                $ultimoSerial       = $serialActual;
                $ultimoParametro    = $paramActual;
                $fechaInicio        = $fechaActual;
                $fechaFin           = $fechaActual;
                $fechaFinTimestamp  = $fechaActualTs;

                $stationDetails = [
                    'station_name'   => $nombreEstacion,
                    'min_temperature'=> $minTemp,
                    'max_temperature'=> $maxTemp,
                    'location'       => $location,
                    'timezone'       => $timezone,
                    'latitude'       => $latitude,
                    'altitude'       => $altitude
                ];
            } else {
                // Continuar en el mismo grupo
                $fechaFin = $fechaActual;
                $fechaFinTimestamp = $fechaActualTs;
            }
        }

        // Cerrar el último grupo si quedó abierto
        if ($ultimoSerial !== null) {
            $duracion = calcularDuracion(strtotime($fechaFin) - strtotime($fechaInicio));
            $incidenciasAgrupadas[] = [
                'serial_number' => $ultimoSerial,
                'parametro'     => $ultimoParametro,
                'fecha_inicio'  => $fechaInicio,
                'fecha_fin'     => $fechaFin,
                'duracion'      => $duracion,
                'station_name'   => $stationDetails['station_name'],
                'min_temperature'=> $stationDetails['min_temperature'],
                'max_temperature'=> $stationDetails['max_temperature'],
                'location'       => $stationDetails['location'],
                'timezone'       => $stationDetails['timezone'],
                'latitude'       => $stationDetails['latitude'],
                'altitude'       => $stationDetails['altitude']
            ];
        }

        echo json_encode([
            'success'       => true,
            'nombreUsuario' => $nombreUsuario,
            'reportes'      => $incidenciasAgrupadas
        ]);
        $conn->close();
        exit;
    }

    // Método no permitido
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
    $conn->close();
    exit;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

function calcularDuracion($segundos) {
    if ($segundos <= 0) return "0s";
    $horas = floor($segundos / 3600);
    $minutos = floor(($segundos % 3600) / 60);
    $secs = $segundos % 60;

    $resultado = [];
    if ($horas > 0) {
        $resultado[] = "{$horas}h";
    }
    if ($minutos > 0) {
        $resultado[] = "{$minutos}m";
    }
    if ($secs > 0) {
        $resultado[] = "{$secs}s";
    }
    return implode(' ', $resultado);
}
