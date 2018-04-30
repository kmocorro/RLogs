let express = require('express');
let app = express();

let authController = require('./auth/authController');
let apiController = require('./controllers/apiController');


let favicon = require('serve-favicon');
let port = process.env.PORT || 7070;

app.use('/', express.static(__dirname + '/public'));

app.set('view engine', 'ejs');

app.use(favicon(__dirname + '/public/style/favicon.ico'));


authController(app);
apiController(app);


app.listen(port);
