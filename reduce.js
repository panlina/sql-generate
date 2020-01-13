var traverse = require('./traverse');
function reduce(sql) {
	if (
		sql.type == 'select' &&
		sql.from.length == 1 &&
		sql.from[0].type == 'select' &&
		sql.field[0].type == 'call' &&
		sql.field[0].callee.identifier in aggregator &&
		sql.field[0].argument[0].identifier == '*'
	) {
		var call = sql;
		var argument = sql.from[0];
		var field = argument.field[0];
		argument.field[0] = call.field[0];
		call.field[0].argument[0] = field;
		return reduce(argument);
	}
	if (
		sql.type == 'select' &&
		sql.from.length == 1 &&
		sql.from[0].type == 'select' &&
		sql.from[0].from.length == 1 &&
		!(
			sql.with && sql.from[0].with ||
			sql.where && sql.from[0].where
		)
	) {
		sql.from[0].with = sql.with || sql.from[0].with;
		sql.from[0].where = sql.where || sql.from[0].where;
		sql.from[0].field = sql.field[0].identifier != '*' ? sql.field : sql.from[0].field
		if (sql.from[0].with) substituteNameQualifier(sql.from[0].with, sql.from[0].alias, sql.from[0].from[0].alias);
		if (sql.from[0].where) substituteNameQualifier(sql.from[0].where, sql.from[0].alias, sql.from[0].from[0].alias);
		sql.from[0].field.forEach(field => substituteNameQualifier(field, sql.from[0].alias, sql.from[0].from[0].alias));
		return reduce(sql.from[0]);
	}
	function substituteNameQualifier(sql, a, b) {
		for (var sql of traverse(sql))
			if (sql.type == 'name' && sql.qualifier == a)
				sql.qualifier = b;
	}
	switch (sql.type) {
		case 'select':
			if (sql.with)
				sql.with.value = reduce(sql.with.value);
			sql.from = sql.from.map(reduce);
			if (sql.where)
				sql.where = reduce(sql.where);
			sql.field = sql.field.map(reduce);
			break;
		case 'operation':
			if (sql.left)
				sql.left = reduce(sql.left);
			if (sql.right)
				sql.right = reduce(sql.right);
			break;
		case 'call':
			sql.argument = sql.argument.map(reduce);
			break;
	}
	return sql;
}
var aggregator = { sum: 0, avg: 0, min: 0, max: 0 };
module.exports = reduce;
