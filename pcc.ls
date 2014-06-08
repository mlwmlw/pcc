require! <[http querystring request cheerio q string moment]>

export getToday = !->
	deferred = q.defer!
	pcc  = getPcc!
	pcc.then (res) -> 
		pages = []
		$ = cheerio.load res.raw
		total = +$ '.T11b' .text!
		last_page = Math.ceil total / 100
		for page from 1 to last_page
			pages.push(getPcc page) 
		console.log "All page " + pages.length
		q.all pages .done (result) ->
			console.log "all then"
			deferred.resolve result
	return deferred.promise
count = 0		
getPcc = (page) ->
	date = new Date
	#today = date.getFullYear! - 1911 + "/" + (date.getMonth!+ 1) + "/" + date.getDate! 
	today = (moment!.year! - 1911) + '/' + moment!.subtract \days 9 .format 'MM/DD' 
	page = page or 1
	post = {
		method: 'search',
		searchMethod: true,
		hid_1:1,
		tenderWay:1,
		tenderDateRadio: 'on',
		tenderStartDate: today,
		tenderEndDate: today,
		isSpdt: 'N'
	}
	deferred = q.defer!
	url = 'http://web.pcc.gov.tw/tps/pss/tender.do?searchMode=common&searchType=basic&pageIndex=' + page
	request.post url, {form: post}, (error, res) -> 
		if !res.body
			console.log res
		$ = cheerio.load res.body
		data = []
		$ '#print_area table tr' .each (i) ->
			row = {}
			$row = $ 'td', this
			if $row.length < 7 or i == 0
				return
			row.unit = $row.eq 1 .text!
			name = $row.eq 2 .text!.match /\S+/g
			row.id = name[0]
			row.name = name[1]
			row.type = $row.eq 4 .text!
			row.category = $row.eq 5 .text!
			row.publish = new Date($row.eq 6 .text!.replace "\n", "")
			row.end_date = new Date($row.eq 7 .text!.replace "\n", "")
			price = $row.eq 8 .text!.match /\S+/g
			row.price = (price && price[0]) || 0
			data.push row

		count++
		console.log page, data.length, count
		deferred.resolve {
			page: page,
			raw: res.body, 
			rows: data
		}
	return deferred.promise
