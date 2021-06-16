const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
const User = require('./models/User');
const Exercise = require('./models/Exercise');
require('dotenv').config()

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}, (err) => {
  if (err) {
    console.log(err.message);
  } else {
    console.log('Connected to database');
  }
});

app.use(cors())
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.route('/api/users')
  .get(async (req, res) => {
    try {
      const users = await User.find({});

      return res.json(users);
    } catch(err) {
      return res.json({ error: err.message });
    }
  })
  .post(async (req, res) => {
    const username = req.body.username;
    
    try {
       const userData = await User.findOne({ username });

       if (userData) {
         return res.json({ message: 'Username already taken' });
       }
    } catch(err) {
      return res.json({ error: err.message });
    }

    const newUser = new User({ username });

    try {
      await newUser.save();
    } catch(err) {
      return res.json({ error: err.message });
    }

    return res.json({
      _id: newUser._id,
      username: newUser.username
    });
  });

app.post('/api/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id;
  let userData;
  
  try {
    userData = await User.findOne({ _id: userId });

    if (!userData) {
      return res.json({ message: 'User not found' });
    }
  } catch(err) {
    return res.json({ error: err.message });
  }

  const { description, duration, date } = req.body;
  const newExercise = new Exercise({
    userId,
    description,
    duration,
    date: (date) ? new Date(date) : new Date()
  });

  try {
    await newExercise.save();
  } catch(err) {
    return res.json({ error: err.message });
  }

  return res.json({
    _id: userData._id,
    username: userData.username,
    date: newExercise.date.toDateString(),
    duration: newExercise.duration,
    description: newExercise.description
  });
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  let userData;

  try {
    userData = await User.findOne({ _id: userId });

    if (!userData) {
      return res.json({ message: 'User not found' });
    }
  } catch(err) {
    return res.json({ error: err.message });
  }

  const { from, to, limit } = req.query;
  const fromDate = new Date(from);
  const toDate = new Date(to);

  try {
    const exercises = await Exercise.find({ 
      userId,
      date: {
        $lte: isNaN(toDate) ? Date.now() : toDate,
        $gte: isNaN(fromDate) ? 0 : fromDate
      }
    }).limit(Number(limit));

    const returnedExercises = exercises.map(exercise => {
      const returnedExercise = {};
      returnedExercise.description = exercise.description;
      returnedExercise.duration = exercise.duration;
      returnedExercise.date = exercise.date.toDateString();

      return returnedExercise;
    });

    return res.json({
      _id: userData._id,
      username: userData.username,
      count: exercises.length,
      log: returnedExercises
    });
  } catch(err) {
    return res.json({ error: err.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
