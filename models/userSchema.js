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
    type: [mongoose.ObjectId],
  },
  included_in_clubs: [
    {
      clubId: { type: mongoose.ObjectId, required: true },
      designation: {
        type: ["member" || "vice-president" || "president"],
        default: "member",
      },
    },
  ],
  illuster: { type: Boolean, default: false },
  admin: { type: Boolean, default: false },
  eventsCreated: [mongoose.ObjectId],
});

module.exports = mongoose.model("users", UserSchema);
