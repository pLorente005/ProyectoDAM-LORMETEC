<?php
/***********************************************************
 * Incluir el archivo de conexión
 ***********************************************************/
require_once __DIR__ . '/../db.php';  

/***********************************************************
 * Token de seguridad
 ***********************************************************/
$apiToken = "TuTokenDeSeguridad123";

/***********************************************************
 * Lógica principal del script
 ***********************************************************/
// Recibir los datos JSON enviados por POST
$data = json_decode(file_get_contents('php://input'), true);

// Registros de depuración (opcional)
error_log("Datos recibidos (raw): " . file_get_contents('php://input'));
error_log("Datos decodificados (array): " . print_r($data, true));

// Verificar si se recibió la información requerida
if (
    isset($data['temperature']) &&
    isset($data['humidity']) &&
    isset($data['serial_number']) &&
    isset($data['api_token']) &&
    $data['api_token'] === $apiToken
) {
    // Extraer variables
    $temperature   = $data['temperature'];
    $humidity      = $data['humidity'];
    $serial_number = $data['serial_number'];

    try {
        // Crear conexión a la base de datos usando db.php
        $conn = getDbConnection();
    } catch (Exception $e) {
        error_log("Conexión fallida: " . $e->getMessage());
        die("Error al conectar con la BD");
    }

    // 1) Recuperar límites de la estación
    $sqlLimits = "SELECT max_temperature, min_temperature, max_humidity, min_humidity 
                  FROM station
                  WHERE serial_number = ?";
    $stmtLimits = $conn->prepare($sqlLimits);
    $stmtLimits->bind_param("s", $serial_number);
    $stmtLimits->execute();
    $resultLimits = $stmtLimits->get_result();

    if ($resultLimits->num_rows > 0) {
        // Hay una estación registrada con este número de serie
        $stationInfo = $resultLimits->fetch_assoc();

        $maxTemp = (double)$stationInfo['max_temperature'];
        $minTemp = (double)$stationInfo['min_temperature'];
        $maxHum  = (double)$stationInfo['max_humidity'];
        $minHum  = (double)$stationInfo['min_humidity'];

        // 2) Insertar el registro en station_data
        $sqlInsertData = "INSERT INTO station_data (serial_number, temperature, humidity) VALUES (?, ?, ?)";
        $stmtData = $conn->prepare($sqlInsertData);
        $stmtData->bind_param("sdd", $serial_number, $temperature, $humidity);

        if ($stmtData->execute()) {
            echo "Datos de estación insertados correctamente. ";

            // 3) Verificar si la temperatura o humedad están fuera de rango
            $incidentHappened = false;

            if ($temperature > $maxTemp) {
                $incidentHappened = true;
                insertIncident($conn, $serial_number, "TEMPERATURE_HIGH", $temperature);
            } elseif ($temperature < $minTemp) {
                $incidentHappened = true;
                insertIncident($conn, $serial_number, "TEMPERATURE_LOW", $temperature);
            }

            if ($humidity > $maxHum) {
                $incidentHappened = true;
                insertIncident($conn, $serial_number, "HUMIDITY_HIGH", $humidity);
            } elseif ($humidity < $minHum) {
                $incidentHappened = true;
                insertIncident($conn, $serial_number, "HUMIDITY_LOW", $humidity);
            }

            if ($incidentHappened) {
                echo "Incidente registrado por valor fuera de rango.";
            }
        } else {
            error_log("Error al insertar datos de estación: " . $stmtData->error);
            echo "Error al insertar datos de estación: " . $stmtData->error;
        }

        $stmtData->close();
    } else {
        echo "Error: La estación con serial_number=$serial_number no está registrada en la BD.";
    }

    $stmtLimits->close();
    $conn->close();

} else {
    error_log("Error: Datos incompletos o token inválido");
    echo "Error: Datos incompletos o token inválido";
}

/***********************************************************
 * Función auxiliar para insertar incidentes
 ***********************************************************/
function insertIncident($conn, $serialNumber, $parameter, $value) {
    $sqlIncident = "INSERT INTO incident (serial_number, parameter_exceeded, value)
                    VALUES (?, ?, ?)";
    $stmtIncident = $conn->prepare($sqlIncident);
    $stmtIncident->bind_param("ssd", $serialNumber, $parameter, $value);
    if (!$stmtIncident->execute()) {
        error_log("Error al insertar incidente: " . $stmtIncident->error);
    }
    $stmtIncident->close();
}
?>
