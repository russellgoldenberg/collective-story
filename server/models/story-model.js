module.exports = function(mongoose, db, Schema, ObjectId) {

	var StorySchema = new Schema({
		paragraph: String,
		index: Number
	});

	var StoryModel = db.model('Story', StorySchema, 'storys');

	return StoryModel;

};