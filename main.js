var koa = require('koa');
var app = koa();
var router = require('koa-router')();
var fs = require('fs');
var thunkify = require('thunkify');
var readFile = thunkify(fs.readFile);
var jws = require('jws');
var logger = require('koa-logger');

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

router.post('/users/:userid/login', function* () {
    var userid = this.params.userid;
    var expiery = new Date();
    expiery.setDate(expiery.getDate()+3);
    var token = jws.sign({
       header: {alg: 'HS256', typ: 'JWT'},
       payload: {id: userid},
       exp: expiery,
       secret: 'This is a very secret secret, do not tell anyone.'
    });
    this.body = {
      token: token
    };
});


app.use(logger()).use(router.routes());
app.listen(8888);
