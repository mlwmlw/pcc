db.getCollection('merchants').aggregate([
	{$unwind: "$types"},
	{$group: {_id: "$types.id", count: {$sum: 1}, name: {$first: "$types.name"}}},
	{$sort: {count: -1}},
	{$skip: 2},
	{$project: {_id: "$_id", name: "$name", count: "$count"}},
	{$out: "merchant_type"}
])
