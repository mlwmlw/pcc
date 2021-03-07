<?php
$PATH = getenv('PATH');
$now = date('Y-m-01');
for($i=0; $i< 3; $i++) {
	echo $month = date('Y-m-01', strtotime($now . ' -'. $i . ' month'));
	exec("export PATH={$PATH}:/usr/local/bin/:/home/mlwmlw/.nvm/v0.11.14/bin;lsc /home/mlwmlw/node/pcc/report " . $month);
}
