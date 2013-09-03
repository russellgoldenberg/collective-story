var rootDir = process.cwd();

var self = module.exports = {

	setExpressRoutes: function(app) {

		var globals = app.get('globals');

		app.get('/', function(req, res) {
			res.render('app', {
				title: 'Ramblings',
				globals: globals
			});
		});

		app.get('/about', function(req, res) {
			res.render('about', {
				title: 'Ramblings',
				globals: globals
			});
		});

		// 404'd
		app.use(function(req, res, next) {
			// res.send(404, 'Sorry cant find that!');
			res.render('404', {
				title: '404 - Page Not Found',
				globals: globals
			});
		});

	}

};