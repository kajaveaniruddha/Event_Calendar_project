var jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const authUser = (req, res, next) => {
  //get the auth token from user and add id to req object
  const token = req.header("auth-token");
  if (!token) {
    res.status(401).send({ error: "invalid token" });
  }
  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.existUser = data.existUser;
    next();
  } catch (error) {
    res.json(error);
  }
};

module.exports = authUser;
