var mysql      = require('mysql');
var db = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'projekt',
});
 
db.connect(function(err){
  if(err){
    console.log('Error connecting to Db: ', err);
    return;
  }
  console.log('Connection established');
});

module.exports = db; 