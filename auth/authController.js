let jwt = require('jsonwebtoken');
let bcrypt = require('bcryptjs');
let config = require('./config');
let moment = require('moment');
let bodyParser = require('body-parser');
let mysqlCloud = require('../dbConfig/dbCloud');

let verifyToken = require('./verifyToken');

module.exports = function(app){
    
    let numOfAttempts = 3;

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

                                    if(!passwordIsValid){ 
                                        let resolvedAuth = false;
                                        
                                        numOfAttempts = numOfAttempts - 1;
                                        
                                        if(numOfAttempts > 0){

                                            return res.send({err: 'Invalid username or password. ' + numOfAttempts + ' attempts remaining.'});
                                            
                                            resolve(resolvedAuth);

                                            
                                        } else if(numOfAttempts < 0){

                                            return res.send({err: 'The account has been locked.'});

                                        }


                                    } else {

                                        let token = jwt.sign({ id: results[0].id }, config.secret, { 
                                            expiresIn: 86400
                                        });

                                        let resolvedAuth = true;

                                        res.cookie('auth', token);
                                        res.status(200).send({ auth: true });

                                        
                                        resolve(resolvedAuth);


                                    }
                                
                                } catch(error){
                                    res.send({err: 'Invalid username or password.'});
                                    
                                    let resolvedAuth = false;
                                    resolve(resolvedAuth);
                                }
                                
                            }

                        });
                        connection.release();
                    });
                });
            }

            logInUser().then(function(resolvedAuth){
                
                function user_logs(){
                    return new Promise(function(resolve, reject){
                        mysqlCloud.connectAuth.getConnection(function(err, connection){

                            if(err){ return res.status(500).send({err: 'Error getting into database.'})};

                            if(resolvedAuth == true){

                                connection.query({
                                    sql: 'INSERT INTO deepmes_user_logs SET user_log_date=?, user_move=?, username=?, user_log_status=?, user_ip=?' ,
                                    values:[new Date(), 'login', req.body.username, 'SUCCESS', req.ip]
                                },  function(err, results, fields){
                                    
                                    console.log(new Date() + ' - ' + req.body.username + ' has successfully logged in.');
                                });
                                
                            } else if(resolvedAuth == false){
                                
                                connection.query({
                                    sql: 'INSERT INTO deepmes_user_logs SET user_log_date=?, user_move=?, username=?, user_log_status=?, user_ip=?',
                                    values:[new Date(), 'login', req.body.username, 'FAILED', req.ip]
                                },  function(err, results, fields){
                                    console.log(new Date() + ' - ' + req.body.username + ' login failed. ');
                                });
                            }
                        connection.release();        
                        });
                        

                    });
                }

                return user_logs();

            });

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