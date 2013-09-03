var socket,
	id,
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
				id = data.id;
				story = data.story;
				turnTime = Math.floor(data.timer / 1000);
				$('.storyText').text(story);
				findId(data.queue);
				console.log('welcome: ', id);
			});
			socket.on('sendQueue', function (data) {
				console.log('send', data);
				if(data.turn === id) {
					startTurn();
				} else {
					findId(data.queue);
				}
			});
			socket.on('addWord', function (data) {
				// console.log('add word:', data);
				// console.log(data.id, id);
				if(data.id === id) {
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

			setupEvents();
		}
	};

	$(function() {
		RAMBLINGS.init();
	});

})();

function findId(queue) {
	for(var i = 0; i < queue.length; i++) {
		if(queue[i] === id) {
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
		id: id,
		paragraph: para
	};

	socket.emit('contribute', data);
}