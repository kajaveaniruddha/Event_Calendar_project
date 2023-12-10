const mongoose = require("mongoose");

// Event schema
const EventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    creator: {
      type: mongoose.ObjectId,
      required: true,
    },
    ofClub: {
      type: mongoose.ObjectId,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    venue: {
      type: String,
      required: true,
    },
    organisers:{
      type:[mongoose.ObjectId],
    }
  },
  {
    timestamps: true, // Add timestamps (createdAt and updatedAt)
  }
);

module.exports = mongoose.model("events", EventSchema);
