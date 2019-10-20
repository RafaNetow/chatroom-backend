let express = require('express')
let bodyParser = require('body-parser')
let axios = require('axios');
var cors = require('cors')
let app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.options('*', cors()) // include before other routes 
app.use(cors())

let mongoose = require('mongoose')
var http = require('http').Server(app);
var io = require('socket.io')(http);

io.on('connection', () =>{
  console.log('a user is connected')
 })
const bcrypt = require('bcrypt');
const saltRounds = 10;


var dbUrl =
  'mongodb://rafa:rafa@cluster0-shard-00-00-3yz1m.mongodb.net:27017,cluster0-shard-00-01-3yz1m.mongodb.net:27017,cluster0-shard-00-02-3yz1m.mongodb.net:27017/test?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true&w=majority'
var server = app.listen(4000, () => {
  console.log('server is running on port', server.address().port)
})

mongoose.connect(
  dbUrl,
  err => {
    console.log('mongodb connected', err)
  }
)

let Message = mongoose.model('Message', {
  name: String,
  message: String,
  time: Date
})


let Users = mongoose.model('User', {
   userName:String,
   password:String
})



app.get('/messages', (req, res) => {
  Message.find({}, null, { limit: 50 }, (err, messages) => {

    let chat = []
    
    messages.forEach( function (currentMessge) {
      console.log(currentMessge.message);
      chat.push({
        author: currentMessge.name,
        text:currentMessge.message,
        type:'text'
        
      })
    });
    console.log(chat);
    res.send(chat)
  })
});

app.get('/register', (req, res) => {

  console.log(req.body);
  
  let currentUser = req.body
  
  console.log(currentUser)
  bcrypt.genSalt(saltRounds, function(err, salt) {
    bcrypt.hash(currentUser.password, salt, function(err, hash) {
      currentUser.password = hash;
      
      var user = new Users(currentUser)

  user.save(err => {
    if (err) sendStatus(500)
    res.sendStatus(200)
    });
});
  })
});
 
app.get('/login', ( req, res) => {
   let username = res.username;
   Users.findOne ({username: res.username}, function(err, user) {
    if (!user) return fn(new Error('cannot find user'));
    bcrypt.compare(username, user.password, function(err, found) {
      if (username) {
         res.send({
           status: 200,
           match:true
         })
      } else {
        res.send( {
          status: 200,
          match: false
        })
      }
  });

})


  
});




app.get('/code', async (req, res) => {
  let code = req.body.code
   let response = await axios.get(`https://stooq.com/q/l/?s=${code}&f=sd2t2ohlcv&h&e=csv`)
    .then(response => {
      response = response.data.toString().split('\r\n')
      response = response[1].split(',');
      csvInfo = {
        code:response[1],
        value:response[3]
      }
      let message = {
        name: 'bot',
        message: `${csvInfo.code} quote is $${csvInfo.value} per share.`
      }
      message.time = new Date()

      var newMessage = new Message(message)
    
      newMessage.save(err => {
        if (err) sendStatus(500)
        res.sendStatus(200)
      })
  
      
    })
    .catch(error => {
      console.log(error)
    })
    console.log(response);
   
})

app.post('/messages', (req, res) => {
  var currentTime = new Date() // gives current date and time (note it is UTC datetime)
  console.log(req.body);
  io.emit('message', req.body);
  let currentMessage = req.body
  currentMessage.time = currentTime
  var message = new Message(currentMessage)
  
  message.save(err => {
    if (err) sendStatus(500)
    res.sendStatus(200)
  })
})
