require('dotenv').config({ path: `.env` });
var PORT = process.env.PORT || 4000;

const express = require('express');
const bcrypt = require("bcrypt");
const md5 = require('md5') 
const cors = require('cors');
const socketio = require('socket.io')
const ejs = require('ejs')
const Nexmo = require('nexmo')
const generator = require('generate-password');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const db = require('./config/database');
const handlers = require('./handlers');
const app = express();
const router = express.Router();

const corsOptions = {
    origin: (origin, callback) => {
        console.log(process.env.NODE_ENV)
        if(process.env.ORIGIN === origin) {
            callback(null,true)
        } else {
            console.error("error",process.env.ORIGIN, process.env.NODE_ENV, `.env.${process.env.NODE_ENV}`);
            callback(new Error('Origin not allowed by cors'))
        }
    },
    methods: ['GET','POST','DELETE','PATCH','OPTIONS'],
    credentials: true,
};


app.use(cors(corsOptions));

app.use(cookieParser());

app.use(express.json());

app.get('/', (req,res) => {
    res.send('hello')
})

app.post('/register', async (req, res) => {
    try {
        console.log("hello");
        const { name, surname, email, password } = req.body;
        const special = generator.generate({
            length: 6,
            numbers: true
        });
        await db.query(`SELECT * FROM users where email="${email}" `, async function (error, results, fields) {
        if(error || results.length) return res.status(400).json({ status: 'email already used in registration'});
        const hash = await bcrypt.hash(password, 10);
        // await db('users').insert({email: email, hash: hash});
        await db.query(`INSERT INTO users(name, surname, email, password, special) VALUES("${name}", "${surname}","${email}", "${hash}", "${special}")`, function (error, results, fields) {
            console.log('db login :', error, results, fields);
            if(error) return res.status(400).json({ status: `user could not be created due to sql errors: ${error}`});
           res.status(200).json({ status: 'success' });  
        }); 
    });


    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
        user:  "marekw1996@gmail.com",
        pass:  "Mareczek24"
        }
    });

  var mailOptions = {
    from: "https://sheltered-oasis-25992.herokuapp.com/register",
    to: req.body.email,
    subject: 'Potwierdzenie rejestracji: barber-app, wysłany kod jest w razie zapomnienia hasła, https://sheltered-oasis-25992.herokuapp.com/valid',
  };

  transporter.sendMail(mailOptions, function(error, info){ 
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });

    } catch(error) {
        console.error("hello error");
        res.status(500).json({ error: `something went wrong: ${error.message}`});
    }
});

app.post('/valid', async (req, res) => {
        const { email,password } = req.body;
        console.log(password)
        const hash = await bcrypt.hash(password, 10);
        await db.query(`SELECT special FROM users where email="${email}"`, async function (error, result, fields) {
        console.log(result)
        if(result[0].special === req.body.code){
            await db.query(`Update users SET password="${hash}" where email="${email}"`, function (error, results, fields) {
                console.log("success")
                res.status(200).json({status:"success"})
                 })
        }
        else {
            console.log("failed")
            res.status(400).json({status:"failed"})
        }
    })

});

app.post('/rez', async (req, res) => {
    try {
        const { id, data, time } = req.body;
        if(time === ""){
            res.status(400).json({info: "incorrect hour because you can t choose past time" })
            console.log("failed")
        }
        else{
        await db.query(`Update users SET rezerwacja="${data}", godzina="${time}" where id="${id}"`, function (error, results, fields) {
            console.log('db login :', error, results, fields);
            if(error) return res.status(400).json({ status: `booking failed due to sql errors: ${error}`});
           res.status(200).json({ status: 'success' });  
        })}; 
     }
     catch(error) {
        res.status(500).json({ error: `something went wrong: ${error.message}`});
    }
});



app.get("/getuserData", function(req,res){
    db.query(`SELECT * FROM users`,function (err, result) {
        if(err) {
            console.log(err); 
            res.json({"error":true});
        }
        else { 
            console.log(result); 
            res.json(result); 
        }
    });
});


app.patch("/editUser",function(req,res){
  const{id,name,surname,email,password} = req.body
  const hash = bcrypt.hash(password, 10);
  console.log(id,name)
  db.query(`Update users set name="${name}", surname="${surname}", email = "${email}", password = "${hash}" where id=${id}`, function(err, result,fields){
      if(err){
          console.error("error")
      }
      else{
          res.send({status: "success"})
      }
  })
})

app.put('/erase', async (req, res) => {
    try {
        const { id } = req.body;
        await db.query(`Update users SET rezerwacja=NULL, godzina=NULL where id="${id}"`, function (error, results, fields) {
            console.log('db login :', error, results, fields);
            if(error) return res.status(400).json({ status: `user could not be created due to sql errors: ${error}`});
           res.status(200).json({ status: 'success' });  
        }); 
     } catch(error) {
        res.status(500).json({ error: `something went wrong: ${error.message}`});
    }
});


app.put('/changed', async (req, res) => {
    try {
        const { id, time } = req.body;
        await db.query(`Update users SET godzina="${time}" where id="${id}"`, function (error, results, fields) {
            console.log('db login :', error, results, fields);
            if(error) return res.status(400).json({ status: `user could not be created due to sql errors: ${error}`});
           res.status(200).json({ status: 'success' });  
        }); 
     } catch(error) {
        res.status(500).json({ error: `something went wrong: ${error.message}`});
    }
});


app.get('/info/:id', (req, res) => {
    const { id } = req.params;
    db.query(`SELECT rezerwacja, godzina FROM users where id="${id}"`,function (err, result) {
        if(err) {
            console.log(err); 
            res.json({"error":true});
        }
        else { 
            console.log(result); 
            const data = result.map(record => {
                if(record.godzina == null) {
                    record.godzina = "brak godziny";
                    return record;
                }
                return record;
            })
            res.json(data); 
        }
    });
});

app.post('/busy', (req, res) => {
    const time = req.body.time
    const { id } = req.params;
    db.query(`SELECT * FROM users where godzina="${time}"`,function (err, result) {
        if(result.length) {
            console.log(err); 
            res.json({status: "This time is used"});
        }
        else { 
            console.log("good"); 
            res.json({status: "This time is free"}); 
        }
    });
});


app.post('/checkEmail', (req, res) => {
    const email  = req.body;
    console.log(email)
    const { id } = req.params;
    db.query(`SELECT * FROM users WHERE email="${email}"`, function (err, result, fields) {
        if(result.length) {
            console.log(err); 
            res.json({status: 'Email already registered', hasEmail: true });
        }
        else if(result.length === 0){
            console.log("free"); 
            res.json({ status: 'Email is available', hasEmail: false }); 
        }
        else { 
            console.log("done"); 
            res.json({ status: 'Email is available', hasEmail: false }); 
        }
    });
});


app.get('/list', (req, res) => {
    const { id } = req.params;
    db.query(`SELECT * FROM users`,function (err, result) {
        if(err) {
            console.log(err); 
            res.json({"error":true});
        }
        else { 
            console.log(result); 
            res.json(result); 
        }
    });
});


app.post('/deleteUser', (req,res) =>{
const {id} = req.body
console.log(`Delete from users where id=${id}`)
db.query(`Delete from users where id=${id}`, function(err,result,fields){
    if(err){
        console.error("error")
        res.status(401).json({status: "failed"})
    }
    else{
        console.log("done")
        res.status(200).json({status: "success"})
    }
})
})


app.get('/assemble/:id', (req, res) => {
    const { id } = req.params;
    db.query(`SELECT email FROM users where id="${id}"`,function (err, result) {
        if(err) {
            console.log(err); 
            res.json({"error":true});
        }
        else { 
            console.log(result); 
            res.json(result); 
        }
    });
});


// app.get('/download/:id', (req, res) => {
//     const { id } = req.params;
//     db.query(`SELECT password FROM users where id="${id}"`,function (err, result) {
//         if(err) {
//             console.log(err); 
//             res.json({"error":true});
//         }
//         else { 
//             console.log(result); 
//             res.json(result); 
//         }
//     });
// });


app.put('/update', async (req, res) => {
    try {
        const {id, email} = req.body;
        console.log(`Update users SET email="${email}" where id="${id}"`);
        await db.query(`Update users SET email="${email}" where id="${id}"`, async function (error, results, fields) {
            console.log( results.length);
            if(error || !results.changedRows) return res.status(401).json({ status: 'user not found'});
            return res.status(200).json({ status: 'user update'});
        });
    } catch(error) {
        res.status(500).json({ error: `something went wrong: ${error.message}`});
    }
});



app.put('/improve', async (req, res) => {
    try {
        const {id, password} = req.body;
        const hash = await bcrypt.hash(password, 10);
        console.log(`Update users SET password="${hash}" where id="${id}"`);
        await db.query(`Update users SET password="${hash}" where id="${id}"`, async function (error, results, fields) {
            console.log( results.length);
            if(error || !results.changedRows) return res.status(401).json({ status: 'user not found'});
            return res.status(200).json({ status: 'user update'});
        });
    } catch(error) {
        res.status(500).json({ error: `something went wrong: ${error.message}`});
    }
});


app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('login: ', email, password);
        await db.query(`SELECT * FROM users where email="${email}"`, async function (error, results, fields) {
            console.log('sql: ', error, results[0].password);
        if(error || !results.length) return res.status(401).json({ status: 'user not found'});
        if(results.length) {
            const validPass = await bcrypt.compare(password, results[0].password);
            const hash = await bcrypt.hash(password,10);
            console.log('validPass: ', validPass, hash, results[0].password);
            if(validPass) {
                const signOptions = {
                    expiresIn: '1d',
                };
            const { access_token, refresh_token } = generateTokens(req.body, signOptions);
            const week = 7 * 24 * 3600 * 1000; //1 weeks  
            const cookieOptions = {
                httpOnly: true,
                secure: true,
                expires: new Date(Date.now() + week),
                sameSite: 'None'
            };
            console.log('tokens: ', access_token );
            res.cookie('access_token', access_token, {...cookieOptions})
            res.cookie('refresh_token', refresh_token, { ...cookieOptions, expires: new Date(Date.now() + (week * 4)) }); 
            delete results[0].password;
            res.status(200).json({ user: results[0], type: results[0].type });
            } else {
                console.log('fail: ', res, email);
                res.send(400).json({ status: 'fail' });
            }
        }
    });
    } catch(error) {
        res.status(500).json({ error: `something went wrong: ${error.message}`});
    }
});

app.get('/logout', async (req, res)=> {
    try {
        res.clearCookie('access_token');
        res.clearCookie('refresh_token');
        res.status(200).json({ status: 'ok'});
    } catch(error) {
        res.status(500).json({ error: 'could not logout'})
    }

});

let refreshTokens = [];

app.listen(process.env.PORT || 4000, () => {
    console.log('listen on port 4000');
})

// app.post('/token', (req, res) => {
//     const refresh_token = req.body.token
//     if (refresh_token == null) return res.status(401)
//     if (!refreshTokens.includes(refresh_token)) return res.status(403) 
//     jwt.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
//         if (err) return res.status(403)
//         const tokens = generateTokens(req.body);
//         res.json({...tokens});
//     });
// });

// app.use(function(req, res, next) {
//     res.header("Access-Control-Allow-Origin", "http://localhost:3000");
//     res.header("Access-Control-Allow-Methods", 'GET,PUT,POST,DELETE');
//     res.header("Access-Control-Allow-Headers", 'Content-Type');
//     next();
// });

app.post('/verify', (req, res)  =>{
    console.log('req headers: ', req.cookies);
    jwt.verify(req.cookies.access_token, process.env.ACCESS_TOKEN_SECRET, (err, user) => { 
        if (err) return res.status(401).json({ error: 'invalid token' });
        return res.status(200).json({ error: '' });
    })
});

app.post('/refresh', (req, res)  => {
    req.json(posts.filter(post => post.req.body === req.user.name))
    const { access_token, refresh_token } = generateTokens(req.body);
    console.log("success: ", process.env);
    res.setHeader('Set-Cookie', ['HttpOnly']);
    res.json({access_token, refresh_token })
});

function generateTokens(data, options= {}) {
    const access_token = jwt.sign(data, process.env.ACCESS_TOKEN_SECRET, options);
    const refresh_token = jwt.sign(data, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '30d'});
    refreshTokens.push(refresh_token);
    return { access_token, refresh_token };
}


module.exports = app;
