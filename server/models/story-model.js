module.exports = function(mongoose, db, Schema, ObjectId) {

	var StorySchema = new Schema({
		story: [String]
	});

	var StoryModel = db.model('Story', StorySchema, 'storys');

	return StoryModel;

};