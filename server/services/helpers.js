var rootDir = process.cwd(),
	ignoreRE = /^(127\.0\.0\.1|::1|fe80(:1)?::1(%.*)?)$/i,
	exec = require('child_process').exec,
	cached,
	command,
	filterRE;

var config = require(rootDir + '/config'),
	mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	ObjectId = Schema.ObjectId;

if(process.platform === 'win32') {
	command = 'ipconfig';
	filterRE = /\bIPv[46][^:\r\n]+:\s*([^\s]+)/g;
} else if(process.platform === 'darwin') {
	command = 'ifconfig';
	filterRE = /\binet\s+([^\s]+)/g;
} else {
	command = 'ifconfig';
	filterRE = /\binet\b[^:]+:\s*([^\s]+)/g;
}

var self = module.exports = {

	db: null,
	mongooseConnected: (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2),

	connectMongoose: function(app, useMongo, callback) {
		// connect to database
		if(!self.mongooseConnected && useMongo) {
			console.log('\n   * * * * * * * * * * * *   Starting Mongo DB Service   * * * * * * * * * * * *   '.yellow);
			self.db = mongoose.createConnection(config.get('MONGO_URL'));
			self.db.on('error', console.error.bind(console, ' CONNECTION ERROR: '.red.inverse));
			self.db.once('open', function () {
				console.log('   * * * * * * * * * * * *   Hollow:'.yellow + ' database connection opened in ' + app.get('env').yellow + ' environment');
				if(typeof callback === 'function') {
					callback({ mongooseDb: self.db });
				}
			});
		} else {
			console.log('\n   * * * * * * * * * * * *   Mongo Service Not Connected   * * * * * * * * * * * *   '.red);
			if(typeof callback === 'function') {
				callback();
			}
		}
	},

	useModel: function(modelName) {
		return require(rootDir + '/server/models/' + modelName + '-model')(mongoose, self.db, Schema, ObjectId);
	},

	getNetworkIPs: function(callback, bypassCache) {
		if(cached && !bypassCache) {
			callback(null, cached);
			return;
		}
		exec(command, function(error, stdout, sterr) {
			cached = [];
			var ip;
			var matches = stdout.match(filterRE) || [];
			for(var i = 0; i < matches.length; i++) {
				ip = matches[i].replace(filterRE, '$1');
				if(!ignoreRE.test(ip)) {
					cached.push(ip);
				}
			}
			callback(error, cached);
		});
	},

	getAndSetNetworkIp: function(callback) {
		self.getNetworkIPs(function(err, ips) {
			if(err || !ips.length) {
				config.set('IP', 'localhost');
				console.log('Could not find network ip. Defaulting to \'localhost.\''.red);
			} else {
				config.set('IP', ips[0]);
				console.log('Running on network ip: ' + ips[0].yellow + '\n\n');
			}
			if(typeof callback === 'function') {
				callback();
			}
		});
	}

};