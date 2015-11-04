var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var passport = require('passport');
var GitHubStrategy = require('passport-github2').Strategy;


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
app.use(session({
  secret: 'keyboard cat'
}));
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(passport.initialize());
app.use(passport.session());

var sessions = {};
var checkUser = function(sessionId, res, callback) {
  if (sessions[sessionId]) callback();
  else res.redirect('/login');
};

app.get('/', ensureAuthenticated,
function(req, res) {
  // checkUser(req.sessionID, res, function() {
    res.render('index');
  // });
});

app.get('/create', ensureAuthenticated,
function(req, res) {
  // checkUser(req.sessionID, res, function() {
    res.render('index');
  // });
});

app.get('/links', ensureAuthenticated,
function(req, res) {
  // checkUser(req.sessionID, res, function() {
    Links.reset().fetch().then(function(links) {
      res.send(200, links.models);
    });
  // });
});

app.post('/links', ensureAuthenticated,
function(req, res) {
  // checkUser(req.sessionID, res, function() {
    var uri = req.body.url;

    if (!util.isValidUrl(uri)) {
      // console.log('Not a valid url: ', uri);
      return res.send(404);
    }

    new Link({ url: uri }).fetch().then(function(found) {
      if (found) {
        res.send(200, found.attributes);
      } else {
        util.getUrlTitle(uri, function(err, title) {
          if (err) {
            console.log('Error reading URL heading: ', err);
            return res.send(404);
          }

          Links.create({
            url: uri,
            title: title,
            base_url: req.headers.origin
          })
          .then(function(newLink) {
            res.send(200, newLink);
          });
        });
      }
    });
  // });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login', 
function(req, res) {
  res.render('login');
});

var GITHUB_CLIENT_ID = "c9d22c28df3aed2dddc4";
var GITHUB_CLIENT_SECRET = "9d8d0d1c3e2d917b0cbacb5bfc1a87bcb7f1dce3";

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: "http://127.0.0.1:4568/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // User.findOrCreate({ githubId: profile.id }, function (err, user) {
      return done(null, profile);
    // });
  }
));

app.get('/auth/github',
  passport.authenticate('github', { scope: [ 'user:email' ] }),
  function(req, res){
  });

app.get('/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
};
// app.get('/signup', 
// function(req, res) {
//   res.render('signup');
// });

// var regenerateAndStoreSession = function(req, callback) {
//   req.session.regenerate(function(err){
//     if (!err) {
//       sessions[req.sessionID] = true;
//       callback();       
//     }
//   });
// };

// app.post('/login',
// function(req, res) {
//   new User({username: req.body.username})
//     .fetch()
//     .then(function(user) {
//       if (!user) {
//         res.redirect('/login');
//       } else {
//         user.comparePassword(req.body.password, function(err, matches){
//           if (matches) {
//             regenerateAndStoreSession(req, function(){
//               res.redirect('/');
//             }); 
//           } else {
//             res.redirect('/login');
//           }
//         }); 
//       }
//     })
//     .catch(function(err) {
//       res.send(500); 
//     });
// });

// app.post('/signup',
// function(req, res) {
//   new User({username: req.body.username})
//     .fetch()
//     .then(function(user){
//       if (user) {
//         res.redirect('/login');
//       } else {
//         var newUser = new User({
//           'username': req.body.username,
//           'password': req.body.password
//         }).save()
//           .then(function(data) {
//             regenerateAndStoreSession(req, function(){ 
//               res.redirect('/');
//             });
//           })
//         }
//       })
//     .catch(function(err) { res.send(500); }); 
// });


app.post('/logout',
function(req, res) {
  req.logout();
  // delete sessions[req.sessionID];
  res.redirect('/login');
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits')+1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
