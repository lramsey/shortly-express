var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bcrypt = require('bcrypt-nodejs');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.use(express.cookieParser());
app.use(express.cookieSession({ 'secret': 'secret' }));

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(partials());
  app.use(express.bodyParser())
  app.use(express.static(__dirname + '/public'));
});

app.get('/logout', function(req, res){
  req.session.loggedIn = false;
  res.redirect('/login');
})

app.get('/', function(req, res) {
  if(util.checkUser(req)){
    res.render('index');
  } else {
    res.redirect('/login');
  }
});

app.get('/create', function(req, res) {
  if(util.checkUser(req)){
    res.render('index');
  } else {
    res.redirect('/login');
  }
});

app.get('/login', function(req, res) {
  res.render('login');
})

app.get('/signup', function(req, res){
  res.render('signup')
});

app.get('/links', function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  })
});

app.post('/links', function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404, 'Invalid url');
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

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin,
          user_id: req.session.user_id
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

app.post('/signup', function(req, res){
  var name = req.body.username.toLowerCase();
  var pword = req.body.password;
  //isValidUsername?
  if(!util.isValidUsername(name)) {
    console.log('Not a valid username: ', name);
    return res.send(404, "not a valid username");
  }
  // does username already exist?
  new User({username: name}).fetch().then(function(found) {
    if(found) {
      res.send(404, 'That username is already taken.');
    } else {
      var user = new User({
        username: name,
        password: pword
      });

      user.save().then(function(newUser){
        Users.add(newUser);
        res.send(200);
      });
      req.session.loggedIn = true;
      res.redirect('/');

    }
  });

});

app.post('/login', function(req, res){
  var name = req.body.username.toLowerCase();
  var pword = req.body.password;

  new User({username: name}).fetch().then(function(found) {
    if(!found){
      res.redirect('/login');
    } else{
      found.compare(pword, function(response){
        if(response){
          req.session.loggedIn = true;
          req.session.user_id = found.id;
          console.log(found);
          res.redirect('/');
        }else {
          res.redirect('/login');
        }
      })

    }
  });

});


/************************************************************/
// Write your authentication routes here
/************************************************************/



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
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
