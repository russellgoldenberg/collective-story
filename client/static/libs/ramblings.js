var socket,
	name,
	story,
	turnTimeout,
	time,
	startTime,
	elapsed,
	turnTime;


(function() {

	var RAMBLINGS = {

		init: function() {
			socket = io.connect();
			socket.on('welcome', function (data) {
				story = data.story;
				turnTime = Math.floor(data.timer / 1000);
				$('.storyText').text(story);
				$('.countTotal').text(data.count);
				console.log('welcome');
				joinPrompt('Choose a pen name.');				
			});
			socket.on('sendQueue', function (data) {
				console.log('send', data);
				$('.countTotal').text(data.count);
				if(data.turn === name) {
					startTurn();
				} else {
					findName(data.queue);
				}
			});
			socket.on('addWord', function (data) {
				if(data.name === name) {
					$('#word').val('');
					$('.message').hide();
					$('.newText').hide();
					$('.contribution').hide();
					$('.newParagraph').hide();
					$('.inQueue').show();
				}
				story = $('.storyText').text() + data.word;
				$('.storyText').text(story);
			});
			socket.on('boot', function () {
				displayMessage('You have timed out twice, you are now a mere spectator.');
				$('.message').hide();
				$('.booted').show();
			});
			socket.on('warning', function () {
				displayMessage('You took too long to contribute during your turn, back of the line!');
			});
			socket.on('joinResponse', function(data) {
				//if true then accepted
				if(data.join) {
					name = data.name;
					$('.join').hide();
				} else {
					joinPrompt(data.name + ' is taken. Try another.');
				}
			});

			setupEvents();
		}
	};

	$(function() {
		RAMBLINGS.init();
	});

})();

function findName(queue) {
	for(var i = 0; i < queue.length; i++) {
		if(queue[i] === name) {
			if(i===0) {
				$('.message').hide();
				$('.onDeck').show();
			} else {
				$('.countAhead').text(i);	
			}
			break;
		}
	}
}

function startTurn() {
	$('.message').hide();
	secondsLeft = turnTime;
	$('.countdown').text(secondsLeft);
	$('.yourTurn').show();
	$('.newText').show();
	$('.contribution').show();
	time = 0;
	startTime = new Date().getTime();
	setTimeout(updateTime, 100);
	$('html, body').animate({ scrollTop: $(document).height()}, 'slow' );
	$('#word').focus();
}

function updateTime() {
	time += 100;
    elapsed = turnTime - Math.floor(time / 1000);

    //to keep it true to time
    var diff = (new Date().getTime() - startTime) - time;

    $('.countdown').text(elapsed);

    if(elapsed <= 0) {
		socket.emit('timeLimit');
    } else {
        setTimeout(updateTime, (100 - diff));
    }
}

function setupEvents() {
	$('.joinButton').on('click', function (e) {
		e.preventDefault();
		joinPrompt('Choose a pen name.');
		return false;
	});
	$('.contribute').on('click', function (e) {
		e.preventDefault();

		var val = $('#word').val().trim();

		verifyAndSend(val);
		return false;
    });

    $('.newParaButton').on('click', function(e) {
    	console.log('ah');
		e.preventDefault();

		var val = $('#word').val().trim();

		verifyAndSend(val, true);
		return false;
    });

    $('#word').on('input', function (e) {
		e.preventDefault();
		var val = $(this).val().trim();

		//check if it is more than 1 word
		var split = val.split(' ');
		if(split.length === 1) {
			var word = split[0];
				wordLength = split[0].length;
			//make sure it is not nothing
			if(wordLength > 0) {
				$('.contribute, .newParaButton').addClass('btn-primary');

				//check if last char should prompt new Para
				var lastChar = word.charAt(wordLength-1);
				
				//TODO use regex!
				if(lastChar === '.' || lastChar === '!' || lastChar === '?') {
					$('.newParagraph').show();
				} else {
					$('.newParagraph').hide();
				}
				return;
			}
		}

		$('.contribute, .newParaButton').removeClass('btn-primary');
		return false;
	});
}

function displayMessage(text) {
	$('.appriseOuter, .appriseOverlay').remove();
	apprise(text);
}

function verifyAndSend(val, para) {
	if(val.length < 1) {
		displayMessage('You must enter more than nothing.');
		return;
	}

	//check if it is more than 1 word
	var split = val.split(' ');
	if(split.length > 1) {
		displayMessage('You must enter a single word.');
		return;
	}

	var	data = {
		word: split[0],
		name: name,
		paragraph: para
	};

	socket.emit('contribute', data);
}

function joinPrompt(p) {
	apprise(p + ' (3-15 characters)', {'input':'nomdeplume', 'textOk':'Join'}, function(r) {

		if(r.length > 0) {
			var name = r.trim();
			var check = /^[a-zA-Z]*$/.test(r);
			if(check) {
				if(name.length > 15 || name.length < 3) {
					joinPrompt('Stay within the lines! Try again.');
				} else {
					socket.emit('join', name);
				}
			} else {
				joinPrompt('Only letters please. Try again.');
			}		
		}
	});
}