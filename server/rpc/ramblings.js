var _users = {},
	_id = 0,
	_io,
	_queue = [];

var self = module.exports = {
  
	init: function(io) {
		console.log('init io');
		_io = io;
		_io.set('log level', 2);
		_io.sockets.on('connection', function (socket) {

			//increase tally of all who have joined
			_id++;
			var myId = 'user' + _id;

			//add to list of users
			_users[myId] = socket;

			//add to queue for turn
			_queue.push(myId);

			socket.emit('welcome', { hello: myId });
			
			self.list();

			debug();
			socket.on('contribute', function (data) {
				console.log(data);
				//_io.sockets.emit('chat', myId + ': ' + data);
			});

			socket.on('disconnect', function () {
				delete _users[myId];
				self.list();
			});
		});
	},

	list: function() {
		var otherData = {
			_users: getUsers(),
			count: getUserCount()
		};
		_io.sockets.emit('list', otherData);
	}
};

function getUsers () {
   var userIds = [];
   for(var id in _users) {
     if(_users[id]) {
       userIds.push(id);
     }
   }
   return userIds;
}

function getUserCount() {
	var count = 0;
	for(var id in _users) {
		if(_users[id]) {
			count++;
		}
	}
	return count;
}

function message(data) {
	if(_users[data.id]) {
		_users[data.id].emit('message', data.message); 	
	}
}
function debug() {
	console.log(_queue);
}