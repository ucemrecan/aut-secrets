require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const GitHubStrategy = require('passport-github').Strategy;
const findOrCreate = require('mongoose-findorcreate');
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
  password: String,
  googleId: String,
  githubId: String,
  secret: String
});

// PASSPORT LOCAL MONGOOSE
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model('User', userSchema);

// CHANGE: USE "createStrategy" INSTEAD OF "authenticate"
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// GOOGLE OAUTH2
passport.use(new GoogleStrategy({
    clientID:     process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    console.log(profile);
    User.findOrCreate({ username: profile.email, googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));

// GITHUB OAUTH
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/github/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ username:profile.username, githubId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

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

// SUBMIT PAGE
app.route('/submit')


  .get( (req, res) => {
    if (req.isAuthenticated()) {
      res.render('submit');
    } else {
      res.redirect('/login');
    }
  })

  .post( (req, res) => {
    const submittedSecret = req.body.secret;

    User.findById(req.user.id, (err, foundUser) => {
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          foundUser.secret = submittedSecret;
          foundUser.save( () => {
            res.redirect('/secrets');
          });
        }
      }

    })


  })

// GOOGLE LOGIN & REGISTER
app.get('/auth/google',
  passport.authenticate('google', { scope:
  	[ 'openid', 'email', 'profile' ] }
));

app.get( '/auth/google/secrets',
	passport.authenticate( 'google', {
		successRedirect: '/secrets',
		failureRedirect: '/auth/google/failure'
}));

// GITHUB LOGIN & REGISTER
app.get('/auth/github',
  passport.authenticate('github'));

app.get('/auth/github/secrets',
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/secrets');
  });

// SECRETS PAGE
app.route('/secrets')

  .get( ( req,res) => {
    User.find({'secret': {$ne: null}}, (err, foundUsers) => {
      if (err) {
        console.log(err);
      } else {
        if (foundUsers) {
          res.render('secrets', {usersWithSecrets: foundUsers});
        }
      }
    });
  });

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
});
