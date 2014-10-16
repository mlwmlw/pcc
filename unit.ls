require! <[http querystring request cheerio q string moment mongodb]>

url = \http://web.pcc.gov.tw/tps/main/pss/pblm/tender/basic/search/mainListCommon.jsp


client = mongodb.MongoClient
db = null
client.connect "mongodb://node:1qazxsw2!@oceanic.mongohq.com:10024/pcc", (err, _db) ->
	console.log \db-ready
	db := _db
connectDB = (cb) ->
	if(db)
		cb db
	else
		setTimeout !-> 
			connectDB cb
		, 100

postUnit = (dn, orgid, 	orgname, cb) ->
	post = {
		changeDn: dn,
		orgId: orgid,
		orgName: orgname
	}
	err, res <- request.post \http://web.pcc.gov.tw/tps/main/pss/pblm/tender/basic/search/orgListCommon.jsp {form: post}
	cb(cheerio.load res.body)

err, res <- request.get url
$ = cheerio.load res.body
$ 'u' .parent 'a' .each (i) ->
	$item = $(this)
	parentId = $item.text!.replace /^[^(]+\(|\)/g, ''
	href = url.replace(/[^\/]+$/, '') + $item.attr 'href'
	err, subres <- request.get href
	$sub = cheerio.load subres.body
	$sub 'u' .parent 'a' .each (j) ->
		subhref = url.replace(/[^\/]+$/, '') + $sub(this).attr 'href'
		subUnit = $sub(this).text!.replace /\s*/g, ''
		if subUnit in ['招標公告', '決標公告']
			return
		res = subhref.match(/'(.+)'/)
		if res 
			split = res[1].split(/', *'/)
			$subsub <- postUnit split[0], split[1], split[2]
			if split[1] != ''
				p = split[1]
			else
				p = parentId
			parse $item.text! + ' - ' + subUnit, p, $subsub
		else
			err, subsubres <- request.get subhref
			$subsub = cheerio.load subsubres;
			parse $item.text! + ' - ' + subUnit, parentId, $subsub
	parse $item.text!, parentId, $sub


parse = (name, parentId, $) ->
	rows = []
	$('#page table').last!.find('tr').each (j) ->
		$tds = $("td", this)
		if $tds.eq(0).text!.replace(/\s+/, '') in ['機關代碼', '']
			return
		rows.push {
			_id: $tds.eq(0).text!,
			parent: if parentId == $tds.eq(0).text! then null else parentId,
			name: $tds.eq(1).text!
		}
	do
		db <- connectDB!
		collection = db.collection 'unit'
		if rows.length > 0
			collection.insert rows, (err, res) ->
				console.log parentId + ' ' + name + ' - ' + rows.length
			#console.log $item.text! + " - [" + $tds.eq(0).text! + "] - " + $tds.eq(1).text!

console.log \done

