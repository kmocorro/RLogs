let jwt = require('jsonwebtoken');
let bcrypt = require('bcryptjs');
let config = require('./config');
let moment = require('moment');
let bodyParser = require('body-parser');
let mysqlCloud = require('../dbConfig/dbCloud');

let verifyToken = require('./verifyToken');

module.exports = function(app){
    
    app.use(bodyParser.urlencoded({ extended: true }));

    app.get('/', function(req, res){
        res.redirect('/login');
    });

    app.get('/login', function(res, res){
        res.render('login');
    });

    app.post('/api/auth/login', function(req, res){

        if(req.body.username && req.body.password){
            
            function logInUser(){
                return new Promise(function(resolve, reject){
                    mysqlCloud.connectAuth.getConnection(function(err, connection){
                        
                        if(err){ return res.status(500).send({err: 'Error getting into database.'})};
                        connection.query({
                            sql: 'SELECT * FROM deepmes_auth_login WHERE username=?',
                            values: [req.body.username]
                        },  function(err, results, fields){
                           
                            if(!results){
                                res.send({err: 'No user found.'});
                            } else {

                                try{
                                    let resultPass = results[0].password;
                                    let passwordIsValid = bcrypt.compareSync(req.body.password, resultPass);

                                    if(!passwordIsValid){ return res.send({err: 'Invalid username or password.' })};

                                    let token = jwt.sign({ id: results[0].id }, config.secret, { 
                                        expiresIn: 86400
                                    });

                                    console.log(new Date() + ' - ' + req.body.username + ' has logged in.');
                                    res.cookie('auth', token);
                                    res.status(200).send({ auth: true });
                                
                                } catch(error){
                                    res.send({err: 'Invalid username or password.'});
                                }
                                
                            }

                        });
                        connection.release();
                    });
                });
            }

            logInUser();

        } else {
            res.send({err: 'Invalid credentials.'});
        }

    });
    
    app.post('/register', function(req, res){
        
        if(req.body){

            let hashedBrown = bcrypt.hashSync(req.body.password);

            function registerMe(){
                return new Promise(function(resolve, reject){
                    mysqlCloud.connectAuth.getConnection(function(err, connection){
                        if(err) return res.send({ error: 'registration database connection error'});
                        connection.query({
                            sql: 'INSERT INTO deepmes_auth_login SET registration_date=?, username=?, name=?,  email=?, department=?, password=?',
                            values: [moment(new Date()).format(), req.body.username, req.body.name, req.body.email, req.body.department, hashedBrown]
                        }, function(err, results, fields){
                            if(err) return res.send({ error: err});
                            
                            let token = jwt.sign({ id: results.insertId }, config.secret, {expiresIn: 86400});

                            res.status(200).send({auth: true, token: token});

                        });
                        connection.release();
                    });
                });
            }

            registerMe();

        }
        
    });

    app.get('/me', verifyToken, function(req, res, next){
        function checkUserID(){
            return new Promise(function(resolve, reject){
                mysqlCloud.connectAuth.getConnection(function(err, connection){
                    if(err) return res.send({ error: 'checking user id connection error'});
                    connection.query({
                        sql: 'SELECT * FROM deepmes_auth_login WHERE id =?',
                        values: [req.userID]
                    }, function(err, results, fields){
                        console.log(results);
                        res.status(200).send(results);
                    });
                    connection.release();
                });
            });
        }
       
        checkUserID();

    });


    app.get('/logout', function(req, res){
        res.cookie('auth', null);
        res.redirect('/login');
    });


}