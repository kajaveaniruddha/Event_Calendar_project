const router = require("express").Router();
var authUser = require("../middleware/authUser");
const { body, validationResult } = require("express-validator");
//import event model
const EventSchema = require("../models/eventSchema");
const UserSchema = require("../models/userSchema");
const ClubSchema = require("../models/clubSchema");

// routes
//get all events
router.get("/allEvents", async (req, res) => {
  try {
    const allEvents = await EventSchema.find();
    allEvents.sort((a, b) => {
      a.startTime > b.startTime;
    });

    // console.log("error",allEvents);
    res.status(200).json(allEvents);
  } catch (error) {
    res.json(error);
  }
});

//get event data from eventID
router.get("/eventData/:eventid", async (req, res) => {
  try {
    const eventData = await EventSchema.findById(req.params.eventid);
    // console.log("error",allEvents);
    res.status(200).json(eventData);
  } catch (error) {
    res.json(error);
  }
});

//add an event
router.put(
  "/addEvent/:clubId",
  authUser,
  [
    body("title", "min length is 2").isLength({ min: 2 }).escape(),
    body("description", "at least 5 characters").isLength({ min: 5 }).escape(),
    body("startTime", "must be in format: YYYY-MM-DDTHH:mm:ss.000+05:00")
      .isISO8601()
      .toDate()
      .escape(),
    body("endTime", "must be in format: YYYY-MM-DDTHH:mm:ss.000+05:00")
      .isISO8601()
      .toDate()
      .escape(),
    body("venue", "at least 5 characters").isLength({ min: 5 }).escape(),
  ],
  async (req, res) => {
    try {
      const { title, description, venue, startTime, endTime } = req.body;

      // If validation fails
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
        });
      }

      // If validation success - create new event
      const newEvent = new EventSchema({
        title,
        description,
        startTime,
        endTime,
        venue,
        creator: req.existUser.id,
        ofClub: req.params.clubId,
      });

      //if not member then can't create an event
      let creator = await UserSchema.findById(req.existUser.id);

      if (!creator || !creator.included_in_clubs) {
        return res
          .status(401)
          .json({ error: "User data not found or incomplete" });
      }

      // club exists or not
      const clubExist = await ClubSchema.findById(req.params.clubId);
      if (!clubExist) return res.status(404).json("Club not found.");

      // saving event
      await newEvent.save();
      await EventSchema.findByIdAndUpdate(
        req.existUser.id,
        {
          $addToSet: {
            ofClub: req.params.clubId,
            organisers: req.existUser.id,
          },
        },
        { new: true }
      );

      await UserSchema.findByIdAndUpdate(
        req.existUser.id,
        {
          $addToSet: {
            eventsCreated: newEvent.id,
          },
        },
        { new: true }
      );

      res.status(200).json(newEvent);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

//delete an event
router.delete("/deleteEvent/:id", authUser, async (req, res) => {
  try {
    // If validation fails
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }
    let existEvent = await EventSchema.findById(req.params.id);
    //if no event exists at given id
    if (!existEvent) {
      return res.status(404).json("No event found");
    }
    //if user is unauthorized
    if (existEvent.creator.toString() !== req.existUser.id) {
      return res.status(401).json("Unauthorized");
    }

    await EventSchema.findByIdAndDelete(req.params.id);
    await UserSchema.findByIdAndUpdate(
      req.existUser.id,
      {
        $pull: {
          eventsCreated: req.params.id,
        },
      },
      { new: true }
    );
    res.status(200).json(`removed event ${req.params.id}`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//add oraganisers to the event
//returns a json with whole list of organisers for that event
//id = id of event
router.post(
  "/addOrganiser/:id",
  authUser,
  [body("email", "should be email").isEmail().normalizeEmail()],
  async (req, res) => {
    try {
      const { email } = req.body;
      //if validation fails
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
        });
      }
      //if validation success
      let existEvent = await EventSchema.findById(req.params.id);
      //if no event exists at given id
      if (!existEvent) {
        return res.status(404).json("No event found");
      }
      //if user is unauthorized
      if (existEvent.creator.toString() !== req.existUser.id) {
        return res.status(401).json("Unauthorized");
      }
      //if organiser not found
      const organiser = await UserSchema.findOne({ email: email });
      if (!organiser) {
        return res.status(404).json("No organiser found to add");
      }
      //adding organiser to yourself event to yourself
      let organiserId = await UserSchema.findOne({ _id: existEvent.creator });
      if (organiserId.email === email) {
        return res.status(403).json("You are already an organiser.");
      }
      //adding organiser id to array of organisers
      existEvent = await EventSchema.findByIdAndUpdate(
        req.params.id,
        {
          $addToSet: {
            organisers: organiser._id,
          },
        },
        { new: true }
      );

      const organisersData = { email: organiser.email, name: organiser.name };

      res.status(200).json(organisersData);
    } catch (error) {
      res.json(error);
    }
  }
);

//remove Organiser
//ide=id of event
//emailOrg=email of Organiser
//returns the list of all Organisers after deletion of that event
router.delete("/deleteOrganiser/:ide/:emailOrg", authUser, async (req, res) => {
  try {
    const eventId = req.params.ide;
    const OrganiserEmail = req.params.emailOrg;

    // Check if the user is authorized
    const existEvent = await EventSchema.findById(eventId);

    if (!existEvent) {
      return res.status(404).json("No event found");
    }

    if (existEvent.creator.toString() !== req.existUser.id) {
      return res.status(401).json("Unauthorized");
    }

    // Find the Organiser by their email
    const Organiser = await UserSchema.findOne({ email: OrganiserEmail });

    // If Organiser not found or not associated with the event
    if (!Organiser || !existEvent.Organisers.includes(Organiser._id)) {
      return res
        .status(401)
        .json("No Organiser found or not associated with the event");
    }

    // Remove the Organiser from the event's Organisers array
    await EventSchema.findByIdAndUpdate(
      eventId,
      {
        $pull: {
          Organisers: Organiser._id,
        },
      },
      { new: true }
    );

    // Retrieve the updated list of Organisers
    const updatedEvent = await EventSchema.findById(eventId).populate(
      "Organisers",
      ["email", "name"]
    );

    const OrganisersData = updatedEvent.Organisers.map((organizer) => {
      return {
        email: organizer.email,
        name: organizer.name,
      };
    });

    res.status(200).json(OrganisersData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
