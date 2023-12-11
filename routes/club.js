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
      //check if the user is illuster or not
      let userInteracting = await UserSchema.findById(req.existUser.id);
      if (userInteracting.illuster === false)
        return res.status(401).json("You are not an illuster.");

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

    // If no club exists at the given id
    if (!existClub) {
      return res.status(404).json("No club found");
    }

    // If the user is unauthorized
    if (existClub.creator.toString() !== req.existUser.id) {
      return res.status(401).json("Unauthorized");
    }

    // Delete the club
    await ClubSchema.findByIdAndDelete(req.params.id);

    // Remove references to the club from users
    await UserSchema.updateMany(
      { "included_in_clubs.clubId": req.params.id },
      { $pull: { included_in_clubs: { clubId: req.params.id } } }
    );

    //remove the clubs from followings
    await UserSchema.updateMany(
      { followingClubs: req.params.id },
      { $pull: { followingClubs: req.params.id } }
    );

    // Delete events associated with the club
    let deletedEvents = await EventSchema.deleteMany({ ofClub: req.params.id });

    // Extract the IDs of the deleted events
    let deletedEventIds = deletedEvents.map((event) => event._id);

    // Remove the events from eventsCreated
    await UserSchema.updateMany(
      { eventsCreated: { $in: deletedEventIds } },
      { $pull: { eventsCreated: { $in: deletedEventIds } } }
    );

    res.status(200).json(`Removed club id: ${existClub.clubName}`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//get the data of a specific club
router.get("/clubData/:id", authUser, async (req, res) => {
  try {
    const club = await ClubSchema.findById(req.params.id);
    if (!club) return res.status(404).json("club not found");
    res.status(200).json(club);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//follow a club
router.put("/follow/:Clubid", authUser, async (req, res) => {
  try {
    const club = await ClubSchema.findById(req.params.Clubid);
    if (!club) return res.status(404).json("club not found");
    const user = await UserSchema.findByIdAndUpdate(
      req.existUser.id,
      {
        $addToSet: {
          followingClubs: req.params.Clubid,
        },
      },
      { new: true }
    );
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//un-follow a club
router.put("/unfollow/:Clubid", authUser, async (req, res) => {
  try {
    const club = await ClubSchema.findById(req.params.Clubid);
    if (!club) return res.status(404).json("club not found");
    const user = await UserSchema.findByIdAndUpdate(
      req.existUser.id,
      {
        $pull: {
          followingClubs: req.params.Clubid,
        },
      },
      { new: true }
    );
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
module.exports = router;
