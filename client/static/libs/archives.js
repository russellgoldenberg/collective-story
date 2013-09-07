var _socket;

(function() {

	var ARCHIVES = {

		init: function() {
			//connect socket
			_socket = io.connect();
			
			_socket.emit('listStories');

			_socket.on('stories', function(stories) {
				showStories(stories);
			});
		}
	};

	$(function() {
		ARCHIVES.init();
	});

})();

function showStories(stories) {
	// for(var i = 0; i < stories.length - 1; i++) {
	for(var i = 0; i < stories.length; i++) {
		var HTML = '<h3><a href="/archivedStory/' + stories[i].index + '">Story #' + stories[i].index;
		HTML += ' (' + stories[i].wordCount + ' words)</a></h3><p>Authored By: ';
		for(var author in stories[i].authors) {
			HTML += author + ' [' + stories[i].authors[author] + '] -- ';
		}
		HTML += '</p>';
		$('.storyList').append(HTML);
	}
}