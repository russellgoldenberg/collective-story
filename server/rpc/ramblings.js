var self = module.exports = {
	
	users: {},
	id: 0,
	io: null,
	queue: [],
	queueTimeout: null,
	story: null,
	currentTurn: null,
	currentParagraph: null,
	currentIndex: null,
	userModel: null,
	storyModel: null,
	helpers: null,
	timeoutLength: 10000,

	init: function(io, helpers) {
		console.log('------ BLAST OFF ------'.rainbow);
		
		self.helpers = helpers;
		self.io = io;
		
		//pull down story data from DB (most recent)
		self.storyModel = self.helpers.useModel('story');
		self.storyModel
			.where('index').gte(0)
			.sort('index -1')
			.findOne(function(err, result) {
				if(err) { console.log(err); }
				else {
					self.story = result;
					self.currentIndex = self.story.index;
					self.currentParagraph = self.story.paragraphs.length - 1;
				}
			});
		
		self.io.set('log level', 2);

		//new connection from client
		self.io.sockets.on('connection', function (socket) {
			var newUser = 'user #' + self.id + ' joined';
			console.log(newUser.yellow);

			var data = {
				paragraphs: self.story.paragraphs,
				timer: self.timeoutLength - 5000,
				count: self.queue.length,
				wordCount: self.story.wordCount,
				wordLimit: self.story.wordLimit
			};

			//welcome the noob
			socket.emit('welcome', data);
			
			//setup event for listening to join events
			self.setupJoin(socket);

			self.id++;
		});
	},

	setupJoin: function(socket) {
		socket.on('join', function(name) {
		//check if the name is CURRENTLY taken
			if(!self.users[name]) {
				//setup other socket events
				self.setupEvents(socket, name);
				//add to list of users
				self.users[name] = socket;

				//add to queue for turn
				self.queue.push(name);

				socket.emit('joinResponse', {name: name, join: true});

				//if no one is going, pop new
				if(!self.currentTurn) {
					self.popUser();
				} else {
					self.sendQueue();
				}
			} else {
				socket.emit('joinResponse', {name: name, join: false});
			}
		});

		socket.on('listStories', function() {
			self.storyModel
				.where('index').gte(0)
				.select('index wordCount authors')
				.find(function(err, result) {
					socket.emit('stories', result);
				});
		});

		socket.on('getStory', function(index) {
			console.log('sget', index);
			self.storyModel
				.where('index').equals(index)
				.findOne(function(err, result) {
					socket.emit('story', result);
				});
		});
	},

	sendQueue: function() {
		var data = {
			queue: self.queue,
			count: self.queue.length,
			turn: self.currentTurn
			};
		self.io.sockets.emit('sendQueue', data);
	},

	getUserCount: function() {
		var count = 0;
		for(var name in self.users) {
			if(self.users[name]) {
				count++;
			}
		}
		return count;
	},

	setupEvents: function(socket, name) {
		socket.on('disconnect', function () {
			console.log('deleting:', name.red);
			self.deleteUser(name);
			if(self.currentTurn === name) {
				clearTimeout(self.queueTimeout);
				self.currentTurn = null;
				self.popUser();
			} else {
				self.sendQueue();
			}
		});

		socket.on('contribute', function (data) {
			//verify they are current ones
			var spacedWord = data.word + ' ';
			if(data.name === self.currentTurn) {
				self.story.paragraphs[self.currentParagraph] += spacedWord;
				self.story.wordCount += 1;
				if(self.story.authors[data.name]) {
					self.story.authors[data.name] +=1;
				} else {
					self.story.authors[data.name] = 1;
				}

				clearTimeout(self.queueTimeout);

				self.storyModel.update({index: self.currentIndex}, {paragraphs: self.story.paragraphs, authors: self.story.authors, wordCount: self.story.wordCount}, function(err,suc) {
					if(err) { console.log(err); }
					else {
						//start new story
						var newStory = false;
						if(self.story.wordCount >= self.story.wordLimit) {
							newStory = true;
						}
						var sendData = {
							word: spacedWord,
							currentParagraph: self.currentParagraph,
							name: data.name,
							newParagraph: data.newParagraph,
							wordCount: self.story.wordCount
						};
						self.io.sockets.emit('addWord', sendData);
						
						//update new paragraph info on server side if need be
						if(data.newParagraph && !newStory) {
							self.currentParagraph += 1;
							self.story.paragraphs.push('');
							self.storyModel.update({index: self.currentIndex}, {paragraphs: self.story.paragraphs});
						}
						
						if(newStory) {
							self.io.sockets.emit('endOfStory');
							self.currentTurn = null;
							setTimeout(self.newStory, 5000);
						} else {
							self.popUser();
						}
					}
				});
			} else {
				//TODO
			}
		});

		socket.on('timeLimit', function (name) {
			if(name === self.currentTurn) {
				clearTimeout(self.queueTimeout);
				self.warnOrBoot(socket, name);
			}
		});

		socket.on('checkStatus', function (name) {
			if(self.users[name]) {
				var data = {
					queue: self.queue,
					count: self.queue.length,
					turn: self.currentTurn
				};
				socket.emit('sendQueue', data);
			} else {
				socket.emit('boot');
			}
		});
	},

	warnOrBoot: function(socket, name) {
		//if they were already warned, boot em
		if(self.users[name]) {
			if(self.users[name].warning) {
			self.users[name].emit('boot');
			self.deleteUser(name);
			} else {
				self.users[name].emit('warning');
				self.users[name].warning = true;
			}
			self.popUser();
		}
	},

	popUser: function() {
		if(self.queue.length > 0) {
			var name = self.queue[0];
			self.currentTurn = name;

			//only do shuffling of more than 1 person
			if(self.getUserCount() > 1) {
				self.queue = self.queue.slice(1,self.queue.length);
				self.queue.push(name);
			}

			if(self.users[name]) {
				self.queueTimeout = setTimeout(function(name) {
					self.unresponsive();
				}, self.timeoutLength);
			}
			self.sendQueue();
		}
	},

	spliceQueue: function(name) {
		for(var i = 0; i < self.queue.length; i++) {
			if(self.queue[i] === name) {
				var first = self.queue.slice(0,i),
					second = self.queue.slice(i+1, self.queue.length);
				self.queue = first.concat(second);
				break;
			}
		}
	},

	unresponsive: function(name) {
		//TODO add warning
		clearTimeout(self.queueTimeout);
		console.log('unresponsive:'.red, self.currentTurn);
		self.deleteUser(self.currentTurn);
		self.currentTurn = null;
		self.popUser();
	},

	deleteUser: function(name) {
		if(self.users[name]) {
			delete self.users[name];
			self.spliceQueue(name);
		}
	},

	newStory: function() {
		self.currentIndex += 1;
		var randomLimit = 100 + Math.floor(Math.random() * 800);
		var story = new self.storyModel({paragraphs: [''], index: self.currentIndex, authors: {}, wordCount: 0, wordLimit: randomLimit});
		story.save(function(err,result) {
			if(err) { console.log(err); }
			else {
				self.story = result;
				self.currentIndex = self.story.index;
				self.currentParagraph = self.story.paragraphs.length - 1;
				self.io.sockets.emit('newStory', self.story.wordLimit);
				self.popUser();
			}
		});
	}
};