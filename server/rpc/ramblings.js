var _users = {},
	_id = 0,
	_io,
	_queue = [],
	_queueTimeout,
	_story,
	_currentTurn,
	_currentParagraph,
	_currentIndex,
	_userModel,
	_storyModel,
	_helpers,
	_timeoutLength = 25000;


var self = module.exports = {
  
	init: function(io, helpers) {
		_helpers = helpers;
		console.log('init io');
		// _userModel = _helpers.useModel('user');
		_storyModel = _helpers.useModel('story');
		_storyModel
			.where('index').gte(0)
			.sort('index -1')
			.findOne(function(err, result) {
				if(err) {
					console.log(err);
				} else {
					_story = result;
					console.log(_story);
					_currentIndex = _story.index;
					_currentParagraph = _story.paragraphs.length - 1;
				}
			});
		_io = io;
		_io.set('log level', 2);

		//new connection
		_io.sockets.on('connection', function (socket) {

			var newUser = 'user ' + _id + ' joined';
			console.log(newUser);

			var data = {
				paragraphs: _story.paragraphs,
				timer: _timeoutLength,
				count: _queue.length
			};

			socket.emit('welcome', data);
			
			setupJoin(socket);

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

function getUserCount() {
	var count = 0;
	for(var name in _users) {
		if(_users[name]) {
			count++;
		}
	}
	return count;
}

function message(data) {
	if(_users[data.name]) {
		_users[data.name].emit('message', data.message);
	}
}

function debug() {
	console.log(_queue);
}

function setupJoin(socket) {
	socket.on('join', function(name) {
		//TODO check for names
		if(!_users[name]) {
			//setup other socket events
			setupEvents(socket, name);
			//add to list of users
			_users[name] = socket;

			socket.emit('joinResponse', {name: name, join: true});

			//add to queue for turn
			_queue.push(name);

			//if no one is going, pop new
			if(!_currentTurn) {
				popUser();
			}	
		} else {
			socket.emit('joinResponse', {name: name, join:false});
		}
	});
}

function setupEvents(socket, name) {

	socket.on('disconnect', function () {
		console.log('deleting:', name);
		deleteUser(name);
		if(_currentTurn === name) {
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
		if(data.name === _currentTurn) {
			_story.paragraphs[_currentParagraph] += spacedWord;
			if(_story.authors[data.name]) {
				_story.authors[data.name] +=1;
			} else {
				_story.authors[data.name] = 1;
			}

			clearTimeout(_queueTimeout);

			_storyModel.update({index: _currentIndex}, {paragraphs: _story.paragraphs, authors: _story.authors}, function(err,suc) {
				if(err) { console.log(err); }
				else {
					var sendData = {
						word: spacedWord,
						currentParagraph: _currentParagraph,
						name: data.name
					};
					_io.sockets.emit('addWord', sendData);
					//check for new paragraph 
					if(data.newParagraph) {
						_currentParagraph += 1;
						_story.paragraphs.push('');
						_storyModel.update({index: _currentIndex}, {paragraphs: _story.paragraphs});
					}

					popUser();
				}
			});
		} else {
			//TODO
		}
	});

	socket.on('timeLimit', function () {
		warnOrBoot(socket, name);
		clearTimeout(_queueTimeout);
		popUser();
	});
}

function warnOrBoot(socket, name) {
	//if they were already warned, boot em
	if(_users[name].warning) {
		_users[name].emit('boot');
		deleteUser(name);
	} else {
		_users[name].emit('warning');
		_users[name].warning = true;
	}
}

function popUser() {

	var name = _queue[0];
	_currentTurn = name;

	//only do shuffling of more than 1 person
	if(getUserCount() > 1) {
		_queue = _queue.slice(1,_queue.length);
		_queue.push(name);
	}

	if(_users[name]) {
		_queueTimeout = setTimeout(unresponsive, _timeoutLength);
	}
	sendQueue();

	//start backup timeout clock
}

function spliceQueue(name) {
	for(var i = 0; i < _queue.length; i++) {
		if(_queue[i] === name) {
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

function deleteUser(name) {
	delete _users[name];
	spliceQueue(name);
}