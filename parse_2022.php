<?php
require 'vendor/autoload.php';
use DiDom\Document;



class Fetcher {


    function __constructor() {
    }
    function request($url) {
		echo "fetch {$url}\n";
		usleep(400 * 1000);
        $ch = curl_init();

        // set url
        curl_setopt($ch, CURLOPT_URL, $url);
		curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);

        //return the transfer as a string
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36");

        // $output contains the output string
        $output = curl_exec($ch);
        curl_close($ch); 
        return $output;
    }
    function fetch($url) {
			$content = $this->request($url);
			$dom = new Document($content);
			//$content = file_get_contents('test.html');
			//$dom = new Document('row.html', true);
			$tables = $dom->find(".tb_01,.tb_04,.tb_05,.tb_06,.tb_07,.tb_09");
			foreach($tables as $table) {
				unset($merchant, $award);

				foreach($table->find('tr') as $row) {
					$cols = $row->find('td');
					if(count($cols) < 2) continue;
					$name = preg_replace('|\s+|', '', $cols[0]->text());
					$name = preg_replace('|^[　]*|', '', $name);

					if(empty($name)) continue;
					$value = preg_replace('|[\s]+|', '',$cols[1]->text());
					$value = preg_replace('|\$.+$|', '', $value);
					if (preg_match('|投標廠商\d+|', $name) > 0) {
						unset($merchant);
						$merchant = [];
						$values['投標廠商'][] = &$merchant;
						continue;
					}
					
					if(preg_match('|第\d+品項|', $name) > 0) {
						unset($merchant, $award);
						$award = [];
						$values['決標品項'][$name] = &$award;
						continue;
					}
					if (isset($merchant)) {
						$merchant[$name] = $value;
					} else if(isset($award)) {
						$award[$name] = $value;
					} else {
						$values[$name] = $value;
					}
				}
			}
			if(empty($values)) {
				return [];
			}
			return $values;
    }
    function fetchList($date) {
        $date = strtotime($date);
        $year = date('Y', $date) - 1911;
        $month = date('m', $date);
        $day = date('d', $date);
        $content = $this->request("https://web.pcc.gov.tw/prkms/tender/common/noticeDate/readPublish?dateStr={$year}%E5%B9%B4{$month}%E6%9C%88{$day}%E6%97%A5");
		//$content = file_get_contents('test.html');
        $types = [    
			'公開招標更正公告' => '公開招標更正公告',
			'公開招標公告' => '公開招標公告',
			'公開取得報價單或企劃書更正公告' => '公開取得報價單或企劃書更正公告',
			'經公開評選或公開徵求之限制性招標公告' => '限制性招標(經公開評選或公開徵求)公告',
			'經公開評選或公開徵求之限制性招標更正公告' => '限制性招標(經公開評選或公開徵求)更正公告',
			'決標公告' => '決標公告',
			'無法決標公告' => '無法決標公告',
			'無法決標更正公告' => '無法決標更正公告',
			'決標更正公告' => '決標更正公告',
			'決標資料定期彙送公告' => '定期彙送'
	    ];
       	$tenders = []; 
        foreach($types as $type => $name) {
            preg_match("/<a id=\"{$type}\">.+?<\/a>(.+?)總筆數/msi", $content, $matches);
           	if(count($matches) == 0) {
            	echo $type, " 0 \n";
				continue;
			}
            $dom = new Document($matches[0]);
            $elems = $dom->find(".tenderLinkPublish");
            foreach($elems as $elm) {
				$href = $elm->attr('href');
                $tenders[$name][] = [
                    'name' => $elm->text(),
					'url' => 'https://web.pcc.gov.tw/prkms/tender/common/noticeDate/redirectPublic?ds=' . date('Ymd', $date) . "&fn=". $href,
                    'job_number' => basename($href, '.xml')
					
                ];
            }
            echo $type, " ", count($tenders[$name]), "\n";
        }
		return $tenders;
    }
}
class Parser {
	function __construct()
	{
		//$this->mongo = new MongoClient();
		$this->manager = new MongoDB\Driver\Manager();
	}
	function parse($date, $type, $tenders) {

		if(count($tenders) == 0 ) return;
		
		$insert_tenders = array_map(function($row) use($type, $date) {
			preg_match('/<?([^\d]+?)>?\d+?([^\d]+)/mis', $row['標的分類'], $match);
			$category = trim(@$match[1]);
			$sub_category = trim(preg_replace('|^-|', '', @$match[2]));
			$price = intval(str_replace(",", "", @$row['預算金額']));
			
			/*
			$publish_raw = @$row['公告日'] ?: @$row['原公告日'] ;
			$publish = null;
			if($publish_raw && preg_match('|(\d+)\/(\d+)\/(\d+)|', $publish_raw)) {
				$publish = new MongoDB\BSON\UTCDateTime(strtotime(preg_replace_callback('/(\d+)\/(\d+)\/(\d+)/', function($row) {
					return ($row[1] + 1911) . '-' . $row[2] . '-' . $row[3];
				}, $publish_raw)) * 1000);
			}*/
			$publish = new MongoDB\BSON\UTCDateTime(strtotime($date) * 1000);
			$end_date_raw = @$row['決標公告日期'] ?: @$row['原決標公告日期'] ?: @$row['決標日期'] ?: @$row['無法決標公告日期'] ?: @$row['原無法決標公告日期'];
			$end_date = null;
			if($end_date_raw && preg_match('/(\d+)\/(\d+)\/(\d+)/', $end_date_raw)) {
				$end_date = new MongoDB\BSON\UTCDateTime(strtotime(preg_replace_callback('/(\d+)\/(\d+)\/(\d+)/', function($row) {
					return ($row[1] + 1911) . '-' . $row[2] . '-' . $row[3];
				}, $end_date_raw)) * 1000);
			}
			
			$candidates = array_map(function($row) {
				preg_match('/^(\w+)/u', @$row['廠商業別'], $match_industry);
				return array(
					'_id' => @$row['廠商代碼']?:$row['廠商名稱'],
					'name' => $row['廠商名稱'],
					'awarding' => intval($row['是否得標'] =='是' ? 1: 0),
					'org' => @$row['組織型態'],
					'industry'=> @$match_industry[1],
					"address" => @$row['廠商地址'],
					"phone" => @$row['廠商電話'],
					"country" => @$row['得標廠商國別'],
					"amount" => isset($row['決標金額']) ? intval(str_replace(",", "", @$row['決標金額'])): null
				);
			}, is_array(@$row['投標廠商']) ? @$row['投標廠商'] : []);
			$data = [
				'_id' => $row['job_number'], 
				'unit' => $row['機關名稱'],
				'url' => $row['url'],
				'key' => $row['job_number'], 
				'filename' => $row['job_number'],
				'unit_id' => $row['機關代碼'],
				'id' => $row['標案案號'],
				'job_number' => $row['標案案號'],
				'name' => $row['標案名稱'],
				'type' => $type,
				'category' => $category,
				'sub_category' => $sub_category,
				'price' => $price ? intval($price): null
			];
			if($publish) {
				$data += ['publish' => $publish];
			}
			if($end_date) {
				$data += ['end_date' => $end_date];
			}
			if(count($candidates))	 {
				$data += [
					'candidates' => array_values($candidates),
					'merchants' => array_values(array_filter($candidates, function($row) {
						return intval($row['awarding'] . '');
					}))
				];
			}
			return $data;
		}, $tenders);
		$batch = new MongoDB\Driver\BulkWrite(['ordered' => true]);
		$batchUpdate = new MongoDB\Driver\BulkWrite(['ordered' => true]);
		foreach($insert_tenders as $tender) {
			$batch->update([
				'_id' => $tender['_id']
			],[
				'$set' => $tender
			], [
				'multi' => true,
				'upsert' => true,
			]);
			
		
			if(empty($tender['end_date'])) {
				continue;
			}
			$batchUpdate->update([
				'job_number' => $tender['job_number'],
				'unit_id' => $tender['unit_id']
			],[
				'$set' => ['end_date' => $tender['end_date'], 'award' => $tender]
			], [
				'multi' => true,
				'upsert' => true,
			]);
		}
		
		$writeConcern = new MongoDB\Driver\WriteConcern(MongoDB\Driver\WriteConcern::MAJORITY, 1000);
		
		if(in_array($type, ['決標公告', '無法決標公告', '決標更正公告', '定期彙送'])) {
			$target = 'pcc.award';
		} else {
			$target = 'pcc.pcc';
		}
		try {
			$r = $this->manager->executeBulkWrite($target, $batch, $writeConcern);
		} catch(Exception $e) {
			$r = null;
		}
		echo "{$date} {$type} upserted ", $r->getUpsertedCount(), ' nModified ', $r->getModifiedCount(), "\n";
		if($batchUpdate->count() == 0) {
			return;
		}
		try {
			$r = $this->manager->executeBulkWrite('pcc.pcc', $batchUpdate, $writeConcern);
		}
		catch(Exception $e) {
			$r = null;
			echo $e->getMessage();
		}
		echo "{$date} {$type} tender end_date upserted " . $r->getUpsertedCount(), "\n";
	}
}

if(isset($argv[1])) {
	$start = $argv[1];
} else {
	$start = date('Ymd');//"20160101";
}
if(isset($argv[2])) {
	$range = $argv[2];
}
else {
	$range = 1;
}
$fetcher = new Fetcher();
$parser = new Parser();
for($i = 0; $i < $range; $i++) {
	$diff = $range - $i - 1;
	$date = date('Y-m-d', strtotime("{$start} -{$diff} days"));
	echo $date, "\n";
	$tenderTypes = $fetcher->fetchList($date);
	$j = 0;
	foreach ($tenderTypes as $type => &$tenders) {
		//$tenders = array_slice($tenders, 0, 1);
		$k = 0;
		$tenders = array_filter(array_map(function($tender) use($fetcher, &$j, &$k, $date) {
			$j++;
			$k++;
			echo $date, " ", date('Y-m-d H:i:s'), " {$k}/{$j}. ";
			return $tender + $fetcher->fetch($tender['url']);
		}, $tenders));
	} 
	foreach ($tenderTypes as $type => $tenders) {
		$parser->parse($date, $type, $tenders);
	}	
}







