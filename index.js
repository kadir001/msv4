const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

app.use(bodyParser.urlencoded({ extended: true })); // To parse form data
app.use(bodyParser.json()); // To parse JSON data

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("Connected to MongoDB!"))
.catch(err => console.error("MongoDB connection error:", err));

// Middleware to parse URL-encoded form data
app.use(bodyParser.urlencoded({ extended: true }));

// Define Mongoose Schema (only storing username)
const personSchema = new mongoose.Schema({
  username: { type: String, required: true },
  exercises: [
    {
      description: String,
      duration: Number,
      date: String,
    }
  ]
});

// Create Model
const Person = mongoose.model("Person", personSchema);

// ✅ Create API endpoint to add a new user (only username)
app.post("/api/users", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Create a new person document
    const newPerson = new Person({ username });

    // Save to MongoDB
    const savedPerson = await newPerson.save();

    // Respond with the created user and _id
    res.status(201).json({
      username: savedPerson.username,
      _id: savedPerson._id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    // Only fetch users who have a username
    const users = await Person.find({ username: { $exists: true } }, 'username _id').exec();

    // Return the users array as JSON
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  try {
    const user = await Person.findById(_id);
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // Convert date to required format or use today’s date
    const exerciseDate = date ? new Date(date) : new Date();
    const formattedDate = exerciseDate.toDateString(); // "Mon Jan 01 1990"

    const newExercise = {
      description,
      duration: parseInt(duration),
      date: formattedDate,
    };

    user.exercises.push(newExercise);
    await user.save();

    res.json({
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date,
      _id: user._id,
    });
  } catch (error) {
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const user = await Person.findById(_id);
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    let logs = user.exercises;

    // Apply date filters if provided
    if (from) {
      const fromDate = new Date(from);
      logs = logs.filter(exercise => new Date(exercise.date) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      logs = logs.filter(exercise => new Date(exercise.date) <= toDate);
    }

    // Apply limit if provided
    if (limit) {
      logs = logs.slice(0, parseInt(limit));
    }

    res.json({
      username: user.username,
      count: logs.length,
      _id: user._id,
      log: logs.map(exercise => ({
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString() // Ensure correct format
      }))
    });

  } catch (error) {
    res.status(500).json({ error: "Database error", details: error.message });
  }
});





const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
