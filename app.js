require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
mongoose.set('strictQuery', true); // deprecation warning

// SESSION
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

// PASSPORT
app.use(passport.initialize());
app.use(passport.session());

// database
mongoose.connect('mongodb://127.0.0.1:27017/userDB', {useNewUrlParser: true, useUnifiedTopology: true});

const userSchema = new mongoose.Schema( {
  email: String,
  password: String
});

// PASSPORT LOCAL MONGOOSE
userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model('User', userSchema);

// CHANGE: USE "createStrategy" INSTEAD OF "authenticate"
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// GET
// HOME PAGE
app.get('/', (req, res) => {
  res.render('home');
})

// LOGIN PAGE
app.route('/login')

  .get( (req, res) => {
    res.render('login');
  })

  .post( (req, res) => {
    const newUser = new User( {
      username: req.body.username,
      password: req.body.password
    });

    req.login(newUser, (err) => {
      if (err) {
        console.log(err);
        res.redirect('/login');
      } else {
        passport.authenticate('local')( req, res, () => {
          res.redirect('/secrets');
        });
      };
    });
  })

// REGISTER PAGE
app.route('/register')

  .get( (req, res) => {
    res.render('register');
  })

  .post( (req, res) => {

    User.register({username: req.body.username}, req.body.password, (err, user) => {
      if (err) {
        console.log(err);
        res.redirect('/register');
      } else {
        passport.authenticate('local')( req, res, () => {
          res.redirect('/secrets');
        });
      };
    });

  })

// SECRETS PAGE
app.route('/secrets')

  .get( ( req,res) => {
    // if they are logged in
    if (req.isAuthenticated()) {
      res.render('secrets');
    } else {
      res.redirect('/login');
    }
  })

// LOGOUT PAGE
app.get('/logout', (req, res) => {
  req.logout( (err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect('/');
    };
  });
});


// LISTEN
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
})
