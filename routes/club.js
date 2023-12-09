const router = require("express").Router();
var authUser = require("../middleware/authUser");
const { body, validationResult } = require("express-validator");
//import task model
const EventSchema = require("../models/eventSchema");
const UserSchema = require("../models/userSchema");
const ClubSchema = require("../models/clubSchema");

// routes
//get all clubs
router.get("/allClubs", async (req, res) => {
  try {
    const allClubs = await ClubSchema.find();
    // console.log("error",allTasks);
    res.status(200).json(allClubs);
  } catch (error) {
    res.json(error);
  }
});

//add a club
router.put(
  "/addClub",
  authUser,
  [
    body("clubName", "min length is 2").isLength({ min: 2 }).escape(),
    body("description", "at least 5 characters").isLength({ min: 5 }).escape(),
  ],
  async (req, res) => {
    try {
      const { clubName, description } = req.body;
      // If validation fails
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
        });
      }

      // If validation success - create new event
      //check if club already exists or not
      let alreadyClub = await ClubSchema.findOne({ clubName: clubName });
      if (alreadyClub) {
        return res.status(400).json({ errors: "Club already exists" });
      }

      const newClub = new ClubSchema({
        clubName,
        description,
        creator: req.existUser.id,
      });

      await newClub.save();
      await UserSchema.findByIdAndUpdate(
        req.existUser.id,
        {
          $addToSet: {
            followingClubs: newClub.id,
            included_in_clubs: {
              clubId: newClub.id,
            },
          },
        },
        { new: true }
      );

      res.status(200).json(newClub);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

//delete an event
router.delete("/deleteClub/:id", authUser, async (req, res) => {
  try {
    // If validation fails
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }
    let existClub = await ClubSchema.findById(req.params.id);
    //if no task exists at given id
    if (!existClub) {
      return res.status(404).json("No club found");
    }
    //if user is unauthorized
    if (existClub.creator.toString() !== req.existUser.id) {
      return res.status(401).json("Unauthorized");
    }
    await ClubSchema.findByIdAndDelete(req.params.id);
    //removing from creator only
    //need to work on removal from other users
    await UserSchema.findByIdAndUpdate(
      req.existUser.id,
      {
        $pull: {
          included_in_clubs: { clubId: req.params.id },
        },
      },
      { new: true }
    );
    res.status(200).json(`removed club id: ${req.params.id}`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
