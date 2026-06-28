<?php
/**
 * Simple image uploader for the OCR demo.
 * Saves the uploaded file under "uploads/" and returns its URL.
 * Also creates a .txt file with the OCR result (if sent).
 */

header('Content-Type: application/json');

// Configuration
$uploadDir   = __DIR__ . '/uploads/';
$allowedMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
$maxSize     = 5 * 1024 * 1024; // 5 MB

// Ensure upload folder exists
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Validate upload
if (!isset($_FILES['image'])) {
    echo json_encode(['success' => false, 'error' => 'No file uploaded']);
    exit;
}
$file = $_FILES['image'];

if ($file['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'error' => 'Upload error']);
    exit;
}
if (!in_array(mime_content_type($file['tmp_name']), $allowedMime)) {
    echo json_encode(['success' => false, 'error' => 'Unsupported file type']);
    exit;
}
if ($file['size'] > $maxSize) {
    echo json_encode(['success' => false, 'error' => 'File too large']);
    exit;
}

// Generate a safe filename
$ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
$basename = bin2hex(random_bytes(8));
$target   = $uploadDir . $basename . '.' . $ext;

// Move uploaded file
if (!move_uploaded_file($file['tmp_name'], $target)) {
    echo json_encode(['success' => false, 'error' => 'Failed to move file']);
    exit;
}

// Optional: save OCR text if sent (e.g., via another request)
if (isset($_POST['ocr_text'])) {
    $txtPath = $uploadDir . $basename . '.txt';
    file_put_contents($txtPath, $_POST['ocr_text']);
}

// Return web‑accessible path (adjust if your server serves from a different URL)
$webPath = 'uploads/' . $basename . '.' . $ext;
echo json_encode(['success' => true, 'path' => $webPath]);
?>
