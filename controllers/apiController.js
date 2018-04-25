let moment = require('moment');
let bodyParser = require('body-parser');
let Promise = require('bluebird');
let mysqlCloud = require('../dbConfig/dbCloud');

module.exports = function(app){

    app.use(bodyParser.json({limit: '50mb'}));
    app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

    app.post('/api/runlogs', function(req, res){
        let post_rlogs = req.body;
        //console.log(post_rlogs);
        
        if(post_rlogs.date_range && post_rlogs.process_name && post_rlogs.comments){
            
            let startDate = moment(post_rlogs.date_range.split('-')[0]).format();
            let endDate = moment(post_rlogs.date_range.split('-')[1]).format();

            mysqlCloud.connectAuth.getConnection(function(err, connection){
                if(err){ return res.send({err: 'database connection error @ api rlogs'})}
    
                function upload(){
                    return new Promise(function(resolve, reject){
                        //console.log(connection);
                        connection.query({
                            sql: 'INSERT INTO tbl_rlogs SET date_range=?, startDate=?, endDate=?, process_name=?, comments=?',
                            values: [post_rlogs.date_range, startDate, endDate, post_rlogs.process_name,  post_rlogs.comments]
                        }, function(err, results, fields){
                            if(err){ return res.send({err: 'database insert error @ api rlogs'})}
                            res.send({success: 'Form has been saved!'});
                        });

                        connection.release();
                        
                    });
                }

                upload();
    
            });
        } else {
            res.send({err: 'Fill up your form.'});
        }
        
        
    });

    app.get('/delete/:id', function(req, res){
        let post_id = req.params;
        
        if(post_id){
            function deleteInput(){
                return new Promise(function(resolve, reject){
                    mysqlCloud.connectAuth.getConnection(function(err, connection){
                        if(err){ return res.send({err: 'error connecting to database in deleteInput'})}
                        connection.query({
                            sql: 'DELETE from tbl_rlogs WHERE id =?',
                            values: [post_id.id]
                        }, function(err, results, fields){
                            if(err){ return res.send({err: 'error while deleting in deleteInput'})}
                            res.redirect('/rlogs');
                        });
                        connection.release();
                    });
                });
            }

            deleteInput();
        } else {
            res.send({err: 'Unable to delete'});
        }
        
    });

    app.get('/', function(req, res){
        
        res.redirect('/rlogs');
    });


    app.get('/rlogs', function(req, res){

        function processList(){
            return new Promise(function(resolve, reject){
                mysqlCloud.connectAuth.getConnection(function(err, connection){
                    if(err){ return res.send({err: 'error connecting to database in processList'})}
                    connection.query({
                        sql: 'SELECT * FROM tbl_process_list'
                    },  function(err, results, fields){
                        if(err){ return res.send({err: 'error selecting the processes in processList '})}
                        let process_list = [];

                        for(let i = 0; i<results.length;i++){
                            process_list.push(results[i].process);
                        }
                        resolve(process_list);
                    });
                    connection.release();
                });
            });
        }

        function rLogsHistory(){
            return new Promise(function(resolve, reject){
                mysqlCloud.connectAuth.getConnection(function(err, connection){
                    if(err){ return res.send({err: 'error connecting to database in rlogshistory'})}
                    connection.query({
                        sql: 'SELECT * FROM tbl_rlogs ORDER BY id DESC'
                    },  function(err, results, fields){
                        if(err){ return res.send({err: 'error selecting the rlogs in rlogshistory'})}
                        let rlogs_list = [];

                        for(let i=0; i<results.length;i++){
                            rlogs_list.push({
                                id: results[i].id,
                                date_range: results[i].date_range,
                                startDate: moment(results[i].startDate).format('lll'),
                                endDate: moment(results[i].endDate).format('lll'),
                                process_name: results[i].process_name,
                                comments: results[i].comments
                            });
                            
                        }
                        resolve(rlogs_list);
                    });
                    connection.release();
                });
            });
        }

        processList().then(function(process_list){
            return rLogsHistory().then(function(rlogs_list){
                
                if(process_list && rlogs_list){
                    res.render('rlogs',{process: process_list, rlogs_list});
                }

            });
        });

    });

}