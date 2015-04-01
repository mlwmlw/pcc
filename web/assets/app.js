var app = angular.module('myapp', ['ui.bootstrap', 'ngRoute', 'ngReactGrid']);	
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
		input = input +"";
		input = input.replace('.00', '');
		if(input.slice(-8) == ',000,000')
			return input.substr(0, input.length -8) + 'M';
		else if(input.slice(-4) == ',000')
			return input.substr(0, input.length -4) + 'K';
		else 
			return input;
	};
});
app.filter('date', function() {
	return function(input) {
		var time = input.match(/([^Z]+)(Z(\d+))?/);
		var input = Date.parse(time[1]);
		if(time[3])
			input += time3 * 1000;
		else
			input += 28800000;
		return (new Date(input)).toISOString().replace(/T.+$/, '');
	};
});
app.service('grid', function($filter) {
	var grid = {
			data: [], 
			height: 1500,
			columnDefs: [
				{ field: "unit", displayName: "單位", render: function(row) {
					return React.DOM.a({href:"/unit/" + row.unit}, row.unit);
				}},
				{ field: "name", displayName: "標案名稱", render: function(row) {
					return React.DOM.a({target: "_blank", href: row.url || "//web.pcc.gov.tw/tps/tpam/main/tps/tpam/tpam_tender_detail.do?searchMode=common&scope=F&primaryKey="  + row.key}, row.name);
				}},
				{ field: "price", displayName: "金額", render: function(row) {
					return $filter('money')($filter('currency')(row.price));
				}},
				{ field: "type", displayName: "類型"},
				{ field: "publish", displayName: "發佈日期", render: function(row) {
					return $filter('date')(row.publish);
				}},
		]};
		return grid;
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
