var app = angular.module('myapp', ['ui.bootstrap', 'ngRoute', 'ngReactGrid', 'angular-loading-bar']);
app.config(function($interpolateProvider, $locationProvider, $httpProvider) {
    $interpolateProvider.startSymbol('[[');
    $interpolateProvider.endSymbol(']]');
    var interceptor = function($q, $rootScope) {  
        var service = {
            'request': function(config) {
                config.url = 'http://pcc.mlwmlw.org' + config.url;
                return config;
            }
        };
        return service;  
    };

    $httpProvider.interceptors.push(interceptor);
});
app.run(function($rootScope, $http, $window, $location) {
    $rootScope.desc = "貼近民眾的標案檢索平台";
    $http.get('/api/categories').then(function(res) {
        $rootScope.categories = res.data;
    });
    $http.get('/api/keywords').then(function(res) {
        $rootScope.keywords = res.data;
    });
    $rootScope.search = function(keyword) {
        $window.location.href = '/search/' + keyword;
    }
});
app.controller('page', function($scope) {

})
app.filter('money', function() {
    return function(input) {
        input = input + "";
        input = input.replace('.00', '');
        if (input.slice(-8) == ',000,000')
            return input.substr(0, input.length - 8) + 'M';
        else if (input.slice(-4) == ',000')
            return input.substr(0, input.length - 4) + 'K';
        else
            return input;
    };
});

Number.prototype.numberFormat = function(c, d, t) {
    var n = this,
        c = isNaN(c = Math.abs(c)) ? 2 : c,
        d = d == undefined ? "." : d,
        t = t == undefined ? "," : t,
        s = n < 0 ? "-" : "",
        i = String(parseInt(n = Math.abs(Number(n) || 0).toFixed(c))),
        j = (j = i.length) > 3 ? j % 3 : 0;

    return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};
app.filter('gmt', function() {
    return function(input) {
				if(!input)
					return 'none';
        var time = input.match(/([^Z]+)(Z(\d+))?/);
        var input = Date.parse(time[1]);
				
        if (time[3])
            input += time3 * 1000;
        else
            input += 28800000;
				var tzoffset = (new Date()).getTimezoneOffset() * 60000; 
        return (new Date(input - tzoffset)).toISOString().replace(/T.+$/, '');
    };
});

app.service('grid', function($filter) {
    var columns = {
        unit: {
            field: "unit",
            displayName: "單位",
            render: function(row) {
                return React.DOM.a({ href: "/unit/" + row.unit }, row.unit);
            }
        },
        name: {
            field: "name",
            displayName: "標案名稱",
            render: function(row) {
                return React.DOM.a({ target: "_blank", href: '/tender/' + (row.unit && row.unit.replace(/\s+/g, '')) + '/' + row.id }, row.name);
            }
        },
        price: {
            field: "price",
            displayName: "預算/決標金額",
            render: function(row) {
                amount = row.award && row.award.merchants && row.award.merchants.reduce(function(total, row) {
                    return total + row.amount;
                }, 0);
                if(!amount || amount < 0)
                    amount = row.price
                if(amount)
                    return '$' + amount.numberFormat(0, '.', ',') //$filter('money')($filter('currency')(row.price));
                else
                    return '不公開';
            }
        },
        publish: {
            field: "publish",
            displayName: "發佈日期",
            render: function(row) {
                return $filter('date')(row.publish, 'yyyy-MM-dd');
            }
        },
        merchant: {
            field: "merchant",
            displayName: "得標廠商",
            render: function(row) {
                var merchants = row.award && row.award.merchants ? row.award.merchants : row.merchants;
                if (typeof mer)
                    if (merchants && Object.keys(merchants).length) {
                        var $merchants = [];
                        Object.keys(merchants).map(function(k) {
                            var m = merchants[k];
                            $merchants.push(
                                React.DOM.li({}, React.DOM.a({ href: '/merchants/' + (m._id || m.name) }, m.name))
                            );
                        });
                        return React.DOM.ul({}, $merchants);
                    } else if (merchants && merchants.length == 0) {
                    return '無法決標';
                } else {
                    return '';
                }
            }
        },
        award_publish: {
            field: "publish",
            displayName: "原始公告",
            render: function(row) {
                url = row.url ? row.url : row.award && row.award.url;
                if (row.award && row.award.url)
                    url = row.award.url
                if (url) {
                    return React.DOM.a({ href: url, target: "_blank" }, '決標公告');
                } else if (row.job_number) {
                    return React.DOM.a({ target: "_blank", href: row.url || "//web.pcc.gov.tw/prkms/prms-viewTenderDetailClient.do?ds=" + $filter('gmt')(row.publish) + "&fn=" + row.filename + ".xml"}, '招標公告');
                } else {
                    return React.DOM.a({ target: "_blank", href: row.url || "//web.pcc.gov.tw/tps/tpam/main/tps/tpam/tpam_tender_detail.do?searchMode=common&scope=F&primaryKey=" + row.key }, '招標公告');
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
        pageSize: 100,
        columnDefs: settings.base
    };
    grid.colors = ['#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c', '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5', '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f', '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5'];
    grid.color = function(color, d) {
        return grid.colors[d.index];
    };
    grid.money = function(val) {
        val = val.toString();
        if (val.slice(-8) == '00000000')
            return val.slice(0, -8) + '億';
        else if (val.slice(-4) == '0000')
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
app.filter('option', function() {
    return function(items, value) {
        var out = [{}];
        var reg = new RegExp(value);
        if (value) {
            for (var x in items) {
                if (reg.test(items[x]))
                    out.push(items[x]);
            }
            return out;
        } else if (!value) {
            return items;
        }
    };
});
