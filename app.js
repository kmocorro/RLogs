let express = require('express');
let app = express();
let cookieParser = require('cookie-parser');

let apiController = require('./controllers/apiController');
let authController = require('./auth/authController');
let favicon = require('serve-favicon');
let port = process.env.PORT || 7070;


app.use(cookieParser());
app.use('/', express.static(__dirname + '/public'));

app.use(favicon(__dirname + '/public/style/favicon.ico'));

app.set('view engine', 'ejs');

authController(app);
apiController(app);

app.listen(port);
