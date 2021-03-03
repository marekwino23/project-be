var mysql      = require('mysql');
var db = mysql.createConnection({
  host:  'localhost',
  user:   'root',
  password: '',
  database: 'projekt'

  // host: process.env.DB_HOST, 
  // user: process.env.DB_USER, 
  // password: process.env.DB_PASS, 
  // database: process.env.DB_DBNAME 
});
 
db.connect(function(err){
  if(err){
    console.log('Error connecting to Db: ', err);
    return;
  }
  console.log('Connection established');
});

module.exports = db; 