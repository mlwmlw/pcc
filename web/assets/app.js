var app = angular.module('myapp', ['ui.bootstrap', 'ngRoute']);	
app.config(function($interpolateProvider) {
	$interpolateProvider.startSymbol('[[');
	$interpolateProvider.endSymbol(']]');
});
app.run(function($rootScope, $http, $window) {
	$http.get('/api/categories').then(function(res) {
		$rootScope.categories = res.data;
	});
	$rootScope.search = function(keyword) {
		$window.location.href = '/api/keyword/' + keyword;
	}
});
app.filter('money', function() {
	return function(input) {
		input = input.replace('.00', '');
		if(input.slice(-4) == ',000')
			return input.substr(0, input.length -4) + 'k';
		else 
			return input;
	};
});
app.filter('date', function() {
	return function(input) {
		return input.replace(/T.+$/, '');	
	};
});
app.filter('option', function () {
	return function (items, value) {
		var out = [{}];
		var reg = new RegExp(value);
		if(value) {
			for(var x in items) {
				if(reg.test(items[x]))
					out.push(items[x]);
			}
			return out;
		}
		else if(!value) {
			return items;
		}
	};
});
