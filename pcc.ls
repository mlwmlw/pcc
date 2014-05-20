require! <[http querystring request cheerio q string]>

export getToday = !->
	deferred = q.defer!
	pcc  = getPcc!
	pcc.then (res) -> 
		pages = []
		$ = cheerio.load res.raw
		total = +$ '.T11b' .text!
		pages = Math.ceil total / 100
		for page from 1 to pages
		#$ '.T11 b' .each ->
			#page = $ this .text!
			pages.push(((page) ->
				return {
					get: !->
						return getPcc page
				}
			) page) 
		deferred.resolve pages
	return deferred.promise
		
getPcc = (page) ->
	page = page or 1
	post = {
		method: 'search',
		searchMethod: true,
		tenderUpdate:'',
		searchTarget:'',
		orgName:'',
		orgId:'',
		hid_1:1,
		tenderName:'',
		tenderId:'',
		tenderWay:1,
		tenderDateRadio: 'on',
		tenderStartDate: '103/05/12',
		tenderEndDate: '103/05/l2'
	}
	deferred = q.defer!
	url = 'http://web.pcc.gov.tw/tps/pss/tender.do?searchMode=common&searchType=basic&pageIndex=' + page
	request.post url, {form: post}, (error, res) -> 
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
			row.publish = $row.eq 6 .text!.replace "\n", "" 
			row.end_date = $row.eq 7 .text!.replace "\n", "" 
			price = $row.eq 8 .text!.match /\S+/g
			row.price = (price && price[0]) || 0
			data.push row
		deferred.resolve {
			page: page,
			raw: res.body, 
			rows: data
		}
	return deferred.promise
