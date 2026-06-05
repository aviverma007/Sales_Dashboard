<?php
/**
 * VendorGlobe API Proxy
 * Deploy this file at: https://smartworlddevelopersonline.com/bi-power/vg_proxy.php
 * OR any path on the same server
 *
 * The React dashboard calls this proxy, which calls the internal APIs
 * since this PHP runs ON the server (inside the network).
 */

// Allow CORS from your dashboard domain
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

// ── VendorGlobe login credentials ────────────────────────────────────────────
define('VG_EMAIL',    'sunny.batra@smartworlddevelopers.com');
define('VG_PASSWORD', 'swd@2021');

// ── Internal API endpoints ────────────────────────────────────────────────────
$ENDPOINTS = [
    'pr'     => 'https://smartworlddevelopersonline.com/bi-power/bi_prs.php',
    'nfa'    => 'https://smartworlddevelopersonline.com/bi-power/bi_nfas.php',
    'market' => 'https://smartworlddevelopersonline.com/bi-power/bi_market_place.php',
    'eot'    => 'https://smartworlddevelopersonline.com/bi-power/bi_eot.php',
];

$type = $_GET['type'] ?? $_POST['type'] ?? 'pr';

if (!isset($ENDPOINTS[$type])) {
    http_response_code(400);
    echo json_encode(['error' => 'Unknown type: '.$type]);
    exit;
}

$url = $ENDPOINTS[$type];

// ── Step 1: Login to get session cookie ──────────────────────────────────────
$cookieFile = sys_get_temp_dir() . '/vg_session_' . md5(VG_EMAIL) . '.txt';

$loginData = http_build_query([
    'email'    => VG_EMAIL,
    'password' => VG_PASSWORD,
    'username' => VG_EMAIL,
]);

// Try login if cookie is stale (>30 min)
$needLogin = !file_exists($cookieFile) || (time() - filemtime($cookieFile)) > 1800;

if ($needLogin) {
    $loginUrls = [
        'https://smartworlddevelopersonline.com/bi-power/login.php',
        'https://smartworlddevelopersonline.com/login.php',
        'https://smartworlddevelopersonline.com/bi-power/auth.php',
    ];
    foreach ($loginUrls as $loginUrl) {
        $ch = curl_init($loginUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $loginData,
            CURLOPT_COOKIEJAR      => $cookieFile,
            CURLOPT_COOKIEFILE     => $cookieFile,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_USERAGENT      => 'Mozilla/5.0',
            CURLOPT_TIMEOUT        => 10,
        ]);
        $resp = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code === 200) break;
    }
}

// ── Step 2: Fetch the actual API endpoint with session ───────────────────────
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_COOKIEFILE     => $cookieFile,
    CURLOPT_COOKIEJAR      => $cookieFile,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_USERAGENT      => 'Mozilla/5.0',
    CURLOPT_HTTPHEADER     => [
        'Accept: application/json',
        'Referer: https://smartworlddevelopersonline.com/',
    ],
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_FOLLOWLOCATION => true,
]);

$response = curl_exec($ch);
$httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(500);
    echo json_encode(['error' => 'cURL error: ' . $curlError]);
    exit;
}

if ($httpCode !== 200) {
    http_response_code($httpCode);
    echo json_encode(['error' => "API returned HTTP $httpCode", 'raw' => substr($response, 0, 500)]);
    exit;
}

// Try to decode JSON; if not JSON return as-is
$decoded = json_decode($response, true);
if (json_last_error() === JSON_ERROR_NONE) {
    echo json_encode($decoded);
} else {
    // Return raw with metadata
    echo json_encode(['raw' => $response, 'note' => 'Non-JSON response from API']);
}
