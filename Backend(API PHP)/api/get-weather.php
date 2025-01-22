<?php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require 'auth.php';

header('Content-Type: application/json');

$user = verifyAuthentication();

$apiKey = '6891f6c960906bd04a593509675aeb2d';
$maxDailyRequests = 10;

$usuarioId = $user['usuario_id'];

$requestFile = "user_requests/{$usuarioId}_requests.json";

$data = json_decode(file_get_contents("php://input"), true);
$latitude = $data['latitude'] ?? null;
$longitude = $data['longitude'] ?? null;

if (!$latitude || !$longitude) {
    echo json_encode(['error' => 'Coordenadas inválidas']);
    exit;
}

if (file_exists($requestFile)) {
    $requestData = json_decode(file_get_contents($requestFile), true);
    $peticionesRealizadas = $requestData['peticiones_realizadas'];
    $fechaUltimaPeticion = $requestData['fecha_ultimo_acceso'];
    $ultimaLatitud = $requestData['latitud'] ?? null;
    $ultimaLongitud = $requestData['longitud'] ?? null;
    $fechaHoy = date('Y-m-d');

    if ($peticionesRealizadas >= $maxDailyRequests && date('Y-m-d', strtotime($fechaUltimaPeticion)) == $fechaHoy) {
        echo json_encode(['error' => 'Límite de peticiones alcanzado para hoy']);
        exit;
    }

    if ($latitude == $ultimaLatitud && $longitude == $ultimaLongitud && (time() - strtotime($fechaUltimaPeticion) < 86400)) {
        echo json_encode($requestData['response']);
        exit;
    }

    if (date('Y-m-d', strtotime($fechaUltimaPeticion)) === $fechaHoy) {
        $peticionesRealizadas++;
    } else {
        $peticionesRealizadas = 1;
    }
} else {
    $peticionesRealizadas = 1;
    $fechaUltimaPeticion = date('Y-m-d H:i:s');
}

$weatherApiUrl = "https://api.openweathermap.org/data/2.5/forecast?lat=$latitude&lon=$longitude&appid=$apiKey";
$response = file_get_contents($weatherApiUrl);

if (!$response) {
    echo json_encode(['error' => 'No se pudo obtener datos de OpenWeather']);
    exit;
}

$requestData = [
    'peticiones_realizadas' => $peticionesRealizadas,
    'fecha_ultimo_acceso' => date('Y-m-d H:i:s'),
    'latitud' => $latitude,
    'longitud' => $longitude,
    'response' => json_decode($response)
];

file_put_contents($requestFile, json_encode($requestData));

echo $response;
?>
