let moment = require('moment');
let bodyParser = require('body-parser');
let Promise = require('bluebird');
let mysqlCloud = require('../dbConfig/dbCloud');

module.exports = function(app){

    app.use(bodyParser.json({limit: '50mb'}));
    app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

    app.post('/api/runlogs', function(req, res){
        let post_rlogs = req.body;
      //  console.log(post_rlogs);
        
        if(post_rlogs.date_range && post_rlogs.process_name && post_rlogs.comments){
            
            let processArr = [];

            if((post_rlogs.process_name).constructor === Array){
                for(let i=0; i<post_rlogs.process_name.length; i++){
                    processArr.push({
                        process: post_rlogs.process_name[i]
                    });
                }
            } else {
                processArr = {
                    process: post_rlogs.process_name
                };
            }
            
            //console.log(processArr);
            
            let startDate = moment( new Date(post_rlogs.date_range.split('-')[0])).format();
            let endDate = moment( new Date(post_rlogs.date_range.split('-')[1])).format();

            let ms = moment(endDate).diff(moment(startDate));
            let d = moment.duration(ms);
            let s = Math.floor(d.asHours()) + moment.utc(ms).format(":mm:ss");
            let durationVarchar = (s).toString();
     
            mysqlCloud.connectAuth.getConnection(function(err, connection){
                if(err){ return res.send({err: 'database connection error @ api rlogs'})}
    
                function upload(){
                    return new Promise(function(resolve, reject){
                        //console.log(connection);
                        connection.query({
                            sql: 'INSERT INTO tbl_rlogs SET startDate=?, endDate=?, process_name=?, comments=?, duration=?',
                            values: [startDate, endDate, JSON.stringify(processArr),  post_rlogs.comments, durationVarchar]
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

    app.post('/api/update', function(req, res){
        let post_update = req.body; 

      //  console.log(post_update);
        
        
        if(post_update.date_range_update && post_update.process_name_update && post_update.comments_update && post_update.activity_id ){

            let processArr = [];

            if((post_update.process_name_update).constructor === Array){
                for(let i=0; i<post_update.process_name_update.length; i++){
                    processArr.push({
                        process: post_update.process_name_update[i]
                    });
                }
            } else {
                processArr = {
                    process: post_update.process_name_update
                };
            }

            let startDate = moment( new Date(post_update.date_range_update.split('-')[0])).format();
            let endDate = moment( new Date(post_update.date_range_update.split('-')[1])).format();

            let ms = moment(endDate).diff(moment(startDate));
            let d = moment.duration(ms);
            let s = Math.floor(d.asHours()) + moment.utc(ms).format(":mm:ss");
            let durationVarchar = (s).toString();

            //console.log(startDate, endDate,  JSON.stringify(processArr) ,  post_update.comments_update, post_update.activity_id );

            mysqlCloud.connectAuth.getConnection(function(err, connection){
                if(err){ return res.send({err: 'database connection error @ api post_update'})}

                function updateData(){
                    return new Promise(function(resolve, reject){

                        connection.query({
                            sql: 'UPDATE tbl_rlogs SET startDate=?, endDate=?, process_name=?, comments=?, duration=? WHERE id = ?',
                            values: [startDate, endDate, JSON.stringify(processArr),  post_update.comments_update, durationVarchar, post_update.activity_id]
                        }, function(err, results, fields){
                            
                            if(err){ return res.send({err: 'Update error'})}
                            res.send({success: 'Updated successfully.'});
                        });
                        connection.release();
                    });
                }

                updateData();
            });
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
                            res.redirect('/activities');
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
        
        res.redirect('/activities');
    });


    app.get('/activities', function(req, res){

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
                                startDate: moment(results[i].startDate).format('lll'),
                                endDate: moment(results[i].endDate).format('lll'),
                                process_name: JSON.parse(results[i].process_name),
                                comments: results[i].comments,
                                duration: results[i].duration
                            });
                            
                        }
                        //console.log(JSON.parse(rlogs_list[0].process_name));

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