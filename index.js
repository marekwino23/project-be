require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` });
var PORT = process.env.PORT || 4000;

const express = require('express');
const bcrypt = require("bcrypt");
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const db = require('./config/database');
const handlers = require('./handlers');
const app = express();
const router = express.Router();

app.use(cors({
    origin: process.env.ORIGIN,
    methods: ['GET','PUT','POST','DELETE','PATCH'],
    credentials: true
}));


app.use(cookieParser());


app.use(express.json());


app.post('/register', async (req, res) => {
    try {
        const { name, surname, email, password } = req.body;
        await db.query(`SELECT * FROM users where email="${email}" `, async function (error, results, fields) {
        if(error || results.length) return res.status(400).json({ status: 'email already used in registration'});
        const hash = await bcrypt.hash(password, 10);
        // await db('users').insert({email: email, hash: hash});
        await db.query(`INSERT INTO users(name, surname, email, password) VALUES("${name}", "${surname}","${email}", "${hash}")`, function (error, results, fields) {
            console.log('db login :', error, results, fields);
            if(error) return res.status(400).json({ status: `user could not be created due to sql errors: ${error}`});
           res.status(200).json({ status: 'success' });  
        }); 
    });
    } catch(error) {
        res.status(500).json({ error: `something went wrong: ${error.message}`});
    }
});


app.post('/rez', async (req, res) => {
    try {
        const { id, date, time } = req.body;
        await db.query(`Update users SET rezerwacja="${date}", godzina="${time}" where id="${id}"`, function (error, results, fields) {
            console.log('db login :', error, results, fields);
            if(error) return res.status(400).json({ status: `user could not be created due to sql errors: ${error}`});
           res.status(200).json({ status: 'success' });  
        }); 
     } catch(error) {
        res.status(500).json({ error: `something went wrong: ${error.message}`});
    }
});


app.patch('/del', async (req, res) => {
    try {
        const { id, booking, hour } = req.body;
        await db.query(`Update users SET rezerwacja=NULL, godzina=NULL where id="${id}"`, function (error, results, fields) {
            console.log('db login :', error, results, fields);
            if(error) return res.status(400).json({ status: `user could not be created due to sql errors: ${error}`});
           res.status(200).json({ status: 'success' });  
        }); 
     } catch(error) {
        res.status(500).json({ error: `something went wrong: ${error.message}`});
    }
});


app.patch('/erase', async (req, res) => {
    try {
        const { id, booking, hour } = req.body;
        await db.query(`Update users SET godzina=NULL where id="${id}"`, function (error, results, fields) {
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
    db.query(`SELECT rezerwacja,godzina FROM users where id="${id}"`,function (err, result) {
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



app.get('/download/:id', (req, res) => {
    const { id } = req.params;
    db.query(`SELECT name FROM users where id="${id}"`,function (err, result) {
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


app.patch('/update', async (req, res) => {
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





app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        //const user = await db('users').first('*').where({ email });
        console.log('login: ', email, password);
        await db.query(`SELECT * FROM users where email="${email}"`, async function (error, results, fields) {
            console.log('sql: ', error, results[0].password);
        if(error || !results.length) return res.status(401).json({ status: 'user not found'});
        if(results.length) {
            const validPass = await bcrypt.compare(password, results[0].password);
            console.log('validPass: ', validPass, password, results[0].password);
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
            res.cookie('access_token', 'hagsdhagsdhj', {...cookieOptions})
            res.cookie('refresh_token', 'hjagsdjhagsjdh', { ...cookieOptions, expires: new Date(Date.now() + (week * 4)) }); 
            delete results[0].password;
            res.status(200).json({ user: results[0] });
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

let refreshTokens = []

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
    jwt.verify(req.cookies.access_token, process.env.ACCESS_TOKEN_SECRET, (err,user) => { 
        if (err) return res.status(401).json({ error: 'invalid token' });
        return res.status(200).json({ error: '' });
    })
});

app.post('/refresh', (req, res)  => {
    req.json(posts.filter(post => post.req.body === req.user.name))
    const tokens = generateTokens(req.body);
    console.log("success: ", process.env);
    console.log('accessToken: ', accessToken);
    res.setHeader('Set-Cookie', ['HttpOnly']);
    res.json({accessToken, refreshToken })
});

app.get('/', (req, res) => {
    return res.json({ connection:'workis'});
});

function generateTokens(data, options= {}) {
    const access_token = jwt.sign(data, process.env.ACCESS_TOKEN_SECRET, options);
    const refresh_token = jwt.sign(data, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '30d'});
    refreshTokens.push(refresh_token);
    return { access_token, refresh_token };
}

function authenticateToken(req, res, next){
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(' ')[1]
    if(token == null) return res.sendStatus(401)
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err,user) => { 
    if (err) return res.sendStatus(401)
    req.user = user
    next()
})
}






module.exports = app;
