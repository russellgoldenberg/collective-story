var _socket,
	_name,
	_paragraphs,
	_turnTimeout,
	_time,
	_startTime,
	_turnTime,
	_inputHTML;

var $storyContainer,
	$countAuthors;

(function() {

	var RAMBLINGS = {

		init: function() {
			setupSelectors();
			_socket = io.connect();
			_socket.on('welcome', function (data) {
				_paragraphs = data.paragraphs;
				_turnTime = Math.floor(data.timer / 1000);
				fillStory();
				$countAuthors.text(data.count);
				console.log('welcome', data);
				joinPrompt('Choose a pen name.');
			});
			_socket.on('sendQueue', function (data) {
				console.log('send', data);
				$countAuthors.text(data.count);
				if(data.turn === _name) {
					startTurn();
				} else {
					findName(data.queue);
				}
			});
			_socket.on('addWord', function (data) {
				if(data.name === _name) {
					$('#word').val('');
					$('.message').hide();
					$('.newText').hide();
					$('.contribution').hide();
					$('.newParagraph').hide();
					$('.inQueue').show();
				}
				addWord(data);
			});
			_socket.on('boot', function () {
				displayMessage('You have timed out twice, you are now a mere spectator.');
				$('.message').hide();
				$('.booted').show();
			});
			_socket.on('warning', function () {
				displayMessage('You took too long to contribute during your turn, back of the line!');
			});
			_socket.on('joinResponse', function(data) {
				//if true then accepted
				if(data.join) {
					_name = data.name;
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
		if(queue[i] === _name) {
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
	$('.countdown').text(_turnTime);
	$('.yourTurn').show();
	$('.newText').show();
	$('.contribution').show();
	_time = 0;
	_startTime = new Date().getTime();
	setTimeout(updateTime, 100);
	$('html, body').animate({ scrollTop: $(document).height()}, 'slow' );
	$('#word').focus();
}

function updateTime() {
	_time += 100;
    var elapsed = _turnTime - Math.floor(_time / 1000);

    //to keep it true to time
    var diff = (new Date().getTime() - _startTime) - _time;

    $('.countdown').text(elapsed);

    if(elapsed <= 0) {
		_socket.emit('timeLimit');
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
		e.preventDefault();

		var val = $('#word').val().trim();

		verifyAndSend(val, true);
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
		name: _name,
		newParagraph: para
	};

	_socket.emit('contribute', data);
}

function joinPrompt(p) {
	apprise(p + ' (3-15 characters)', {'input':'nomdeplume', 'textOk':'Join'}, function(r) {

		if(r.length > 0) {
			var tempName = r.trim();
			var check = /^[a-zA-Z]*$/.test(r);
			if(check) {
				if(tempName.length > 15 || tempName.length < 3) {
					joinPrompt('Stay within the lines! Try again.');
				} else {
					_socket.emit('join', tempName);
				}
			} else {
				joinPrompt('Only letters please. Try again.');
			}		
		}
	});
}

function fillStory() {
	$('.story').remove();
	for(var p = 0; p < _paragraphs.length; p++) {
		
		var newPara = '<p class="story index' + p + '"><span class="text">';
		newPara += _paragraphs[p] + '</span></p>';
		$('.storyContainer').prepend(newPara);
	}
	$('p.story').last().append(_inputHTML);
	bindWordCheck();
}

function setupSelectors() {
	$storyContainer = $('.storyContainer');
	$countAuthors = $('.countAuthors');

	_inputHTML = '<span class="newText"><input id="word" placeholder="enter word here..." maxlength="23"></input></span>';
}

function addWord(data) {
	var selector = $('.index' + data.currentParagraph + ' .text');
	var text = $(selector).text() + data.word;
	$(selector).text(text);
}

function bindWordCheck() {
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

    $('#word').on('keypress', function (e) {
		if(e.which === 13) {
			e.preventDefault();
			var val = $('#word').val().trim();
			verifyAndSend(val);
			return false;
		}
	});
}