<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}
function title(array $input): string {
    $value = trim((string)($input['title'] ?? ''));
    if ($value === '' || strlen($value) > 500) respond(422, ['error' => 'Please enter a title between 1 and 500 bytes.']);
    return $value;
}
function description(array $input): string {
    $value = $input['description'] ?? '';
    if (!is_string($value) || strlen($value) > 20000) respond(422, ['error' => 'Please keep the description under 5,000 characters.']);
    return trim($value);
}

$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['GET', 'POST'], true)) {
    header('Allow: GET, POST');
    respond(405, ['error' => 'Method not allowed.']);
}
// Requiring JSON prevents cross-origin HTML forms from changing the notebook.
if ($method === 'POST' && stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) respond(415, ['error' => 'JSON required.']);
$file = __DIR__ . '/training.json';
$lock = fopen(__DIR__ . '/training.lock', 'c');
if (!$lock || !flock($lock, LOCK_EX)) respond(503, ['error' => 'Notebook is busy. Please try again.']);
try {
    if (file_exists($file)) {
        $data = json_decode(file_get_contents($file), true, 512, JSON_THROW_ON_ERROR);
    } else {
        $names = ['Serve', 'Forehand ground stroke', 'Backhand ground stroke', 'Forehand slice', 'Backhand slice', 'Forehand dropshot', 'Backhand dropshot', 'Lobbing', 'Hit on rise', 'Attack high ball', 'Attack short low ball', 'Attack short high ball', 'Volley'];
        $data = ['skills' => array_map(fn($name) => ['id' => bin2hex(random_bytes(8)), 'title' => $name, 'tips' => []], $names)];
    }
    // Older notebooks contain title-only tips; descriptions are optional.
    foreach ($data['skills'] as &$existingSkill) {
        foreach ($existingSkill['tips'] as &$existingTip) {
            $existingTip['description'] = $existingTip['description'] ?? '';
        }
        unset($existingTip);
    }
    unset($existingSkill);
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true, 32, JSON_THROW_ON_ERROR);
        if (!is_array($input)) respond(422, ['error' => 'Invalid request.']);
        $action = $input['action'] ?? '';
        if ($action === 'addSkill') {
            $data['skills'][] = ['id' => bin2hex(random_bytes(8)), 'title' => title($input), 'tips' => []];
        } else {
            $skillIndex = array_search($input['skillId'] ?? '', array_column($data['skills'], 'id'), true);
            if ($skillIndex === false) respond(404, ['error' => 'This skill no longer exists.']);
            $skill = &$data['skills'][$skillIndex];
            if ($action === 'editSkill') $skill['title'] = title($input);
            elseif ($action === 'deleteSkill') array_splice($data['skills'], $skillIndex, 1);
            elseif ($action === 'addTip') $skill['tips'][] = ['id' => bin2hex(random_bytes(8)), 'title' => title($input), 'description' => description($input), 'count' => 0];
            elseif (in_array($action, ['editTip', 'deleteTip', 'vote'], true)) {
                $tipIndex = array_search($input['tipId'] ?? '', array_column($skill['tips'], 'id'), true);
                if ($tipIndex === false) respond(404, ['error' => 'This tip no longer exists.']);
                if ($action === 'editTip') {
                    $skill['tips'][$tipIndex]['title'] = title($input);
                    if (array_key_exists('description', $input)) $skill['tips'][$tipIndex]['description'] = description($input);
                }
                elseif ($action === 'deleteTip') array_splice($skill['tips'], $tipIndex, 1);
                else $skill['tips'][$tipIndex]['count']++;
            } else respond(422, ['error' => 'Unknown action.']);
            unset($skill);
        }
    }
    if ($method === 'POST' || !file_exists($file)) {
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        $temp = $file . '.tmp';
        if (file_put_contents($temp, $json) === false || !rename($temp, $file)) throw new RuntimeException('Save failed');
    }
    flock($lock, LOCK_UN);
    fclose($lock);
    respond(200, $data);
} catch (JsonException $e) {
    respond(400, ['error' => 'Could not read the notebook or request JSON.']);
} catch (Throwable $e) {
    respond(500, ['error' => 'Could not save your notebook. Check folder write permissions and try again.']);
}
