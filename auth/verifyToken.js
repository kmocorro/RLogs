let jwt = require('jsonwebtoken');
let config = require('./config');

function verifyToken(req, res, next){
    let token = req.cookies.auth;
    if(!token)  return res.render('401');

    jwt.verify(token, config.secret, function(err, decoded){
        if(err) return res.render('401');

        req.userID = decoded.id;
        next();
    });
}

module.exports = verifyToken;   