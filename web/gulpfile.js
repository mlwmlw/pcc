var gulp = require('gulp');
var spawn = require('child_process').spawn;
gulp.task('watch', ['serve'], function() {
	gulp.watch(['./views/*.html', '*.js'], ['serve']);
});
var p;
gulp.task('serve', function() {
	if(!p || p.killed) {
		p = spawn(process.env.NVM_BIN + "/node", ['--harmony', 'index.js']);
		console.log('spawn ' + p.pid);
	}
	else {
		p.kill('SIGTERM');
		console.log('kill ' + p.pid);
		setTimeout(function() {
			gulp.start('serve');
		}, 100);
	}
	p.stdout.on('data', function(data) {
		console.log(data.toString().replace(/^\s+|\s+$/g, ''));
	});
	p.stderr.on('data', function(data) {
		console.log(data.toString());
	});
});

gulp.task('default', ['watch']);
