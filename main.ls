require! <[ ./pcc ]>
today = pcc.getToday!.then (res) ->
	for key, row of res
		row.get!.then (res) ->
			console.log res.page
			console.log res.rows[0]
			console.log res.rows.length

#total = today.getTotal!

#for key, value of today.next
#	console.log value
