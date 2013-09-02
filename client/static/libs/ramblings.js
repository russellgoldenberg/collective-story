var socket,
	id,
	story,
	turnTimeout,
	time,
	startTime,
	elapsed,
	turnTime = 5;


(function() {

	var RAMBLINGS = {

		init: function() {
			socket = io.connect();
			socket.on('welcome', function (data) {
				id = data.id;
				story = data.story;
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
					$('.newText').hide();
					$('.contribution').hide();
					$('.yourTurn').hide();
					$('.inQueue').show();
				}
				story = $('.storyText').text() + data.word;
				$('.storyText').text(story);
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
				$('.onDeck').show();
				$('.inQueue').hide();
			} else {
				$('.countAhead').text(i);	
			}
			break;
		}
	}
}

function startTurn() {
	$('.inQueue').hide();
	$('.onDeck').hide();
	secondsLeft = turnTime;
	$('.countdown').text(secondsLeft);
	$('.yourTurn').show();
	$('.newText').show();
	$('.contribution').show();
	time = 0;
	startTime = new Date().getTime();
	setTimeout(updateTime, 100);
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
		var val = $('#word').val().trim(),
			data = {
				word: val,
				id: id
			};
		socket.emit('contribute', data);
    });
}