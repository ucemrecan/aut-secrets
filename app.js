require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const mongoose = require('mongoose');
// const encrypt = require('mongoose-encryption');
const md5 = require('md5');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
mongoose.set('strictQuery', true); // deprecation warning

// database
mongoose.connect('mongodb://127.0.0.1:27017/userDB', {useNewUrlParser: true, useUnifiedTopology: true});

const userSchema = new mongoose.Schema( {
  email: String,
  password: String
});

// data encryption
// const secret = process.env.SECRET;
// userSchema.plugin(encrypt, { secret: secret , encryptedFields: ['password'] }); // eklenti modelden önce yazılmalıdır.

const User = new mongoose.model('User', userSchema);


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
    User.findOne( {email: req.body.username},
                 (err, foundUser) => {
                   if (err) {
                     console.log(err);
                   } else {
                     if (foundUser) {
                       if (foundUser.password === md5(req.body.password)) {
                         res.render('secrets');
                         console.log(foundUser.password);
                       } else {
                         console.log('Wrong password');
                       };
                     };
                 };
               });
  })

// REGISTER PAGE
app.route('/register')

  .get( (req, res) => {
    res.render('register');
  })

  .post( (req, res) => {

    const newUser = new User( {
      email: req.body.username,
      password: md5(req.body.password)
    });

    newUser.save( (err) => {
      if (err) {
        console.log(err);
      } else {
        res.render('secrets');
      };
    });
  })



app.listen(port, () => {
  console.log(`Server started on port ${port}`);
})
