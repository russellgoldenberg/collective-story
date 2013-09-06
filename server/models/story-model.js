module.exports = function(mongoose, db, Schema, ObjectId) {

	var StorySchema = new Schema({
		paragraphs: [String],
		index: Number,
		authors: {},
		wordCount: Number
	});

	var StoryModel = db.model('Story', StorySchema, 'storys');

	return StoryModel;

};