var _socket;

(function() {

	var ARCHIVED_STORY = {

		init: function() {
			_socket = io.connect();
			var index = $('.archivedStory').attr('data-storyIndex');
			_socket.emit('getStory', index);

			_socket.on('story', function(story) {
				showStory(story);
			});
		}
	};

	$(function() {
		ARCHIVED_STORY.init();
	});

})();

function showStory(story) {
	for(var i = 0; i < story.paragraphs.length; i++) {
		var HTML = '<h3>Story #' + story.index + '<h3>';
		HTML += '<p>' + story.paragraphs[i] + '</p>';
		$('.archivedStory').append(HTML);
	}
}