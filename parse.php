<?php
$date = "20171103";

#$mongo = new MongoClient();
#$award = $mongo->selectCollection('pcc', 'award');

$result = get_list($date);
$types = array_unique(array_map(function($row) {
	return $row['brief']['type'];
}, $result));
$tenders = array_filter($result, function($row) {
	return in_array($row['brief']['type'], array('公開招標更正公告', '公開招標公告'));
});

/*
$tenders = array_map(function($row) use($date) {
	preg_match('/^\w+?-\d-(\d+)$/', $row['filename'], $match);
	$id = $match[1];
	preg_match('/([^\d]+?)\d+-([^\d]+)/', $row['brief']['category'], $match);
	$category = $match[1];
	$sub_category = $match[2];
	$tender = get_tender($row['unit_id'], $row['job_number']);
	if(empty($tender['detail']['採購資料:預算金額']))
		$price = null;
	else
		$price = intval(str_replace(",", "", $tender['detail']['採購資料:預算金額']));
	return array(
		'_id' => $id, 
		'unit' =>  $row['unit_name'],
		'key' => $id, 
		'unit_id' => $row['unit_id'],
		'job_number' => $row['job_number'],
		'name' => $row['brief']['title'],
		'type' => $row['brief']['type'],
		'category' => $category,
		'sub_category' => $sub_category,
		'price' => $price ? new MongoInt32($price): null,
		'publish' => new MongoDate(strtotime($date))
	);
}, $tenders);

$mc = new MongoClient();
$collection = $mc->selectCollection('pcc_dev', 'pcc');
$batch = new MongoUpdateBatch($collection);


foreach($tenders as $tender) {
	$update = array(
		'q' => array('_id' => $tender['_id']),
		'u' => array('$set' => $tender),
		'multi' => false,
		'upsert' => true,
	);
	$batch->add((object) $update);
}
$r = $batch->execute();
echo $date . ' tender upserted ' . $r['nUpserted'];
*/
$awards = array_filter($result, function($row) {
	return in_array($row['brief']['type'], array('決標公告', '更正決標公告'));
});
$awards = array_map(function($row) {
	preg_match('/^\w+?-\d-(\d+)$/', $row['filename'], $match);
	$id = $match[1];
	$award = get_award($row['unit_id'], $row['job_number']);
	$tender = get_tender($row['unit_id'], $row['job_number']);
	if(empty($tender['detail']['採購資料:預算金額']))
		$price = null;
	else
		$price = intval(str_replace(",", "", $tender['detail']['採購資料:預算金額']));
	exit;
	return array( '_id' => $id, 
		'unit' =>  $row['unit_name'],
		'key' => $id, 
		'id' => $row['unit_id'],
		'name' => $row['brief']['title'],
		'type' => $row['brief']['type'],
		'category' => $category,
		'sub_category' => $sub_category,
		'publish' => new MongoDate(strtotime($date))
	);
}, $awards);
function get_list($date) {
	$base = "https://pcc.g0v.ronny.tw/api/listbydate?date=";
	$api = $base . $date;
	if(file_exists("list/{$date}.json")) {
		$result = json_decode(file_get_contents("list/{$date}.json"), TRUE);
	}
	else {
		$result = json_decode(file_get_contents($api), TRUE);
		file_put_contents("list/{$date}.json", json_encode($result));
	}
	return $result['records'];
}
function get_tender_api($unit_id, $job_number)
{
	if(file_exists("tender/{$unit_id}/{$job_number}.json")) {
		$json = file_get_contents("tender/{$unit_id}/{$job_number}.json");
		return json_decode($json, TRUE);
	}
	else {
		$json = file_get_contents("https://pcc.g0v.ronny.tw/api/tender?unit_id={$unit_id}&job_number={$job_number}");
		$result = json_decode($json, TRUE);
		if(!file_exists("tender/{$unit_id}"))
			mkdir("tender/{$unit_id}");
		file_put_contents("tender/{$unit_id}/{$job_number}.json", $json);
		return $result;
	}
}
function get_tender($unit_id, $job_number) {
	$result = get_tender_api($unit_id, $job_number);
	$record = array_shift(array_filter($result['records'], function($row) {
		return in_array($row['brief']['type'], array('公開招標更正公告', '公開招標公告'));
	}));
	return $record;
}
function get_award($unit_id, $job_number) {
	$result = get_tender_api($unit_id, $job_number);
	$record = array_shift(array_filter($result['records'], function($row) {
		return $row['brief']['type'] == '決標公告';
	}));
	$data = [];
	foreach($record['detail'] as $key => $value) {
		if(preg_match('/remind/', $key))
			continue;
		$split = explode(":", preg_replace('/(\d):/', ':$1:', $key));
		$cursor = &$data;
		foreach($split as $i => $s) {
			if(count($split) == $i +1 && $value) 
				$cursor[$s] = $value;
			else if(count($split) != $i +1 && empty($cursor[$s])) {
				$cursor[$s] = array();
			}
			else if(count($split) == $i +1){
				#echo $key, " ", $s, " [", $value, "]\n";
				continue;
			}
			$cursor = &$cursor[$s];
		}
	}
	$record['data'] = $data;
	return $record;
}
