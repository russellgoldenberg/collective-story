var _socket;

(function() {

	var ARCHIVES = {

		init: function() {
			//connect socket
			_socket = io.connect();
			
			_socket.emit('listStories');

			_socket.on('stories', function(stories) {
				console.log(stories);
			});
		}
	};

	$(function() {
		ARCHIVES.init();
	});

})();