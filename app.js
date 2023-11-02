//jshint esversion:6

// Make install this file and require it at start for storing any secret data
// or any sensitive information.
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

// Enctryption Module for mongoose .
// const encrypt = require("mongoose-encryption");

// Using MD5 for encryption
// const md5 = require("md5");

// Using Bcrypt library for encryption
// const bcrypt = require("bcrypt");
// const saltRounds = 10;

// Using Passport for making Cookie-Session 
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

// Adding OAuth Google Strategy
var GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

// console.log(process.env.API_KEY);

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: "Our little Secret.",
    resave: false,
    saveUninitialized : false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});

// Full mongoose schema needed for encryption methods
const userSchema = new mongoose.Schema ({
    firstName: String,
    lastName: String,
    email: String,
    password: String,
    googleId: String, 
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// creating a base for encryption method to work

// userSchema.plugin(encrypt, {secret : process.env.SECRET, encryptedFields: ['password']  });


const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// Use these 2 lines for simple Login not for along with Google SignIn
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

// for google signin use Serialise and deserialise as below
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id).then( function(user, err) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function(req, res) {
    res.render("home");
});

// Important Route for SignIn using Google
app.get("/auth/google",
    passport.authenticate("google", {scope: ["profile"] })
);

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  });

app.get("/login", function(req, res) {
    res.render("login");
});

app.get("/register", function(req, res) {
    res.render("register");
});

app.get("/secrets", function(req, res) {
    // console.log(req.isAuthenticated());
    // if(req.isAuthenticated()) {
    //     res.render("secrets");
    // }
    // else {
    //     res.redirect("/login");
    // }
    User.find({"secret": {$ne: null}}).then(function(foundUsers, err) {
        if(err) console.log(err);
        else {
            if(foundUsers) {
                res.render("secrets", {usersWithSecrets : foundUsers});
            }
        }
    }); 
});

app.get("/submit", function(req, res) {
    if(req.isAuthenticated()) {
        res.render("submit");
    }
    else {
        res.redirect("/login");
    }
});

app.post("/submit", function(req, res) {
    const submittedSecret = req.body.secret;

    // console.log(req.user.id);

    User.findById(req.user.id).then(function(foundUser, err) {
        if(err) console.log(err);
        else {
            if(foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save().then(function() {
                    res.redirect("/secrets");
                });
            }
        }
    });

});

app.get("/logout", function(req, res) {
    req.logout(function(err) {
        if(err) {
            console.log(err);
        }
        else {
        res.redirect("/");
        }
    });
    
})


app.post("/register", function(req, res) {

    User.register({username: req.body.username}, req.body.password, function(err, user) {
        // console.log(err + " - " + user);
        if(err)
        {
            console.log(err);
            res.redirect("/register");
        }
        else {
            passport.authenticate("local")(req, res, function() {
                // alert("User Registered Successfully !");
                res.redirect("/login");
            });
        }
    });

    // bcrypt.hash(req.body.password, saltRounds, function(hash, err) {
    //     const newUser = new User({
    //         email: req.body.username,
    //         password: hash  // making hash as password
    //     });
    
    //     newUser.save().then(function(result,err) {
    //         // if(!err) {res.render("secrets");}  // rendering secrets page
            
    //         if(err) 
    //         {
    //             console.log(err);
    //         }
    //         else {
    //             res.render("secrets");
    //         }
    
    //     });
    // });

    // const newUser = new User({
    //     email: req.body.username,
    //     password: md5(req.body.password)  // encrypting the password with MD5
    // });

    // newUser.save().then(function(result,err) {
    //     // if(!err) {res.render("secrets");}  // rendiering secrets page
        
    //     if(err) 
    //     {
    //         console.log(err);
    //     }
    //     else {
    //         res.render("secrets");
    //     }

    // });
});

app.post("/login", function(req, res) {
    // const username = req.body.username;
    // const password = req.body.password;

    // console.log(md5(req.body.password));

    // User.findOne({email: username}).then(function(foundUser, err) {
    //     if(err) {
    //         console.log(err);
    //     }
    //     else {
    //         if( foundUser) {
    //             if(foundUser.password == password) {
    //                 res.render("secrets");
    //             }
    //         }
    //     }
    // });

    // User.findOne({email: username}).then(function(foundUser, err) {
    //     if(err) {
    //         console.log(err);
    //     }
    //     else {
    //         if(foundUser) {
    //             bcrypt.compare(password, foundUser.password, function(error, result) {
    //                 console.log(result + " - " + error);
    //                 if(result == true) {
    //                     res.render("secrets");
    //                 }
    //             });
    //         }
    //     }
    // });

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err) {
        if(err) {
            console.log(err);
        }
        else {
            passport.authenticate("local")(req, res, function() {
                console.log("Successfully Logged into System");
                res.redirect("/secrets");
            });
        }
    });

});



app.listen(3000, function() {
    console.log("Server started on PORT 3000.");
});