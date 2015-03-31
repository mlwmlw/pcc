require! <[http querystring request cheerio q string moment]>

export getDocsByDate = (date) ->
	deferred = q.defer!
	pcc = getDocs date
	pcc.then (res) -> 
		pages = [pcc]
		$ = cheerio.load res.raw
		total = +$ '.T11b' .text!
		last_page = Math.ceil total / 100
		for page from 2 to last_page
			pages.push(getDocs date, page) 
		console.log "All page " + pages.length
		q.all pages .done (res) ->
			rows = []
			for key, page of res
				if page.rows.length
					Array.prototype.push.apply rows, page.rows
			deferred.resolve rows
	return deferred.promise

count = 0

getDocs = (date, page) ->
	date = moment date or null
	#today = date.getFullYear! - 1911 + "/" + (date.getMonth!+ 1) + "/" + date.getDate! 
	today = (date.year! - 1911) + '/' + date.format 'MM/DD' 
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
		$ = cheerio.load res.body
		data = []
		$ '#print_area table tr' .each (i) ->
			row = {}
			$row = $ 'td', this
			if $row.length < 7 or i == 0
				return
			row.unit = $row.eq 1 .text!
			name = $row.eq 2 .text!.match /\S+/g
			row.key = $row.eq 2 .find 'a' .attr 'href' .match(/primaryKey=(.+)/)[1]  
			row.id = name[0]
			if name.length > 2
				row.name = name[1] + name[2]
			else
				row.name = name[1]
			row.type = $row.eq 4 .text!
			row.category = $row.eq 5 .text!
			row.publish = moment(($row.eq 6 .text!.replace "\n", ""), "YYYY/MM/DD").add 1911, 'years' .toDate!
			row.end_date = moment(($row.eq 7 .text!.replace "\n", ""), "YYYY/MM/DD").add 1911, 'years' .toDate!
			price = $row.eq 8 .text!.match /\S+/g
			row.price = (price && price[0]) || 0
			data.push row

		count++
		#console.log page, data.length, count
		deferred.resolve {
			page: page,
			raw: res.body, 
			rows: data
		}
	return deferred.promise
