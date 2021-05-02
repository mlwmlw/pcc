require! <[http querystring request cheerio q string moment mongodb]>

base = \http://company.g0v.ronny.tw/api/show/
request = request.defaults {
	pool: { maxSockets: 3}
}
parse = (input, reg) ->
	res = []
	m = reg.exec input
	while (m != null) 
		res.push [m[1], m[2]]
		m = reg.exec input
	return res
uri = require \./database
client = mongodb.MongoClient uri, {
	connectTimeoutMS: 10000,
	serverSelectionTimeoutMS: 120000,
	useUnifiedTopology: true
}
err <- client.connect
db = client.db('pcc')
count = 0;
total = 500
#err, rows <- db.collection 'merchants' .find {address: "分公司所在地"} .limit total .toArray
err, rows <- db.collection 'merchants' .find {name: {$exists: true}, error: {$exists: false}, _id: /\d{8}/, owner: {$exists: 0}} .limit total .toArray
#err, rows <- db.collection 'merchants' .find {_id: /^\d{8}$/, error: true, address: {$exists: 0}, org: '公司登記'} .limit total .toArray
total = rows.length
bulk = db.collection 'merchants' .initializeUnorderedBulkOp!
for row in rows
	let id = row._id, row = row
		if !/\d{7,8}/.test id
			console.log id + ' wrong'
			count++
			return
		err, res, body <- request.get base + id
		console.log id
		try 
			m = JSON.parse body .data
		catch e
			console.log \error
			console.log body
			console.log row
			console.log e
			count++
			return
		if !m || !(m["地址"] || m["公司所在地"] || m["分公司所在地"])
			console.log body
			data = {error: true, updated_ts: new Date}
		else
			if m["所營事業資料"]
				m.types = m["所營事業資料"]
			else if m["營業項目"]
				m.types = m["營業項目"]
				if !m.types
					console.log m
				m.types = parse m.types.replace(/\s+/g, ' '), /([a-zA-Z]\d+) ?(\S+)/g
			else
				m.types = []
			types = []
			for type, key in m.types
				types[key] = {id: type[0], name: type[1] - /。/}
			directors = []
			for d, key in m["董監事名單"] || []
				org = d["所代表法人"]
				directors[key] = {
					id: d["序號"]
					name: d["姓名"]
					title: d["職稱"]
					capital: d["出資額"] - /,/g
					org: org && {id: org[0], name: org[1]}
				}
			managers = []
			for d, key in m["經理人名單"] || []
				managers[key] = {
					id: d["序號"]
					name: d["姓名"]
					onboard: d["到職日期"]
				}
			data = {
				registration: m["登記機關"]
				owner: m["代表人姓名"] || m["負責人姓名"]
				types: types
				address: row.address || m["地址"] || m["公司所在地"] || m["分公司所在地"]
				directors: directors
				managers: managers
				capital:　m["資本額"] || null
				updated_ts: new Date
				error: false
			}
		count++
		bulk.find {_id: id} .update {$set: data}
		if count == total
			bulk.execute (err, res) ->
				console.log err
				console.log 'Done'
				client.close!


