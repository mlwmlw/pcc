<?php
$PATH = getenv('PATH');
#putenv("PATH={$PATH}:/usr/local/bin/");
for($i=0; $i< 10; $i++) {
	$date = date('Y-m-d', strtotime("-{$i}days"));
	echo $date;
	echo "\n";
	exec("export PATH={$PATH}:/usr/local/bin/;lsc /home/mlwmlw/node/pcc/main " . $date);
}
