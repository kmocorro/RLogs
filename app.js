let express = require('express');
let app = express();
let apiController = require('./controllers/apiController');
let favicon = require('serve-favicon');
let port = process.env.PORT || 7070;

app.use('/', express.static(__dirname + '/public'));

app.use(favicon(__dirname + '/public/style/favicon.ico'));

app.set('view engine', 'ejs');

apiController(app);
app.listen(port);
