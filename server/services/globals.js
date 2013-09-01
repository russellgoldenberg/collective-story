var rootDir = process.cwd(),
	config = require(rootDir + '/config'),
	nodeEnv = config.get('ENVIRONMENT'),
	now = new Date();


var version = config.get('VERSION');   

var _globals = {
	version: version,
	CACHE: nodeEnv === 'development' ? String(now.getFullYear()) +
		String(now.getMonth()) +
		String(now.getDate()) +
		String(now.getHours()) +
		String(now.getMinutes()) +
		String(now.getSeconds()) : version,
	nodeEnv: nodeEnv,
	cloudPath: config.get('CLOUD_PATH'),
	baseUrl: config.get('BASE_URL')
};

var self = module.exports = {

	getGlobals: function() {
		return _globals;
	},

	get: function(key) {
		var value = _globals[key];
		return value ? value : false;
	},

	set: function(key, value) {
		if(typeof key === 'string') { // && value ?
			_globals[key] = String(value);
		}
	}

};