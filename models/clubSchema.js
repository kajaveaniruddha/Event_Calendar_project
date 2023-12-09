const mongoose = require("mongoose");
//clubs schema
const ClubSchema = new mongoose.Schema(
  {
    clubName: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    creator: {
      type: mongoose.ObjectId,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("clubs", ClubSchema);
