const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "anygoodenoughstring";
var authUser = require("../middleware/authUser");
//import user model
const UserSchema = require("../models/userSchema");
const ClubSchema = require("../models/clubSchema");

//routes

//register user
router.post(
  "/registerUser",
  [
    body("email", "Enter a valid email").isEmail().normalizeEmail(),
    body("name", "min length is 3").isLength({ min: 3 }).escape(),
    body("password", "at least 6 characters").isLength({ min: 6 }).escape(),
    body("institute_id", "at least 3 characters").isLength({ min: 3 }).escape(),
    //prevent HTML injection and Cross-Site Scripting (XSS) attacks by escaping special characters.
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
        });
      }

      //check if user already exists or not
      let alreadyUser = await UserSchema.findOne({ email: req.body.email });
      if (alreadyUser) {
        return res.status(400).json({ errors: "User already exists" });
      }

      //password hashing
      var salt = bcrypt.genSaltSync(10);
      var hashPass = bcrypt.hashSync(req.body.password, salt);

      const newUser = await UserSchema({
        name: req.body.name,
        email: req.body.email,
        password: hashPass,
        institute_id: req.body.institute_id,
      });

      //save new user
      await newUser.save();

      //creating auth-token using object id
      const data = {
        newUser: {
          id: newUser.id,
        },
      };
      const authtoken = jwt.sign(data, JWT_SECRET);
      res.status(200).json(authtoken);
      //   res.status(200).json({ success, errors: "user added successfully" });
    } catch (error) {
      res.json(error);
    }
  }
);

//login
router.post(
  "/loginUser",
  [
    body("email", "Enter a valid email").isEmail(),
    body("password", "password minimum length is 6").isLength({ min: 6 }),
  ],
  async (req, res) => {
    const { email, password } = req.body;
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
        });
      }
      //check if user already exists or not
      let existUser = await UserSchema.findOne({ email: email });
      if (!existUser) {
        return res
          .status(400)
          .json({ success, errors: "invalid login credentials" });
      }

      const checkPass = await bcrypt.compare(password, existUser.password);
      if (!checkPass) {
        return res
          .status(400)
          .json({ success, errors: "invalid login credentials" });
      }

      const payload = {
        existUser: {
          id: existUser.id,
        },
      };
      const authtoken = jwt.sign(payload, JWT_SECRET);

      // res.status(200).json("login success");
      res.status(200).json(authtoken);
    } catch (error) {
      res.json(error);
    }
  }
);

//get all users except the one logged in
router.get("/allUsers", authUser, async (req, res) => {
  try {
    const userId = req.existUser.id;
    const allUsers = await UserSchema.find({}).select("-password");

    const filteredUsers = allUsers.filter(
      (user) => user._id.toString() !== userId
    );

    res.status(200).json(filteredUsers);
  } catch (error) {
    res.json(error);
  }
});

//get all data if that user
router.get("/myData", authUser, async (req, res) => {
  try {
    const user = await UserSchema.findById(req.existUser.id).select(
      "-password"
    );
    // Use Promise.all to handle asynchronous operations inside map
    const IncludedInClubs = await Promise.all(
      user.included_in_clubs.map(async (club) => {
        const includedInClubNames = await ClubSchema.findById(club.clubId);
        return includedInClubNames.clubName;
      })
    );

    // Use Promise.all to handle asynchronous operations inside map
    const FollwingClubs = await Promise.all(
      user.followingClubs.map(async (clubId) => {
        const FollwingClubsNames = await ClubSchema.findById(clubId);
        return FollwingClubsNames.clubName;
      })
    );
    // Send the user data as response, excluding the password field
    res.status(200).json({ user, IncludedInClubs,FollwingClubs});
  } catch (error) {
    res.json(error);
  }
});

module.exports = router;
