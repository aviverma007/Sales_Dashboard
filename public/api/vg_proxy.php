<?php
/**
 * VendorGlobe API Proxy — upload to:
 * https://smartworlddevelopersonline.com/bi-power/vg_proxy.php
 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

define('VG_EMAIL',    'sunny.batra@smartworlddevelopers.com');
define('VG_PASSWORD', 'swd@2021');
define('BASE_URL',    'https://smartworlddevelopersonline.com/bi-power');

$ENDPOINTS = [
    'pr'     => BASE_URL . '/bi_prs.php',
    'nfa'    => BASE_URL . '/bi_nfas.php',
    'market' => BASE_URL . '/bi_market_place.php',
    'eot'    => BASE_URL . '/bi_eot.php',
];

$type = $_GET['type'] ?? $_POST['type'] ?? 'pr';
if (!isset($ENDPOINTS[$type])) {
    http_response_code(400);
    echo json_encode(['error' => 'Unknown type: ' . $type]);
    exit;
}

$cookieFile = sys_get_temp_dir() . '/vg_ci_' . md5(VG_EMAIL) . '.txt';

// Re-login if cookie file is older than 20 minutes
if (!file_exists($cookieFile) || (time() - filemtime($cookieFile)) > 1200) {
    // Step 1: GET the login page to get initial session cookie
    $ch = curl_init(BASE_URL . '/home/login');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_COOKIEJAR      => $cookieFile,
        CURLOPT_COOKIEFILE     => $cookieFile,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        CURLOPT_TIMEOUT        => 10,
    ]);
    curl_exec($ch);
    curl_close($ch);

    // Step 2: POST login credentials
    $ch = curl_init(BASE_URL . '/home/login');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query([
            'email'    => VG_EMAIL,
            'password' => VG_PASSWORD,
        ]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_COOKIEJAR      => $cookieFile,
        CURLOPT_COOKIEFILE     => $cookieFile,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        CURLOPT_HTTPHEADER     => [
            'Referer: ' . BASE_URL . '/home/login',
            'Origin: https://smartworlddevelopersonline.com',
        ],
        CURLOPT_TIMEOUT        => 15,
    ]);
    $loginResp = curl_exec($ch);
    $loginCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    // Log login result for debugging
    file_put_contents(sys_get_temp_dir() . '/vg_debug.txt',
        date('Y-m-d H:i:s') . " Login HTTP $loginCode\n" . substr($loginResp, 0, 500) . "\n",
        FILE_APPEND);
}

// Step 3: Fetch the actual API with session cookie
$ch = curl_init($ENDPOINTS[$type]);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_COOKIEFILE     => $cookieFile,
    CURLOPT_COOKIEJAR      => $cookieFile,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    CURLOPT_HTTPHEADER     => [
        'Accept: application/json, text/plain, */*',
        'Referer: ' . BASE_URL . '/home/dashboard',
        'X-Requested-With: XMLHttpRequest',
    ],
    CURLOPT_TIMEOUT        => 30,
]);

$response  = curl_exec($ch);
$httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    echo json_encode(['error' => 'cURL: ' . $curlError]);
    exit;
}

// If still unauthorized — delete cookie and try once more
if ($httpCode === 401 || strpos($response, 'unauthorized') !== false) {
    @unlink($cookieFile); // Force re-login next call
    echo json_encode([
        'error'    => 'Session expired or login failed',
        'httpCode' => $httpCode,
        'hint'     => 'Cookie cleared — retry the request',
    ]);
    exit;
}

$decoded = json_decode($response, true);
if (json_last_error() === JSON_ERROR_NONE) {
    echo json_encode($decoded);
} else {
    echo json_encode(['raw' => substr($response, 0, 2000), 'note' => 'Non-JSON response']);
}
