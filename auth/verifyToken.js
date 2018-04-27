let jwt = require('jsonwebtoken');
let config = require('./config');

function verifyToken(req, res, next){
    let token = req.cookies.auth;
    if(!token) return res.status(403).send('No token provided.') ;

    jwt.verify(token, config.secret, function(err, decoded){
        if(err) return res.status(500).send('Failed to authenticate.');

        req.userID = decoded.id;
        next();
    });
}

module.exports = verifyToken;