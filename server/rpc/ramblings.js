var _users = {},
	_id = 0,
	_io,
	_queue = [],
	_queueTimeout,
	_story = 'Once ',
	_currentTurn;


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

				var data = {
					id: myId,
					story: _story,
					queue: _queue
				};
				socket.emit('welcome', data);
				//if no one is going, pop new
				if(!_currentTurn) {
					popUser();
				}

				//debug();
				setupEvents(socket, myId);
//			}

			_id++;
		});
	},
};

function sendQueue() {
	var data = {
		queue: _queue,
		count: _queue.length,
		turn: _currentTurn
	};
	console.log('sendQueue:', data);
	_io.sockets.emit('sendQueue', data);
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
	socket.on('disconnect', function () {
		console.log('deleting:', myId);
		delete _users[myId];
		spliceQueue(myId);
		if(_currentTurn === myId) {
			_currentTurn = null;
			popUser();
		} else {
			sendQueue();
		}
	});

	socket.on('contribute', function (data) {
		_story += data.word;
		var sendData = {
			word: data.word,
			id: data.id
		};
		_io.sockets.emit('addWord', sendData);
		popUser();
	});
}

function popUser() {

	var userId = _queue[0];
	_currentTurn = userId;

	//only do shuffling of more than 1 person
	if(getUserCount() > 1) {
		_queue = _queue.slice(1,_queue.length);
		_queue.push(userId);
	}

	if(_users[userId]) {
		sendQueue();
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