var _users = {},
	_id = 0,
	_io,
	_queue = [],
	_queueTimeout,
	_timeoutLength = 25000,
	_story = null,
	_currentTurn,
	_userModel = null,
	_storyModel = null,
	_helpers = null;


var self = module.exports = {
  
	init: function(io, helpers) {
		_helpers = helpers;
		console.log('init io');
		// _userModel = _helpers.useModel('user');
		_storyModel = _helpers.useModel('story');
		_storyModel.findOne(function(err, result) {
			if(err) {
				console.log(err);
			} else {
				_story = result;
			}
		})
		_io = io;
		_io.set('log level', 2);

		//new connection
		_io.sockets.on('connection', function (socket) {
			// if(_id > 0) {
				var myId = 'user' + _id;

				console.log(myId, 'connected');
				//add to list of users
				_users[myId] = socket;

				//add to queue for turn
				_queue.push(myId);

				var data = {
					id: myId,
					story: _story.paragraph,
					queue: _queue,
					timer: _timeoutLength
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
		deleteUser(myId);
		if(_currentTurn === myId) {
			clearTimeout(_queueTimeout);
			_currentTurn = null;
			popUser();
		} else {
			sendQueue();
		}
	});

	socket.on('contribute', function (data) {
		//verify they are current ones
		var spacedWord = data.word + ' ';
		if(data.id === _currentTurn) {
			_story.paragraph += spacedWord;

			clearTimeout(_queueTimeout);

			_story.save(function(err,result) {
				if(err) { console.log('story error:', err); }
				else {
					var sendData = {
						word: spacedWord,
						id: data.id
					};
					_io.sockets.emit('addWord', sendData);
					popUser();
				}
			});
		}
	});

	socket.on('timeLimit', function () {
		warnOrBoot(socket, myId);
		clearTimeout(_queueTimeout);
		popUser();
	});
}

function warnOrBoot(socket, myId) {
	//if they were already warned, boot em
	if(_users[myId].warning) {
		_users[myId].emit('boot');
		deleteUser(myId);
	} else {
		_users[myId].emit('warning');
		_users[myId].warning = true;
	}
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
		_queueTimeout = setTimeout(unresponsive, _timeoutLength);
		sendQueue();
	}

	//start backup timeout clock
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

function unresponsive() {
	//TODO add warning
	clearTimeout(_queueTimeout);
	console.log('unresponsive:', _currentTurn);
	deleteUser(_currentTurn);
	_currentTurn = null;
	popUser();
}

function deleteUser(id) {
	delete _users[id];
	spliceQueue(id);
}