const express = require('express')
const mongoose=require('mongoose');
const dotenv=require('dotenv').config();
var cors = require('cors')
const app = express()
const PORT = dotenv.PORT || 5500;
//to read data in json format
app.use(cors())
app.use(express.json());
mongoose.connect(process.env.DB_CONNECT).then(()=>console.log("Connected to Database")).catch((err)=>console.log(err))

// routes will be implemented here
const userRoutes = require("./routes/user");
app.use('/',userRoutes);
const eventRoutes = require("./routes/event");
app.use('/',eventRoutes);
const clubRoutes = require("./routes/club");
app.use('/',clubRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});