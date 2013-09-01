var _users = {},
	_id = 0,
	_io,
	_queue = [],
	queueTimeout = null;

var self = module.exports = {
  
	init: function(io) {
		console.log('init io');
		_io = io;
		_io.set('log level', 2);

		//new connection
		_io.sockets.on('connection', function (socket) {

			// if(_id > 0) {
				var myId = 'user' + _id;

				//add to list of users
				_users[myId] = socket;

				//add to queue for turn
				_queue.push(myId);

				socket.emit('welcome', myId);

				socket.on('disconnect', function () {
					console.log('deleting:', myId);
					delete _users[myId];
					spliceQueue(myId);
					list();
				});

				popUser();
				
				list();
				debug();
				setupEvents(socket, myId);
//			}

			_id++;
		});
	},
};

function list(ignore) {
	var data = {
		queue: _queue,
		count: getUserCount(),
		ignore: ignore
	};
	_io.sockets.emit('list', data);
}

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

function setupEvents(socket, myId) {
	socket.on('contribute', function (data) {
		console.log(data);
		//_io.sockets.emit('chat', myId + ': ' + data);
	});
}

function popUser() {
	//only pop if more than 1 person active
	if(getUserCount() > 1) {
		var userId = _queue[0];
		_queue = _queue.slice(1,_queue.length);
		_queue.push(userId);
		if(_users[userId]) {
			var data = {
				message: 'your turn'
			};
			_users[userId].emit('yourTurn');
			list(userId);
		}	
	}
}

function spliceQueue(id) {
	for(var i = 0; i < _queue.length; i++) {
		if(_queue[i] === id) {
			var first = _queue.slice(0,i),
				second = _queue.slice(i+1, _queue.length);
			_queue = first.concat(second);
			break;
		}
	}
}