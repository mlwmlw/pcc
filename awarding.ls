require! <[http querystring request cheerio q string moment]>

export getDocsByDate = (date) ->
	deferred = q.defer!
	pcc = getDocs date
	pcc.then (res) -> 
		pages = []
		$ = cheerio.load res.raw
		total = +$ '.T11b' .text!
		last_page = Math.ceil total / 100
		for page from 1 to last_page
			pages.push(getDocs date, page) 
		console.log "All page " + pages.length
		q.all pages .done (result) ->
			rows = []
			for key, page of result
				Array.prototype.push.apply rows, page.rows
			deferred.resolve rows
	return deferred.promise


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
			price = $row.eq 6 .text!.match /\S+/g
			row.price = (price && +price[0]) || 0
			row.awarding = $row.eq 7 .find 'a' .attr 'href'
			row.failed = $row.eq 8 .find 'a' .attr 'href'
			if row.awarding 
				deferred = q.defer!
				promises.push deferred.promise
				error, res <- request.get 'http://web.pcc.gov.tw/tps/pss/' + row.awarding
				$ = cheerio.load res.body
				row.merchant := $ '.award_table_tr_4 tr' .eq 5 .find 'td' .text! .replace /(^\s+|\s+$)/g, ''
				deferred.resolve row
			data.push row
		q.all promises .done (result) ->
			deferred.resolve {
				page: page,
				raw: res.body, 
				rows: data
			}
	return deferred.promise

#getDocsByDate '2015-03-23' .then (data) ->
#	console.log data
