require! <[http querystring request cheerio q string moment]>
export getDocsByDate = (date) ->
	deferred = q.defer!
	pcc = getDocs date
	pcc.then (res) -> 
		pages = [pcc]
		$ = cheerio.load res.body
		total = +$ '.T11b' .text!
		last_page = Math.ceil total / 100
		for page from 2 to last_page
			pages.push(getDocs date, page) 
		console.log "All page " + pages.length
		q.all pages .done (result) ->
			rows = res.rows
			merchants = res.merchants
			for key, page of result
				Array.prototype.push.apply rows, page.rows
				Array.prototype.push.apply merchants, page.merchants
			deferred.resolve [rows, merchants]
	return deferred.promise
export getMerchants = !->
	return merchants
trim = (string) ->
	string - /(^\s+|\s+$)/g
parseFailed = (url, cb) ->
	error, res <- request.get url
	$ = cheerio.load res.body
	cb {origin_publish: trim($ '.main tr' .eq(6) .find 'td' .text!).replace /(\d+)\/(\d+)\/(\d+)/, (date, year, month, day) ->
		(+year + 1911) + "-" + month + "-" + day
	} 
parseAward = (url, cb) ->
	award = {}
	error, res <- request.get url
	$ = cheerio.load res.body
	merchants = {}
	merchant = trim($ '.award_table_tr_4 tr' .eq 5 .find 'td' .text!)
	$ '.award_table_tr_2' .each (i) ->
		if trim($ 'th', this .text!) == '原公告日期'
			award.origin_publish = trim($ 'td', this .text!).replace /(\d+)\/(\d+)\/(\d+)/, (date, year, month, day) ->
				(+year + 1911) + "-" + month + "-" + day
			return false
	$rows = $ '.award_table_tr_3 tr'
	$th = $rows.find 'th'
	$td = $rows.find 'td'
	total = $rows.eq 0 .find 'td' .text!.replace(/\s+/g, '') - 1
	id = null
	map = {'廠商代碼': '_id', '廠商名稱': 'name', '廠商電話': 'phone', '廠商地址': 'address', '廠商業別': 'industry', '組織型態': 'org', '僱用員工總人數是否超過100人': 'over100', '決標金額': 'amount'}
	for i to $th.length - 1
		if i == 0
			continue;
		key = $th.eq(i).text!.replace(/\s+/g, '')
		value = $td.eq(i).text!.replace(/\s+/g, '')
		if map[key] == '_id'
			id = value
			merchants[id] = {}
		else if map[key] == 'industry'
			split = $td.eq(i).text!.split(/\s+/)
			value = split[1]
			if split.length > 3
				merchants[id].registration = split[3]
		else if map[key] == 'amount'
			value = +value.replace(/[元,]/g, '')
		if !map[key]
			continue;
		merchants[id][map[key]] = value
	award.merchants = []	
	for i, merchant of merchants
		clone = {} <<< merchant
		if merchant.amount
			award.merchants.push clone
		delete merchant.amount
	cb(award, merchants)

getDocs = (date, page) ->
	date = moment date or null
	today = (date.year! - 1911) + '/' + date.format 'MM/DD' 
	page = page or 1
	post = {
		method: 'search',
		searchTarget: 'ATM',
		searchMethod: true,
		tenderWay:1,
		awardAnnounceStartDate: today,
		awardAnnounceEndDate: today
	}
	deferred = q.defer!
	url = 'http://web.pcc.gov.tw/tps/pss/tender.do?searchMode=common&searchType=advance&pageIndex=' + page
	request.post url, {form: post}, (error, res) -> 
		$ = cheerio.load res.body
		data = []
		promises = []
		merchants = []
		$ '#print_area table tr' .each (i) ->
			row = {}
			$row = $ 'td', this
			if $row.length < 7 or i == 0
				return
			row.unit = $row.eq 1 .text!
			name = $row.eq 2 .text!.match /\S+/g
			row.key = $row.eq 2 .find 'a' .attr 'href' .match(/pkAtmMain=(\d+)/)[1]  
			row.id = name[0]
			if name.length > 2
				row.name = name[1] + name[2]
			else
				row.name = name[1]
			row.type = $row.eq 4 .text!
			row.publish = moment trim($row.eq 5 .text!).replace /(\d+)\/(\d+)\/(\d+)/, (date, year, month, day) ->
				(+year + 1911) + "-" + month + "-" + day
			.toDate!
			price = $row.eq 6 .text!.match /\S+/g
			row.price = (price && +price[0]) || 0
			row.award_url = $row.eq 7 .find 'a' .attr 'href'
			row.failed_url = $row.eq 8 .find 'a' .attr 'href'
			if row.award_url 
				row.url = 'http://web.pcc.gov.tw/tps/pss/' + row.award_url
				awardDeferred = q.defer!
				promises.push awardDeferred.promise
				parseAward row.url, (award, ms) ->
					for i, m of ms
						merchants.push m;
					row.merchants = award.merchants;
					row.origin_publish = award.origin_publish
					awardDeferred.resolve row
			else
				row.url = 'http://web.pcc.gov.tw/tps/pss/' + row.failed_url
				failedDeferred = q.defer!
				promises.push failedDeferred.promise
				parseFailed row.url, (failed) ->
					row.origin_publish = failed.origin_publish
					failedDeferred.resolve row
			data.push row
		done = ! ->
			deferred.resolve {
				page: page,
				rows: data,
				body: res.body,
				merchants: merchants
			}
		if promises.length
			q.all promises .done done
		else
			process.nextTick done
	return deferred.promise

#parseAward 'http://web.pcc.gov.tw/tps/main/pms/tps/atm/atmAwardAction.do?newEdit=false&searchMode=common&method=inquiryForPublic&pkAtmMain=51511072&tenderCaseNo=GAA0326001'
#parseAward 'http://web.pcc.gov.tw/tps/main/pms/tps/atm/atmAwardAction.do?newEdit=false&searchMode=common&method=inquiryForPublic&pkAtmMain=51510570&tenderCaseNo=NO1040271'
#getDocsByDate '2015-03-23' .then (data) ->
#	console.log data
