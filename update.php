<?php
$PATH = getenv('PATH');
#putenv("PATH={$PATH}:/usr/local/bin/");
#$proxies = array('134.249.168.16:80'/*, '107.151.152.210:80'*/, '96.5.28.23:8008', '122.225.106.36:80');
#$proxies = array('59.126.152.55:3128', '211.72.117.212:8080', '211.110.127.210:3128');
$proxies = array('106.184.7.132:8088');
if(isset($argv[1]))
	$start_date = $argv[1];
else
	$start_date = date('Y-m-d');
if(isset($argv[2]))
	$days = $argv[2];
else
	$days = 1;

for($i=0; $i < $days; $i++) {
	$p = array_rand($proxies);
	$proxy = "HTTP_PROXY=\"http://{$proxies[$p]}\"";
	$date = date('Y-m-d', strtotime($start_date . " +{$i}days"));
	echo $date, ' ', $proxy, "\n";
	echo shell_exec("export PATH=\$PATH:/home/mlwmlw/.nvm/versions/node/v0.12.4/bin/;{$proxy} /home/mlwmlw/.nvm/versions/node/v0.12.4/bin/lsc /home/mlwmlw/node/pcc/main " . $date);
	sleep(3);
}
