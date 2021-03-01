var mysql      = require('mysql');
var db = mysql.createConnection({
  host: process.env.DB_HOST, //'localhost',
  user: process.env.DB_USER, // 'root',
  password: process.env.DB_PASS, // '',
  database: process.env.DB_DBNAME // 'projekt'
});
 
db.connect(function(err){
  if(err){
    console.log('Error connecting to Db: ', err);
    return;
  }
  console.log('Connection established');
});

module.exports = db; 