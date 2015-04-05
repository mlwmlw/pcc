var app = angular.module('myapp', ['ui.bootstrap', 'ngRoute', 'ngReactGrid', 'angular-loading-bar']);	
app.config(function($interpolateProvider) {
	$interpolateProvider.startSymbol('[[');
	$interpolateProvider.endSymbol(']]');
});
app.run(function($rootScope, $http, $window) {
	$http.get('/api/categories').then(function(res) {
		$rootScope.categories = res.data;
	});
	$rootScope.search = function(keyword) {
		$window.location.href = '/search/' + keyword;
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
				{ field: "price", displayName: "預算/決標金額", render: function(row) {
					return $filter('money')($filter('currency')(row.price));
				}},
				{ field: "type", displayName: "類型"},
				{ field: "publish", displayName: "發佈日期", render: function(row) {
					return $filter('date')(row.publish);
				}},
				{field: "merchant", displayName: "得標廠商", render: function(row) {
					merchants = row.merchants ? row.merchants : row.award && row.award.merchants;
					if(merchants && merchants.length) {
						var $merchants = [];
						merchants.map(function(m) {
							$merchants.push(
								React.DOM.li({}, React.DOM.a({href:'/merchants/' + m._id}, m.name))
							);
						});
						return React.DOM.ul({}, $merchants);
					}
					else if (merchants && merchants.length == 0) {
						return '無法決標';
					}
					else {
						return '';
					}
				}},
				{field: "publish", displayName: "決標公告", render: function(row) {
					url = row.url ? row.url : row.award && row.award.url;
					if(url) {
						return React.DOM.a({href:url, target: "_blank"}, '前往');
					}
					else {
						return '';
					}
				}}
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
