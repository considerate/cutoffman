/* jshint esnext:true */
var koa = require('koa');
var app = koa();
require('koa-qs')(app);
var router = require('koa-router')();
var cors = require('koa-cors');
var fs = require('fs');
var thunkify = require('thunkify');
var readFile = thunkify(fs.readFile);
var jws = require('jws');
var logger = require('koa-logger');
var request = require('request');

// body parser
var bodyParser = require('koa-bodyparser');
app.use(bodyParser());

// Sessions
var passport = require('koa-passport');


var facebookID = '1568713960048262';
var facebookSecret = '088ce9f20c92758f7a4b904fea1c62ea';
var FacebookStrategy = require('passport-facebook').Strategy;
passport.use(new FacebookStrategy({
    clientID: facebookID,
    clientSecret: facebookSecret,
    callbackURL: 'http://localhost:' + (process.env.PORT || 8888) + '/auth/facebook/callback'
  },
  function(token, tokenSecret, profile, done) {
      done(null, profile);
  }
));

router.get('/auth/facebook',
  passport.authenticate('facebook', { session: false, scope: [] })
)

function req(url) {
    return new Promise(function(resolve,reject) {
        request.get(url, function(err,result) {
            if(err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

router.get('/auth/facebook/callback',
    passport.authenticate('facebook', { session: false, failureRedirect: "/" }),
    function*() {
        var code = this.query.code;
        var json = yield req('https://graph.facebook.com/me?fields=id&access_token='+code);
        var token = signUserToken(json.id);
        this.body = {token: token};
    }
);

router.get('/users', function* () {
   var userJson = yield readFile('users.json');
   var users = JSON.parse(userJson);
   this.body = {
     users: users
   };
});

router.get('/users/:userid', function*() {
    var userid = this.params.userid;
    var userJson = yield readFile('users.json');
    var users = JSON.parse(userJson);
    var me = users.filter(function(user) {
       return (user.id == userid);
    })[0];
    if(!me) {
        this.throw(404);
    } else {
        this.body = me;
    }
})

function signUserToken(userid) {
    var expiery = new Date();
    expiery.setDate(expiery.getDate()+3);
    var token = jws.sign({
       header: {alg: 'HS256', typ: 'JWT'},
       payload: {id: userid},
       exp: expiery,
       secret: 'This is a very secret secret, do not tell anyone.'
    });
    return token;
}

router.post('/users/:userid/login', function* () {
    var userid = this.params.userid;
    var token = signUserToken(userid);
    this.body = {
      token: token
    };
});

app.use(passport.initialize());
app.use(cors());
app.use(logger());
app.use(router.routes());

app.listen(8888);
