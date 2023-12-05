const mongoose = require("mongoose");
//users schema
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  institute_id: {
    type: String,
    required: true,
  },
  followingClubs: {
    type: [String],
  },
  inc_clubs: [
    {
      club: { type: String },
      designation: ["member" || "vice-president" || "president" || "none"],
    },
  ],
});

module.exports = mongoose.model("user", UserSchema);
