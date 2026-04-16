<?php
$PATH = getenv('PATH');
$now = date('Y-m-01');
for($i=0; $i< 24; $i++) {
	echo $month = date('Y-m-01', strtotime($now . ' -'. $i . ' month'));
	echo shell_exec("lsc /Users/mlwmlw/Workspace/pcc/report " . $month);
}
