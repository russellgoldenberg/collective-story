module.exports = function(mongoose, db, Schema, ObjectId) {

	var UserSchema = new Schema({
		name: String,
		email: String,
		contributions: [{
			index: Number,
			word: String
		}]
	});

	var UserModel = db.model('User', UserSchema, 'users');

	return UserModel;

};