<?php
/**
 * SAP SQL Server Proxy
 * Deploy at: https://smartworlddevelopersonline.com/bi-power/sap_proxy.php
 *
 * Requires PHP with sqlsrv extension OR PDO_SQLSRV
 * Install: apt-get install php-sqlsrv  OR  pecl install sqlsrv
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

// ── SAP SQL Server credentials ────────────────────────────────────────────────
define('SAP_HOST', '192.168.66.33');
define('SAP_USER', 'sa');
define('SAP_PASS', 'Admin#123');
define('SAP_DB',   'SWDBIDB');

// Allowed queries (whitelist for security)
$ALLOWED_TABLES = ['EKKO','EKPO','EBAN','EKBE','LFA1','MARA','T024','T161','PRPS','AUFK'];

$input = json_decode(file_get_contents('php://input'), true);
$queryType = $input['query_type'] ?? 'custom';
$customQuery = $input['query'] ?? null;

// ── Predefined queries for PR Journey ────────────────────────────────────────
$QUERIES = [
    // Purchase Orders header
    'po_list' => "SELECT TOP 1000
        k.EBELN AS po_number,
        k.BEDAT AS po_date,
        k.LIFNR AS vendor_code,
        k.BSART AS po_type,
        k.NETWR AS net_value,
        k.WAERS AS currency,
        k.EKGRP AS purchasing_group,
        k.BUKRS AS company_code,
        k.WERKS AS plant,
        k.LOEKZ AS deletion_flag,
        k.FRGKE AS release_status
    FROM EKKO k
    WHERE k.BEDAT >= DATEADD(year,-2,GETDATE())
    ORDER BY k.BEDAT DESC",

    // PO line items
    'po_items' => "SELECT TOP 2000
        p.EBELN AS po_number,
        p.EBELP AS item,
        p.MATNR AS material,
        p.TXZ01 AS description,
        p.MENGE AS quantity,
        p.MEINS AS unit,
        p.NETPR AS net_price,
        p.NETWR AS net_value,
        p.EINDT AS delivery_date,
        p.WERKS AS plant,
        p.SAKTO AS gl_account,
        p.KOSTL AS cost_center,
        p.PS_PSP_PNR AS wbs_element,
        p.MATKL AS material_group
    FROM EKPO p
    WHERE p.LOEKZ = '' AND p.ELIKZ = ''
    ORDER BY p.EBELN DESC",

    // Purchase Requisitions
    'pr_list' => "SELECT TOP 1000
        b.BANFN AS pr_number,
        b.BNFPO AS item,
        b.TXZ01 AS description,
        b.MATNR AS material,
        b.MATKL AS material_group,
        b.MENGE AS quantity,
        b.MEINS AS unit,
        b.PREIS AS price,
        b.WAERS AS currency,
        b.AFNAM AS requester,
        b.BADAT AS pr_date,
        b.FRGKZ AS release_flag,
        b.FRGZU AS release_status,
        b.EKGRP AS purchasing_group,
        b.WERKS AS plant,
        b.PS_PSP_PNR AS wbs_element,
        b.EBELN AS po_number
    FROM EBAN b
    WHERE b.LOEKZ = '' AND b.BADAT >= DATEADD(year,-2,GETDATE())
    ORDER BY b.BADAT DESC",

    // PR to PO linkage
    'pr_to_po' => "SELECT
        b.BANFN AS pr_number,
        b.BNFPO AS pr_item,
        b.EBELN AS po_number,
        b.EBELP AS po_item,
        b.TXZ01 AS description,
        b.AFNAM AS requester,
        b.BADAT AS pr_date,
        k.BEDAT AS po_date,
        b.FRGZU AS pr_release_status,
        k.FRGKE AS po_release_status,
        b.MENGE AS quantity,
        b.PREIS AS price,
        k.LIFNR AS vendor,
        k.NETWR AS po_value,
        b.PS_PSP_PNR AS wbs_element
    FROM EBAN b
    LEFT JOIN EKKO k ON b.EBELN = k.EBELN
    WHERE b.LOEKZ = '' AND b.BADAT >= DATEADD(year,-2,GETDATE())
    ORDER BY b.BADAT DESC",

    // PO GRN/delivery status
    'po_grn' => "SELECT TOP 500
        h.EBELN AS po_number,
        h.EBELP AS po_item,
        h.VGABE AS movement_type,
        h.MENGE AS quantity,
        h.BUDAT AS posting_date,
        h.BELNR AS doc_number,
        h.DMBTR AS amount
    FROM EKBE h
    WHERE h.VGABE IN ('1','2','3')
    ORDER BY h.BUDAT DESC",

    // Vendor master
    'vendors' => "SELECT TOP 500
        l.LIFNR AS vendor_code,
        l.NAME1 AS vendor_name,
        l.ORT01 AS city,
        l.LAND1 AS country,
        l.TELF1 AS phone,
        l.KTOKK AS account_group
    FROM LFA1 l
    ORDER BY l.NAME1",
];

// ── Connect and query ─────────────────────────────────────────────────────────
try {
    // Try sqlsrv extension first
    if (function_exists('sqlsrv_connect')) {
        $conn = sqlsrv_connect(SAP_HOST, [
            'Database'             => SAP_DB,
            'UID'                  => SAP_USER,
            'PWD'                  => SAP_PASS,
            'LoginTimeout'         => 10,
            'TrustServerCertificate' => true,
        ]);
        if (!$conn) {
            $errors = sqlsrv_errors();
            throw new Exception('sqlsrv connect failed: ' . json_encode($errors));
        }
        $sql = isset($QUERIES[$queryType]) ? $QUERIES[$queryType] : $customQuery;
        if (!$sql) throw new Exception('No query specified');

        $stmt = sqlsrv_query($conn, $sql);
        if (!$stmt) throw new Exception('Query failed: ' . json_encode(sqlsrv_errors()));

        $rows = [];
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            // Convert DateTime objects to strings
            foreach ($row as $k => $v) {
                if ($v instanceof DateTime) $row[$k] = $v->format('Y-m-d');
                elseif (is_resource($v)) $row[$k] = null;
            }
            $rows[] = $row;
        }
        sqlsrv_free_stmt($stmt);
        sqlsrv_close($conn);

    } else {
        // Fallback: PDO with ODBC
        $dsn = "sqlsrv:Server=".SAP_HOST.";Database=".SAP_DB.";TrustServerCertificate=1";
        $pdo = new PDO($dsn, SAP_USER, SAP_PASS, [PDO::ATTR_TIMEOUT => 10]);
        $sql = isset($QUERIES[$queryType]) ? $QUERIES[$queryType] : $customQuery;
        if (!$sql) throw new Exception('No query specified');
        $stmt = $pdo->query($sql);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    echo json_encode([
        'success'      => true,
        'query_type'   => $queryType,
        'count'        => count($rows),
        'data'         => $rows,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage(),
        'note'    => 'Ensure php-sqlsrv extension is installed and SAP DB is reachable from this server',
    ]);
}
