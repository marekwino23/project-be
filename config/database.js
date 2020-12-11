var mysql      = require('mysql');
var db = mysql.createConnection({
  host     : process.env.DB_HOST,
  user     : process.env.DB_USER,
  password : process.env.DB_PASS,
  database : process.env.DB_DBNAME

  // host     : 'localhost',
  // user     : 'root',
  // password : '',
  // database : 'projekt'
});
 
db.connect(function(err){
  if(err){
    console.log('Error connecting to Db: ', err);
    return;
  }
  console.log('Connection established');
});

module.exports = db; 