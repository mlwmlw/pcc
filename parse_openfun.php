<?php

date_default_timezone_set('Asia/Taipei');

class OpenFunFetcher
{
    private const API_BASE = 'https://pcc-api.openfun.app/api';

    public function __construct()
    {
        $this->ensureDir(__DIR__ . '/list_openfun');
        $this->ensureDir(__DIR__ . '/tender_openfun');
    }

    public function fetchList(string $dateYmd): array
    {
        $payload = $this->requestJson(
            self::API_BASE . '/listbydate?date=' . rawurlencode($dateYmd),
            __DIR__ . "/list_openfun/{$dateYmd}.json",
            getenv('REFRESH') === '1'
        );

        return is_array($payload['records'] ?? null) ? $payload['records'] : [];
    }

    public function fetchTenderRecord(array $entry): ?array
    {
        $unitId = $entry['unit_id'] ?? null;
        $jobNumber = $entry['job_number'] ?? null;
        if (!$unitId || !$jobNumber) {
            return null;
        }

        $dir = __DIR__ . '/tender_openfun/' . $unitId;
        $this->ensureDir($dir);

        $cacheFile = "{$dir}/{$jobNumber}.json";
        $refresh = getenv('REFRESH') === '1';
        if (!$refresh) {
            $cached = $this->loadCacheJson($cacheFile);
            $latestDate = $this->latestRecordDate($cached['records'] ?? []);
            $targetDate = intval($entry['date'] ?? 0);
            $refresh = $latestDate < $targetDate;
        }

        $payload = $this->requestJson(
            self::API_BASE . '/tender?unit_id=' . rawurlencode($unitId) . '&job_number=' . rawurlencode($jobNumber),
            $cacheFile,
            $refresh
        );

        $records = is_array($payload['records'] ?? null) ? $payload['records'] : [];
        if (!$records) {
            return null;
        }

        foreach ($records as $record) {
            if (($record['filename'] ?? null) === ($entry['filename'] ?? null)) {
                return $record;
            }
        }

        foreach ($records as $record) {
            if ((string)($record['date'] ?? '') === (string)($entry['date'] ?? '')
                && ($record['brief']['type'] ?? null) === ($entry['brief']['type'] ?? null)) {
                return $record;
            }
        }

        return end($records) ?: null;
    }

    private function requestJson(string $url, string $cacheFile, bool $refresh = false): array
    {
        if (!$refresh) {
            $payload = $this->loadCacheJson($cacheFile);
            if ($payload !== null) {
                return $payload;
            }
        }

        $raw = $this->request($url);
        file_put_contents($cacheFile, $raw);

        $payload = json_decode($raw, true);
        if (!is_array($payload)) {
            throw new RuntimeException("Invalid JSON from {$url}");
        }

        return $payload;
    }

    private function loadCacheJson(string $cacheFile): ?array
    {
        if (!file_exists($cacheFile) || filesize($cacheFile) <= 2) {
            return null;
        }

        $payload = json_decode(file_get_contents($cacheFile), true);
        return is_array($payload) ? $payload : null;
    }

    private function latestRecordDate(array $records): int
    {
        $dates = array_map(function ($record) {
            return intval($record['date'] ?? 0);
        }, $records);

        return $dates ? max($dates) : 0;
    }

    private function request(string $url): string
    {
        echo "fetch {$url}\n";
        usleep(250 * 1000);

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 20,
            CURLOPT_TIMEOUT => 120,
            CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; pcc-openfun-fetcher/1.0)',
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
        ]);

        $output = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($output === false) {
            throw new RuntimeException("Request failed: {$url} {$error}");
        }

        if ($status >= 400) {
            throw new RuntimeException("HTTP {$status} from {$url}");
        }

        return $output;
    }

    private function ensureDir(string $dir): void
    {
        if (!file_exists($dir)) {
            mkdir($dir, 0777, true);
        }
    }
}

class OpenFunNormalizer
{
    public static function normalizeType(?string $type): string
    {
        $map = [
            '經公開評選或公開徵求之限制性招標公告' => '限制性招標(經公開評選或公開徵求)公告',
            '經公開評選或公開徵求之限制性招標更正公告' => '限制性招標(經公開評選或公開徵求)更正公告',
            '更正決標公告' => '決標更正公告',
            '決標資料定期彙送公告' => '定期彙送',
        ];

        return $map[$type] ?? (string)$type;
    }

    public static function normalizeEntry(array $listEntry, array $record): array
    {
        $detail = is_array($record['detail'] ?? null) ? $record['detail'] : [];

        return [
            'filename' => (string)($listEntry['filename'] ?? $record['filename'] ?? ''),
            'url' => self::first($detail, ['url']) ?: self::absoluteViewerUrl($listEntry['url'] ?? null),
            'type' => self::normalizeType($record['brief']['type'] ?? $listEntry['brief']['type'] ?? ''),
            '機關代碼' => self::first($detail, ['機關資料:機關代碼', '已公告資料:機關代碼', '無法決標公告:機關代碼'])
                ?: (string)($listEntry['unit_id'] ?? $record['unit_id'] ?? ''),
            '機關名稱' => self::first($detail, ['機關資料:機關名稱', '已公告資料:機關名稱', '無法決標公告:機關名稱'])
                ?: (string)($listEntry['unit_name'] ?? $record['unit_name'] ?? ''),
            '標案案號' => self::first($detail, ['採購資料:標案案號', '已公告資料:標案案號', '無法決標公告:標案案號'])
                ?: (string)($listEntry['job_number'] ?? $record['job_number'] ?? ''),
            '標案名稱' => self::first($detail, ['採購資料:標案名稱', '已公告資料:標案名稱', '無法決標公告:標案名稱'])
                ?: (string)($record['brief']['title'] ?? $listEntry['brief']['title'] ?? ''),
            '標的分類' => self::first($detail, ['採購資料:標的分類', '已公告資料:標的分類', '無法決標公告:標的分類'])
                ?: (string)($record['brief']['category'] ?? $listEntry['brief']['category'] ?? ''),
            '預算金額' => self::first($detail, ['採購資料:預算金額']),
            '決標公告日期' => self::first($detail, ['決標資料:決標公告日期', '決標資料:原決標公告日期']),
            '決標日期' => self::first($detail, ['決標資料:決標日期']),
            '無法決標公告日期' => self::first($detail, ['無法決標公告:無法決標公告日期']),
            '原無法決標公告日期' => self::first($detail, ['無法決標公告:原無法決標公告日期']),
            '投標廠商' => self::extractBidders($detail),
        ];
    }

    private static function extractBidders(array $detail): array
    {
        $bidders = [];
        foreach ($detail as $key => $value) {
            if (!preg_match('/^投標廠商:投標廠商(\d+):(.+)$/u', $key, $matches)) {
                continue;
            }

            $index = intval($matches[1]) - 1;
            $field = $matches[2];
            if ($index < 0) {
                continue;
            }

            if (!isset($bidders[$index])) {
                $bidders[$index] = [];
            }
            $bidders[$index][$field] = self::scalarize($value);
        }

        ksort($bidders);
        return array_values(array_filter($bidders));
    }

    private static function absoluteViewerUrl(?string $url): ?string
    {
        if (!$url) {
            return null;
        }
        if (preg_match('/^https?:\/\//', $url)) {
            return $url;
        }
        return 'https://pcc-api.openfun.app' . $url;
    }

    private static function first(array $detail, array $keys): ?string
    {
        foreach ($keys as $key) {
            if (!array_key_exists($key, $detail)) {
                continue;
            }

            $value = self::scalarize($detail[$key]);
            if ($value !== null && $value !== '') {
                return $value;
            }
        }
        return null;
    }

    private static function scalarize($value): ?string
    {
        if ($value === null) {
            return null;
        }
        if (is_scalar($value)) {
            return trim((string)$value);
        }
        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}

class Parser
{
    private $manager;
    private $dryRun;
    private $hasMongo;

    public function __construct()
    {
        $this->dryRun = getenv('DRY_RUN') === '1';
        $this->hasMongo = class_exists('MongoDB\\Driver\\Manager') && class_exists('MongoDB\\BSON\\UTCDateTime');

        if (!$this->dryRun && !$this->hasMongo) {
            throw new RuntimeException('MongoDB PHP extension is required unless DRY_RUN=1');
        }

        if (!$this->dryRun) {
            $this->manager = new MongoDB\Driver\Manager();
        }
    }

    public function parse(string $date, string $type, array $rows): void
    {
        if (!$rows) {
            return;
        }

        $documents = array_map(function ($row) use ($type, $date) {
            preg_match('/<?([^\d]+?)>?\d+?([^\d]+)/u', (string)($row['標的分類'] ?? ''), $match);
            $category = trim($match[1] ?? '');
            $subCategory = trim(preg_replace('/^-/', '', $match[2] ?? ''));
            $price = self::toInt($row['預算金額'] ?? null);
            $publish = $this->toDateValue(strtotime($date));

            $endDateRaw = $row['決標公告日期']
                ?? $row['決標日期']
                ?? $row['無法決標公告日期']
                ?? $row['原無法決標公告日期']
                ?? null;
            $endDate = $this->rocDateToValue($endDateRaw);

            $candidates = array_map(function ($candidate) {
                preg_match('/^(\w+)/u', (string)($candidate['廠商業別'] ?? ''), $matchIndustry);
                return [
                    '_id' => ($candidate['廠商代碼'] ?? null) ?: ($candidate['廠商名稱'] ?? null),
                    'name' => $candidate['廠商名稱'] ?? null,
                    'awarding' => intval(($candidate['是否得標'] ?? '') === '是'),
                    'org' => $candidate['組織型態'] ?? null,
                    'industry' => $matchIndustry[1] ?? null,
                    'address' => $candidate['廠商地址'] ?? null,
                    'phone' => $candidate['廠商電話'] ?? null,
                    'country' => $candidate['得標廠商國別'] ?? null,
                    'amount' => self::toInt($candidate['決標金額'] ?? null),
                ];
            }, is_array($row['投標廠商'] ?? null) ? $row['投標廠商'] : []);

            $document = [
                '_id' => $row['filename'],
                'unit' => $row['機關名稱'] ?? null,
                'url' => $row['url'] ?? null,
                'key' => $row['filename'],
                'filename' => $row['filename'],
                'unit_id' => $row['機關代碼'] ?? null,
                'id' => $row['標案案號'] ?? null,
                'job_number' => $row['標案案號'] ?? null,
                'name' => $row['標案名稱'] ?? null,
                'type' => $type,
                'category' => $category,
                'sub_category' => $subCategory,
                'price' => $price,
                'publish' => $publish,
            ];

            if ($endDate) {
                $document['end_date'] = $endDate;
            }

            $candidates = array_values(array_filter($candidates, function ($candidate) {
                return !empty($candidate['name']);
            }));
            if ($candidates) {
                $document['candidates'] = $candidates;
                $document['merchants'] = array_values(array_filter($candidates, function ($candidate) {
                    return intval((string)($candidate['awarding'] ?? 0));
                }));
            }

            return $document;
        }, $rows);

        $target = in_array($type, ['決標公告', '無法決標公告', '無法決標更正公告', '決標更正公告', '定期彙送'], true)
            ? 'pcc.award'
            : 'pcc.pcc';

        if ($this->dryRun) {
            echo "{$date} {$type} prepared " . count($documents) . " documents (DRY_RUN)\n";
            return;
        }

        $batch = new MongoDB\Driver\BulkWrite(['ordered' => true]);
        $batchUpdate = new MongoDB\Driver\BulkWrite(['ordered' => true]);

        foreach ($documents as $document) {
            $batch->update(
                ['_id' => $document['_id']],
                ['$set' => $document],
                ['multi' => true, 'upsert' => true]
            );

            if (empty($document['end_date']) || empty($document['job_number']) || empty($document['unit_id'])) {
                continue;
            }

            $batchUpdate->update(
                [
                    'job_number' => $document['job_number'],
                    'unit_id' => $document['unit_id'],
                ],
                [
                    '$set' => [
                        'end_date' => $document['end_date'],
                        'award' => $document,
                    ],
                ],
                ['multi' => true, 'upsert' => true]
            );
        }

        $writeConcern = new MongoDB\Driver\WriteConcern(MongoDB\Driver\WriteConcern::MAJORITY, 1000);
        $result = $this->safeExecute($target, $batch, $writeConcern);
        echo "{$date} {$type} upserted " . $this->upsertedCount($result) . ' nModified ' . $this->modifiedCount($result) . "\n";

        if ($batchUpdate->count() === 0) {
            return;
        }

        $result = $this->safeExecute('pcc.pcc', $batchUpdate, $writeConcern);
        echo "{$date} {$type} tender end_date upserted " . $this->upsertedCount($result) . "\n";
    }

    private static function toInt(?string $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (!preg_match('/-?[\d,]+/', $value, $matches)) {
            return null;
        }

        return intval(str_replace(',', '', $matches[0]));
    }

    private function rocDateToValue(?string $value)
    {
        if (!$value || !preg_match('/(\d+)\/(\d+)\/(\d+)/', $value, $matches)) {
            return null;
        }

        $gregorian = sprintf('%04d-%02d-%02d', intval($matches[1]) + 1911, intval($matches[2]), intval($matches[3]));
        return $this->toDateValue(strtotime($gregorian));
    }

    private function toDateValue(int $timestamp)
    {
        if ($this->hasMongo) {
            return new MongoDB\BSON\UTCDateTime($timestamp * 1000);
        }
        return date('c', $timestamp);
    }

    private function safeExecute(string $target, MongoDB\Driver\BulkWrite $batch, MongoDB\Driver\WriteConcern $writeConcern)
    {
        try {
            return $this->manager->executeBulkWrite($target, $batch, $writeConcern);
        } catch (Throwable $e) {
            fwrite(STDERR, $e->getMessage() . "\n");
            return null;
        }
    }

    private function upsertedCount($result): int
    {
        return $result ? $result->getUpsertedCount() : 0;
    }

    private function modifiedCount($result): int
    {
        return $result ? $result->getModifiedCount() : 0;
    }
}

function formatCliDate(string $input): string
{
    if (preg_match('/^\d{8}$/', $input)) {
        return date('Y-m-d', strtotime($input));
    }
    return date('Y-m-d', strtotime($input));
}

$start = $argv[1] ?? date('Ymd');
$range = intval($argv[2] ?? 1);
$maxRecords = intval(getenv('MAX_RECORDS') ?: 0);

$fetcher = new OpenFunFetcher();
$parser = new Parser();

for ($i = 0; $i < $range; $i++) {
    $diff = $range - $i - 1;
    $date = date('Y-m-d', strtotime(formatCliDate($start) . " -{$diff} days"));
    $dateYmd = date('Ymd', strtotime($date));
    echo $date . "\n";

    $grouped = [];
    $entries = $fetcher->fetchList($dateYmd);
    if ($maxRecords > 0) {
        $entries = array_slice($entries, 0, $maxRecords);
    }
    $total = count($entries);

    foreach ($entries as $index => $entry) {
        echo $date . ' ' . date('Y-m-d H:i:s') . ' ' . ($index + 1) . "/{$total}. "
            . ($entry['unit_id'] ?? '-') . ' ' . ($entry['job_number'] ?? '-') . "\n";

        $record = $fetcher->fetchTenderRecord($entry);
        if (!$record) {
            continue;
        }

        $normalized = OpenFunNormalizer::normalizeEntry($entry, $record);
        $type = $normalized['type'];
        if (!$type || empty($normalized['filename']) || empty($normalized['標案案號'])) {
            continue;
        }

        $grouped[$type][] = $normalized;
    }

    foreach ($grouped as $type => $rows) {
        $parser->parse($date, $type, $rows);
    }
}
