<?php
for($i=0; $i< 100; $i++) {
	$date = date('Y-m-d', strtotime("-{$i}days"));
	echo $date;
	echo "\n";
	exec('lsc main ' . $date);
}
