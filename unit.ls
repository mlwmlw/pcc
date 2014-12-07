require! <[http querystring request cheerio q string moment mongodb]>

base = \http://web.pcc.gov.tw/tps/main/pss/pblm/tender/basic/search/mainListCommon.jsp
request.defaults {
	pool: { maxSockets: 4}
}

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
	if err
		console.log err
		return
	cb(cheerio.load res.body)

parseTable = (name, parentId, $) ->
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
			bulk = collection.initializeUnorderedBulkOp!
			for row in rows
				bulk.find {_id: row._id} .upsert!.replaceOne row
			bulk.execute (err, res) ->
				console.log parentId + ' ' + name + ' - ' + rows.length
				if err
					console.log err
			#collection.save rows, (err, res) ->
			#	console.log rows
			#	if err
			#		console.log 'err!!', err
			#, {continueOnError: true, safe: true}
			#console.log $item.text! + " - [" + $tds.eq(0).text! + "] - " + $tds.eq(1).text!

getUnit = (url, cb)->
	err, res <- request.get url
	if !err
		cb(cheerio.load res.body)	

main = (url, link, parentId) ->
	db <- connectDB!
	collection = db.collection 'unit'
	bulk = collection.initializeUnorderedBulkOp!
	handler = ($) ->
		if link
			parseTable link, parentId, $
		$ 'u' .parent 'a' .each (i) ->
			$item = $(this)
			href = base.replace(/[^\/]+$/, '') + $item.attr 'href'
			name = $item.text!.replace /\s+|\(.*\)/g, ''
			if name in ['招標公告', '決標公告']
				return
			id = $item.text!.replace /^[^(]+\(|\)|\s*/g, ''
			if parentId == null || !/\./.test id
				bulk.find {_id: id} .upsert!.replaceOne {
					_id: id,
					parent: parentId,
					name: name
				}
				if bulk.count
					bulk.count++
				else
					bulk.count = 1
			res = href.match /'(.+)'/
			if res
				split = res[1].split(/', *'/)
				if split[1] != ''
					p = split[1]
				else
					p = parentId
				if split[2] != ''
					name = split[2]
				$sub <- postUnit split[0], split[1], split[2]
				main $sub, name, p
			else
				main href, name, id

		if bulk.count
			bulk.execute (err, res) ->
				if err
					console.log err
				else
					console.log parentId + " insert main " + bulk.count
		

	if typeof url is \string
		$ <- getUnit url
		handler $
	else
		$ = url
		handler $

main base


console.log \done

