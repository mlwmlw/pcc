var app = angular.module('myapp', ['ui.bootstrap', 'ngRoute', 'ngReactGrid', 'angular-loading-bar']);	
app.config(function($interpolateProvider, $locationProvider) {
	$interpolateProvider.startSymbol('[[');
	$interpolateProvider.endSymbol(']]');
});
app.run(function($rootScope, $http, $window, $location) {
	
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

app.filter('gmt', function() {
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
	var columns = {
		unit: {
			field: "unit", displayName: "單位", render: function(row) {
				return React.DOM.a({href:"/unit/" + row.unit}, row.unit);
			}
		},
		name: {
			field: "name", displayName: "標案名稱", render: function(row) {
				return React.DOM.a({target: "_blank", href: '/tender/' + row.unit.replace(/\s+/g, '') + '/' + row.id}, row.name);
			}
		},
		price: {
field: "price", displayName: "預算/決標金額", render: function(row) {
					return $filter('money')($filter('currency')(row.price));
				}
		}, 
		publish: { 
			field: "publish", displayName: "發佈日期", render: function(row) {
				return $filter('date')(row.publish);
			}
		},
		merchant: {
			field: "merchant", displayName: "得標廠商", render: function(row) {
				var merchants = row.award && row.award.merchants ? row.award.merchants : row.merchants;
				if(merchants && merchants.length) {
					var $merchants = [];
					merchants.map(function(m) {
						$merchants.push(
							React.DOM.li({}, React.DOM.a({href:'/merchants/' + (m._id || m.name)}, m.name))
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
			}
		},
		award_publish: {
			field: "publish", displayName: "原始公告", render: function(row) {
				url = row.url ? row.url : row.award && row.award.url;
				if(url) {
					return React.DOM.a({href:url, target: "_blank"}, '決標公告');
				}
				else {
					return React.DOM.a({target: "_blank", href: row.url || "//web.pcc.gov.tw/tps/tpam/main/tps/tpam/tpam_tender_detail.do?searchMode=common&scope=F&primaryKey="  + row.key}, '招標公告');
				}
			}
		}
	};
	var settings = {
		base: [columns.unit, columns.name, columns.price, columns.publish, columns.merchant, columns.award_publish]	
	};
	var grid = {
			data: [], 
			height: 1500,
			columnDefs: settings.base
	};
	grid.colors = ['#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c', '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5', '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f', '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5'];
	grid.color = function(color, d) {
		return grid.colors[d.index];
	};
	grid.money = function(val) {
		val = val.toString();
		if(val.slice(-8) == '00000000')
			return val.slice(0, -8) + '億';
		else if(val.slice(-4) == '0000')
			return val.slice(0, -4) + '萬';
		else
			return val;

		/*if(val.slice(-9) == '000000000')
			return val.slice(0, -9) + 'B';
		else if(val.slice(-6) == '000000')
			return val.slice(0, -6) + 'M';
		else
			return val;
		*/
	}
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
