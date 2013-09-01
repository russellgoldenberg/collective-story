// TODO: stop using nconf and start using node-convict:
// https://hacks.mozilla.org/2013/03/taming-configurations-with-node-convict-a-node-js-holiday-season-part-7/?utm_source=javascriptweekly&utm_medium=email
// https://github.com/lloyd/node-convict

/*
 * CONFIGURATION OF ENVIRONMENT VARIABLES
 *
 */

var rootDir = process.cwd(),
	nconf = require('nconf'),
	fs = require('fs'),
	nodeEnv = require(rootDir + '/bin/server').app.get('env'),
	configFilename = nodeEnv !== 'development' ? '/config_' + nodeEnv + '.json' : '/config.json',
	json = JSON.parse(fs.readFileSync(rootDir + '/package.json', 'utf8'));

nconf.argv().env().file({
	file: process.env.configFile || rootDir + configFilename
});

nconf.set('ENVIRONMENT', nodeEnv);

module.exports = nconf;