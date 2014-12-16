<?php
$PATH = getenv('PATH');
$now = date('Y-m-01', mktime());
for($i=0; $i< 24; $i++) {
	$month = date('Y-m-01', strtotime($now . ' -'. $i . ' month'));
	exec("export PATH={$PATH}:/usr/local/bin/;lsc /home/mlwmlw/node/pcc/report " . $month);
}
