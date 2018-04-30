let bodyParser = require('body-parser');
let moment = require('moment');
let jwt = require('jsonwebtoken');
let bcrypt = require('bcryptjs');
let Promise = require('bluebird');
let mysqlCloud = require('../dbConfig/dbCloud');
let verifyToken = require('../auth/verifyToken');

module.exports = function(app){
    //  use bodyParser to parse out json with limit of 50mb
    app.use(bodyParser.json({limit: '50mb'}));
    //  make sure it can handle url request
    app.use(bodyParser.urlencoded({limit: '50mb', extended: true }));

    /**
     * Activity API uploader
     */
    app.post('/api/runlogs', verifyToken, function(req, res){
        let post_rlogs = req.body;
      //  console.log(post_rlogs);
        
        if(post_rlogs.date_range && post_rlogs.process_name && post_rlogs.comments && req.userID){
            
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

                function checkName(){
                    return new Promise(function(resolve, reject){
                        mysqlCloud.connectAuth.getConnection(function(err, connection){
                            if(err){ return res.send({err: 'error connecting to database in checking user details'})}
                            connection.query({
                                sql: 'SELECT * FROM deepmes_auth_login WHERE id=?',
                                values: [req.userID]
                            },  function(err, results, fields){
                                let user_details = [];
                                if(results){
                                   try{
                                        user_details.push({
                                            id: results[0].id,
                                            name: results[0].name,
                                            username: results[0].username,
                                            email: results[0].email,
                                            department: results[0].department
                                        });
    
                                        resolve(user_details);
                                   } catch (error){
                                        user_details.push({
                                            id: 'undefined',
                                            name: 'undefined',
                                            username: results[0].username,
                                            email: 'undefined',
                                            department: 'undefined'
                                        });
    
                                        resolve(user_details);
                                   }
                                }
                            });
                            connection.release();
                        });
    
                    });
                }

                

                checkName().then(function(user_details){

                    function upload(){
                        return new Promise(function(resolve, reject){
                            //console.log(connection);
                            connection.query({
                                sql: 'INSERT INTO tbl_rlogs SET startDate=?, endDate=?, process_name=?, comments=?, id_user=?, name=?, duration=?',
                                values: [startDate, endDate, JSON.stringify(processArr),  post_rlogs.comments, user_details[0].id, user_details[0].name, durationVarchar]
                            }, function(err, results, fields){
                                if(err){ return res.send({err: 'database insert error @ api rlogs'})}
                                res.send({success: 'Form has been saved!'});
                            });
    
                            connection.release();
                            
                        });
                    }

                    return upload();
                });
    
            });
        } else {
            res.send({err: 'Fill up your form.'});
        }
        
        
    });

    /**
     * Activity API update
     */
    app.post('/api/update', verifyToken, function(req, res){
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

    /**
     * Activity API delete
     */
    app.get('/delete/:id', verifyToken, function(req, res){
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
    
    /**
     * REST API Activity
     */
    app.get('/activities', verifyToken, function(req, res){

        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');

        
        if(req.userID){
            function checkName(){
                return new Promise(function(resolve, reject){
                    mysqlCloud.connectAuth.getConnection(function(err, connection){
                        if(err){ return res.send({err: 'error connecting to database in checking user details'})}
                        connection.query({
                            sql: 'SELECT * FROM deepmes_auth_login WHERE id=?',
                            values: [req.userID]
                        },  function(err, results, fields){
                            let user_details = [];
                            if(results){
                               try{
                                    user_details.push({
                                        id: results[0].id,
                                        name: results[0].name,
                                        email: results[0].email,
                                        department: results[0].department
                                    });

                                    resolve(user_details);
                               } catch (error){
                                    user_details.push({
                                        id: 'undefined',
                                        name: 'undefined',
                                        email: 'undefined',
                                        department: 'undefined'
                                    });

                                    resolve(user_details);
                               }
                            }
                        });
                        connection.release();
                    });

                });
            }

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

            checkName().then(function(user_details){
                return processList().then(function(process_list){
                    
                    function rLogsHistory(){
                        return new Promise(function(resolve, reject){
                            mysqlCloud.connectAuth.getConnection(function(err, connection){
                                if(err){ return res.send({err: 'error connecting to database in rlogshistory'})}
                                connection.query({
                                    sql: 'SELECT * FROM tbl_rlogs WHERE id_user= ? ORDER BY id DESC ',
                                    values:[user_details[0].id]
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
                                            name: results[i].name,
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

                    return rLogsHistory().then(function(rlogs_list){
                        
                        if(process_list && rlogs_list){
                          
                            res.render('activities',{user_details, process: process_list, rlogs_list});
                        }
        
                    });
                });
    
            });
            

        }


    });

    /**
     * REST API Overallactivity
     */
    app.get('/overallactivity', verifyToken, function(req, res){

        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');

        
        if(req.userID){
            function checkName(){
                return new Promise(function(resolve, reject){
                    mysqlCloud.connectAuth.getConnection(function(err, connection){
                        if(err){ return res.send({err: 'error connecting to database in checking user details'})}
                        connection.query({
                            sql: 'SELECT * FROM deepmes_auth_login WHERE id=?',
                            values: [req.userID]
                        },  function(err, results, fields){
                            let user_details = [];
                            if(results){
                               try{
                                    user_details.push({
                                        id: results[0].id,
                                        username: results[0].username,
                                        name: results[0].name,
                                        email: results[0].email,
                                        department: results[0].department
                                    });

                                    resolve(user_details);
                               } catch (error){
                                    user_details.push({
                                        id: 'undefined',
                                        username: 'undefined',
                                        name: 'undefined',
                                        email: 'undefined',
                                        department: 'undefined'
                                    });

                                    resolve(user_details);
                               }
                            }
                        });
                        connection.release();
                    });

                });
            }

            checkName().then(function(user_details){
                
                function rLogsHistory(){
                    return new Promise(function(resolve, reject){
                        mysqlCloud.connectAuth.getConnection(function(err, connection){
                            if(err){ return res.send({err: 'error connecting to database in rlogshistory'})}
                            connection.query({
                                sql: 'SELECT * FROM tbl_rlogs ORDER BY id DESC '
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
                                        name: results[i].name,
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

                return rLogsHistory().then(function(rlogs_list){
                    
                    if(rlogs_list){
                      
                        res.render('overallactivity',{user_details, rlogs_list});
                    }
    
                });
                    
            
    
            });
            

        }

    });

    /**
     * CoA API uploader
     */
    app.post('/api/coa/upload', verifyToken, function(req, res){
        //console.log(req.body.header);
        let post_xlf = req.body;  //  parse json from client 
        let xlf_proposed_obj = [];   //  cleaned obj going to db
        let xlf_barcode_obj = [];   //  "   "   "   "

        
        if(!post_xlf || !post_xlf.xlf){  //  post_xlf must have xl data
            res.send(JSON.stringify('Upload the required CofA file'));
        } else {

            function checkName(){
                return new Promise(function(resolve, reject){
                    mysqlCloud.connectAuth.getConnection(function(err, connection){
                        if(err){ return res.send({err: 'error connecting to database in checking user details'})}
                        connection.query({
                            sql: 'SELECT * FROM deepmes_auth_login WHERE id=?',
                            values: [req.userID]
                        },  function(err, results, fields){
                            let user_details = [];
                            if(results){
                               try{
                                    user_details.push({
                                        id: results[0].id,
                                        name: results[0].name,
                                        username: results[0].username,
                                        email: results[0].email,
                                        department: results[0].department
                                    });

                                    resolve(user_details);
                               } catch (error){
                                    user_details.push({
                                        id: 'undefined',
                                        name: 'undefined',
                                        username: results[0].username,
                                        email: 'undefined',
                                        department: 'undefined'
                                    });

                                    resolve(user_details);
                               }
                            }
                        });
                        connection.release();
                    });

                });
            }

            function form_details(){ // promise function for header
                return new Promise(function(resolve, reject){

                    //  make sure no null here
                    if(typeof post_xlf.header[0]['value'] !== 'undefined' && post_xlf.header[0]['value'] !== null || typeof post_xlf.header[1]['value'] !== 'undefined' && post_xlf.header[1]['value'] !== null || typeof post_xlf.header[2]['value'] !== 'undefined' && post_xlf.header[2]['value'] !== null) {

                        let form_details_obj = [];
                        let dDate = post_xlf.header[1]['value'];

                        //  [0] - order no
                        //  [1] - delivery date
                        //  [2] - supplier id
                        form_details_obj.push({
                            supplier_id: post_xlf.header[2]['value'],
                            delivery_date:  moment(new Date(dDate)).format('YYYY-MM-DD H:mm:ss'),
                            order_no:   post_xlf.header[0]['value']
                        });

                        //  check existing order no
                        mysqlCloud.connectAuth.getConnection(function(err, connection){
                            connection.query({
                                sql: 'SELECT * FROM tbl_proposed_cofa WHERE order_no=?',
                                values:[form_details_obj[0].order_no]
                            },  function(err, results, fields){

                                //  if not undefined resolve the form details obj
                                if(typeof results[0] !== 'undefined' && results[0] !== null){
                                                                        
                                    res.send(JSON.stringify('Invoice already exist'));

                                } else {

                                    //  resolve
                                    resolve(form_details_obj);
                                    //console.log(form_details_obj);
                                }

                            });
                        connection.release();
                        });
                    } else {    // if there's null in the form.. who knows,
                        res.send(JSON.stringify('Cannot find the form details.<br> Please Fill up the form.'));
                    }
                });
            }

            function proposed_cofa(){ // promise function for proposed cofa sheet
                return new Promise(function(resolve, reject){
                    
                    //  check if the file has proposed cofa sheet
                    if(typeof post_xlf.xlf['PROPOSED CofA'] !== 'undefined' && post_xlf.xlf['PROPOSED CofA'] !== null && post_xlf.xlf['PROPOSED CofA'].length > 0){
    
                        /*  CLEANING LOOP */
                        for(let i=3;i<post_xlf.xlf['PROPOSED CofA'].length;i++){ // loop through the obj
                            if(typeof post_xlf.xlf['PROPOSED CofA'][i][0] !== 'undefined' && post_xlf.xlf['PROPOSED CofA'][i][0] !== null && post_xlf.xlf['PROPOSED CofA'][i][0] !== ''){
                                current_not_null_obj = [];  // hehe. SORRY for being global. I had to
                                current_not_null_obj.push({ // current obj
                                    ingot_lot_id: post_xlf.xlf['PROPOSED CofA'][i][0],
                                    box_id: post_xlf.xlf['PROPOSED CofA'][i][1],
                                    location_id:  post_xlf.xlf['PROPOSED CofA'][i][2],
                                    wafer_pcs:   parseInt(post_xlf.xlf['PROPOSED CofA'][i][3]),
                                    block_length:  parseFloat(post_xlf.xlf['PROPOSED CofA'][i][4]),
                                    totalCystal_length:  parseFloat(post_xlf.xlf['PROPOSED CofA'][i][5]),
                                    seedBlock: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][6]),
                                    MCLT_top: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][7]),
                                    MCLT_tail:   parseFloat(post_xlf.xlf['PROPOSED CofA'][i][8]),
                                    RES_top:  parseFloat(post_xlf.xlf['PROPOSED CofA'][i][9]),
                                    RES_tail:   parseFloat(post_xlf.xlf['PROPOSED CofA'][i][10]),
                                    Oi_top:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][11]),
                                    Oi_tail:   parseFloat(post_xlf.xlf['PROPOSED CofA'][i][12]),
                                    Cs_top:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][13]),
                                    Cs_tail:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][14]),
                                    Dia_ave: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][15]),
                                    Dia_std:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][16]),
                                    Dia_min: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][17]),
                                    Dia_max: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][18]),
                                    Flat_ave:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][19]),
                                    Flat_std: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][20]),
                                    Flat_min:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][21]),
                                    Flat_max:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][22]),
                                    Flat_taper1:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][23]),
                                    Flat_taper2:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][24]),
                                    Flat_taper_min:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][25]),
                                    Flat_taper_max:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][26]),
                                    Corner_ave: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][27]),
                                    Corner_std: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][28]),
                                    Corner_min: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][29]),
                                    Corner_max: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][30]),
                                    Center_ave: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][31]),
                                    Center_std: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][32]),
                                    Center_min: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][33]),
                                    Center_max: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][34]),
                                    TTV_ave: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][35]),
                                    TTV_std: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][36]),
                                    TTV_min: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][37]),
                                    TTV_max: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][38]),
                                    RA_ave:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][39]),
                                    RA_std:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][40]),
                                    RA_min:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][41]),
                                    RA_max:  parseFloat(post_xlf.xlf['PROPOSED CofA'][i][42]),
                                    RZ_ave:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][43]),
                                    RZ_std:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][44]),
                                    RZ_min:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][45]),
                                    RZ_max:  parseFloat(post_xlf.xlf['PROPOSED CofA'][i][46]),
                                    Ver_ave:  parseFloat(post_xlf.xlf['PROPOSED CofA'][i][47]),
                                    Ver_std:  parseFloat(post_xlf.xlf['PROPOSED CofA'][i][48]),
                                    Ver_min:  parseFloat(post_xlf.xlf['PROPOSED CofA'][i][49]),
                                    Ver_max:  parseFloat(post_xlf.xlf['PROPOSED CofA'][i][50]),
                                    Copper_content:  post_xlf.xlf['PROPOSED CofA'][i][51],
                                    Iron_content:   post_xlf.xlf['PROPOSED CofA'][i][52],
                                    AcceptReject:   post_xlf.xlf['PROPOSED CofA'][i][53]
                                });                 
                                xlf_proposed_obj.push({ //  cleaning obj
                                    ingot_lot_id: post_xlf.xlf['PROPOSED CofA'][i][0],
                                    box_id: post_xlf.xlf['PROPOSED CofA'][i][1],
                                    location_id:  post_xlf.xlf['PROPOSED CofA'][i][2],
                                    wafer_pcs:   post_xlf.xlf['PROPOSED CofA'][i][3],
                                    block_length:  parseFloat(post_xlf.xlf['PROPOSED CofA'][i][4]),
                                    totalCystal_length:  parseFloat(post_xlf.xlf['PROPOSED CofA'][i][5]),
                                    seedBlock: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][6]),
                                    MCLT_top: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][7]),
                                    MCLT_tail:   parseFloat(post_xlf.xlf['PROPOSED CofA'][i][8]),
                                    RES_top:  parseFloat(post_xlf.xlf['PROPOSED CofA'][i][9]),
                                    RES_tail:   parseFloat(post_xlf.xlf['PROPOSED CofA'][i][10]),
                                    Oi_top:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][11]),
                                    Oi_tail:   parseFloat(post_xlf.xlf['PROPOSED CofA'][i][12]),
                                    Cs_top:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][13]),
                                    Cs_tail:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][14]),
                                    Dia_ave: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][15]),
                                    Dia_std:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][16]),
                                    Dia_min: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][17]),
                                    Dia_max: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][18]),
                                    Flat_ave:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][19]),
                                    Flat_std: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][20]),
                                    Flat_min:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][21]),
                                    Flat_max:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][22]),
                                    Flat_taper1:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][23]),
                                    Flat_taper2:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][24]),
                                    Flat_taper_min:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][25]),
                                    Flat_taper_max:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][26]),
                                    Corner_ave: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][27]),
                                    Corner_std: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][28]),
                                    Corner_min: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][29]),
                                    Corner_max: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][30]),
                                    Center_ave: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][31]),
                                    Center_std: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][32]),
                                    Center_min: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][33]),
                                    Center_max: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][34]),
                                    TTV_ave: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][35]),
                                    TTV_std: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][36]),
                                    TTV_min: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][37]),
                                    TTV_max: parseFloat(post_xlf.xlf['PROPOSED CofA'][i][38]),
                                    RA_ave:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][39]),
                                    RA_std:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][40]),
                                    RA_min:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][41]),
                                    RA_max:  parseFloat(post_xlf.xlf['PROPOSED CofA'][i][42]),
                                    RZ_ave:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][43]),
                                    RZ_std:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][44]),
                                    RZ_min:    parseFloat(post_xlf.xlf['PROPOSED CofA'][i][45]),
                                    RZ_max:  parseFloat(post_xlf.xlf['PROPOSED CofA'][i][46]),
                                    Ver_ave:  parseFloat(post_xlf.xlf['PROPOSED CofA'][i][47]),
                                    Ver_std:  parseFloat(post_xlf.xlf['PROPOSED CofA'][i][48]),
                                    Ver_min:  parseFloat(post_xlf.xlf['PROPOSED CofA'][i][49]),
                                    Ver_max:  parseFloat(post_xlf.xlf['PROPOSED CofA'][i][50]),
                                    Copper_content:  post_xlf.xlf['PROPOSED CofA'][i][51],
                                    Iron_content:   post_xlf.xlf['PROPOSED CofA'][i][52],
                                    AcceptReject:   post_xlf.xlf['PROPOSED CofA'][i][53]
                                });
                            } else {
                                xlf_proposed_obj.push({ // cleaning obj stick to current obj if NULL
                                    ingot_lot_id:   current_not_null_obj[0].ingot_lot_id,
                                    box_id: post_xlf.xlf['PROPOSED CofA'][i][1],
                                    location_id: current_not_null_obj[0].location_id,
                                    wafer_pcs:   current_not_null_obj[0].wafer_pcs,
                                    block_length:  current_not_null_obj[0].block_length,
                                    totalCystal_length:  current_not_null_obj[0].totalCystal_length,
                                    seedBlock: current_not_null_obj[0].seedBlock,
                                    MCLT_top: current_not_null_obj[0].MCLT_top,
                                    MCLT_tail:   current_not_null_obj[0].MCLT_tail,
                                    RES_top:  current_not_null_obj[0].RES_top,
                                    RES_tail:   current_not_null_obj[0].RES_tail,
                                    Oi_top:    current_not_null_obj[0].Oi_top,
                                    Oi_tail:   current_not_null_obj[0].Oi_tail,
                                    Cs_top:    current_not_null_obj[0].Cs_top,
                                    Cs_tail:    current_not_null_obj[0].Cs_tail,
                                    Dia_ave: current_not_null_obj[0].Dia_ave,
                                    Dia_std:    current_not_null_obj[0].Dia_std,
                                    Dia_min: current_not_null_obj[0].Dia_min,
                                    Dia_max: current_not_null_obj[0].Dia_max,
                                    CS_tail:    current_not_null_obj[0].CS_tail,
                                    Flat_ave: current_not_null_obj[0].Flat_ave,
                                    Flat_std:    current_not_null_obj[0].Flat_std,
                                    Flat_min:    current_not_null_obj[0].Flat_min,
                                    Flat_max:    current_not_null_obj[0].Flat_max,
                                    Flat_taper1:    current_not_null_obj[0].Flat_taper1,
                                    Flat_taper2:    current_not_null_obj[0].Flat_taper2,
                                    Flat_taper_min:    current_not_null_obj[0].Flat_taper_min,
                                    Flat_taper_max: current_not_null_obj[0].Flat_taper_max,
                                    Corner_ave: current_not_null_obj[0].Corner_ave,
                                    Corner_std: current_not_null_obj[0].Corner_std,
                                    Corner_min: current_not_null_obj[0].Corner_min,
                                    Corner_max: current_not_null_obj[0].Corner_max,
                                    Center_ave: current_not_null_obj[0].Center_ave,
                                    Center_std: current_not_null_obj[0].Center_std,
                                    Center_min: current_not_null_obj[0].Center_min,
                                    Center_max:    current_not_null_obj[0].Center_max,
                                    TTV_ave:    current_not_null_obj[0].TTV_ave,
                                    TTV_std:    current_not_null_obj[0].TTV_std,
                                    TTV_min:  current_not_null_obj[0].TTV_min,
                                    TTV_max:  current_not_null_obj[0].TTV_max,
                                    RA_ave:  current_not_null_obj[0].RA_ave,
                                    RA_std:  current_not_null_obj[0].RA_std,
                                    RA_min:  current_not_null_obj[0].RA_min,
                                    RA_max:  current_not_null_obj[0].RA_max,
                                    RZ_ave:   current_not_null_obj[0].RZ_ave,
                                    RZ_std:   current_not_null_obj[0].RZ_std,
                                    RZ_min:   current_not_null_obj[0].RZ_min,
                                    RZ_max:   current_not_null_obj[0].RZ_max,
                                    Ver_ave:   current_not_null_obj[0].Ver_ave,
                                    Ver_std:   current_not_null_obj[0].Ver_std,
                                    Ver_min:    current_not_null_obj[0].Ver_min,
                                    Ver_max:    current_not_null_obj[0].Ver_max,
                                    Copper_content:    current_not_null_obj[0].Copper_content,
                                    Iron_content:    current_not_null_obj[0].Iron_content,
                                    AcceptReject:    current_not_null_obj[0].AcceptReject
                                    
                                });
                            }
                        }
                        /* end of cleaning */
    
                        //  now that it's clean, resolve!
                        resolve(xlf_proposed_obj);
                    } else { // then res to client upload the required file
                        res.send(JSON.stringify('Invalid CoA File Format'));
                    }

                });
            }
    
            function ingot_barcode(){ // promise function for barcode sheet
                return new Promise(function(resolve, reject){

                    //  check if the file has ingot lot barcode sheet
                    if(typeof post_xlf.xlf['Ingot Lot Barcodes'] !== 'undefined' && post_xlf.xlf['Ingot Lot Barcodes'] !== null && post_xlf.xlf['Ingot Lot Barcodes'].length > 0){
                        
                        /* CLEANING LOOP */
                        for(let i=1;i<post_xlf.xlf['Ingot Lot Barcodes'].length;i++){
                            if(typeof post_xlf.xlf['Ingot Lot Barcodes'][i][0] !== 'undefined' && post_xlf.xlf['Ingot Lot Barcodes'][i][0] !== null && post_xlf.xlf['Ingot Lot Barcodes'][i][0] !== ''){
                                
                                //  loop per row
                                for(let j=1;j<post_xlf.xlf['Ingot Lot Barcodes'][i].length;j++){
                                    xlf_barcode_obj.push({
                                        ingot_lot_id:   post_xlf.xlf['Ingot Lot Barcodes'][i][0],
                                        ingot_barcode:  post_xlf.xlf['Ingot Lot Barcodes'][i][j]
                                    });
                                }
                            } 
                                /* 1.1 PATCH - Missed row  
                                else { // if there's missing ingot lot # 
                                res.send(JSON.stringify('Error: Missing Ingot Lot # at barcode sheet'));
                                reject('Error: Missing Ingot Lot # at barcode sheet');
                            } */
                        }
                        /* end of cleaning */

                        //  resolve cleaned object
                        resolve(xlf_barcode_obj);
                       // console.log(xlf_barcode_obj);
    
                    } else {    // then res to client upload the required file
                        res.send(JSON.stringify('Error ingot barcode: Upload CofA File with correct template'));
                    }
                });
            }

            /*  just add more function if there's more sheeeets to come */
    
            /* Promise Invoker */
            form_details().then(function(form_details_obj){
                return checkName().then(function(user_details){
                    return proposed_cofa().then(function(xlf_barcode_obj){
                        
                        return ingot_barcode().then(function(xlf_barcode_obj){

                            for(let i=0;i<xlf_proposed_obj.length;i++){
                                if(typeof xlf_proposed_obj[i].ingot_lot_id !== 'undefined' && xlf_proposed_obj[i].ingot_lot_id !== null && xlf_proposed_obj[i].ingot_lot_id.length > 0){

                                    mysqlCloud.connectAuth.getConnection(function(err,  connection){

                                        if(err !== undefined){
                                            connection.query({
                                                sql:'INSERT INTO tbl_tzs_coa SET ingot_lot_id=?, supplier_id=?, delivery_date=?, order_no=?, upload_time=?, username=?, box_id=?, location_id=?,wafer_pcs=?,block_length=?,totalCrystal_length=?,seedBlock=?,MCLT_top=?,MCLT_tail=?,RES_top=?,RES_tail=?,Oi_top=?,Oi_tail=?,Cs_top=?,Cs_tail=?,Dia_ave=?,Dia_std=?,Dia_min=?,Dia_max=?,Flat_ave=?,Flat_std=?,Flat_min=?,Flat_max=?,Flat_taper1=?,Flat_taper2=?,Flat_taper_min=?,Flat_taper_max=?,Corner_ave=?,Corner_std=?,Corner_min=?,Corner_max=?,Center_ave=?,Center_std=?,Center_min=?,Center_max=?,TTV_ave=?,TTV_std=?,TTV_min=?,TTV_max=?,RA_ave=?,RA_std=?,RA_min=?,RA_max=?,RZ_ave=?,RZ_std=?,RZ_min=?,RZ_max=?,Ver_ave=?,Ver_std=?,Ver_min=?,Ver_max=?,Copper_content=?,Iron_content=?,AcceptReject=?',
                                                values: [xlf_proposed_obj[i].ingot_lot_id, form_details_obj[0].supplier_id, form_details_obj[0].delivery_date, form_details_obj[0].order_no, new Date(), user_details[0].username, xlf_proposed_obj[i].box_id, xlf_proposed_obj[i].location_id, xlf_proposed_obj[i].wafer_pcs, xlf_proposed_obj[i].block_length, xlf_proposed_obj[i].totalCystal_length, xlf_proposed_obj[i].seedBlock, xlf_proposed_obj[i].MCLT_top, xlf_proposed_obj[i].MCLT_tail, xlf_proposed_obj[i].RES_top, xlf_proposed_obj[i].RES_tail, xlf_proposed_obj[i].Oi_top, xlf_proposed_obj[i].Oi_tail, xlf_proposed_obj[i].Cs_top, xlf_proposed_obj[i].Cs_tail, xlf_proposed_obj[i].Dia_ave, xlf_proposed_obj[i].Dia_std, xlf_proposed_obj[i].Dia_min, xlf_proposed_obj[i].Dia_max, xlf_proposed_obj[i].Flat_ave, xlf_proposed_obj[i].Flat_std, xlf_proposed_obj[i].Flat_min, xlf_proposed_obj[i].Flat_max, xlf_proposed_obj[i].Flat_taper1, xlf_proposed_obj[i].Flat_taper2, xlf_proposed_obj[i].Flat_taper_min, xlf_proposed_obj[i].Flat_taper_max, xlf_proposed_obj[i].Corner_ave, xlf_proposed_obj[i].Corner_std, xlf_proposed_obj[i].Corner_min, xlf_proposed_obj[i].Corner_max, xlf_proposed_obj[i].Center_ave, xlf_proposed_obj[i].Center_std, xlf_proposed_obj[i].Center_min, xlf_proposed_obj[i].Center_max, xlf_proposed_obj[i].TTV_ave, xlf_proposed_obj[i].TTV_std, xlf_proposed_obj[i].TTV_min, xlf_proposed_obj[i].TTV_max, xlf_proposed_obj[i].RA_ave, xlf_proposed_obj[i].RA_std, xlf_proposed_obj[i].RA_min, xlf_proposed_obj[i].RA_max, xlf_proposed_obj[i].RZ_ave, xlf_proposed_obj[i].RZ_std, xlf_proposed_obj[i].RZ_min, xlf_proposed_obj[i].RZ_max, xlf_proposed_obj[i].Ver_ave, xlf_proposed_obj[i].Ver_std, xlf_proposed_obj[i].Ver_min, xlf_proposed_obj[i].Ver_max, xlf_proposed_obj[i].Copper_content, xlf_proposed_obj[i].Iron_content, xlf_proposed_obj[i].AcceptReject] 
                                            },  function(err, results, fields){
                                                if(err){return res.send(JSON.stringify('Error: Failed in inserting ingot_coa. Check your file.'))}
                                                //console.log('saved to db!');
                                            });
                                            connection.release();
                                        }
                                        
                                    });

                                }
                            }
                            
                            for(let i=0;i<xlf_barcode_obj.length;i++){

                                if(typeof xlf_barcode_obj[i].ingot_lot_id !== 'undefined' && xlf_barcode_obj[i].ingot_lot_id !== null && xlf_barcode_obj[i].ingot_lot_id.length > 0){
                                    
                                    mysqlCloud.connectAuth.getConnection(function(err,  connection){
                                        if(err !== undefined){
                                            connection.query({
                                                sql: 'INSERT INTO tbl_ingot_lot_barcodes SET ingot_lot_id=?, supplier_id=?, delivery_date=?, order_no=?, upload_time=?, username=?, bundle_barcode=?',
                                                values: [xlf_barcode_obj[i].ingot_lot_id, form_details_obj[0].supplier_id, form_details_obj[0].delivery_date, form_details_obj[0].order_no, new Date(), user_details[0].username, xlf_barcode_obj[i].ingot_barcode]
                                            },  function(err, results, fields){
                                            //  console.log('saved');
                                                if(err){ return res.send(JSON.stringify('Error: Failed in inserting ingot_barcode. Check your file.'))}
                                            });
                                            connection.release();
                                        }
                                    });

                                }
                            }


                            res.send(JSON.stringify('Success: File has been uploaded'));

                        });

                    });
                });    
            });
            
        }
        
    }); 

    /**
     * REST API CoA details, upload history and consumed barcodes
     */
    app.get('/coauploader', verifyToken, function(req, res){
        //console.log()
        //  get the consumed bcode list
            //console.log(mysqlCloud.connectAuth)
            
                    
            mysqlCloud.connectAuth.getConnection(function(err, connection){

            function checkName(){
                return new Promise(function(resolve, reject){

                        if(err){ return res.send({err: 'error connecting to database in checking user details'})}
                        
                        connection.query({
                            sql: 'SELECT * FROM deepmes_auth_login WHERE id=?',
                            values: [req.userID]
                        },  function(err, results, fields){
                            let user_details = [];
                            if(results){
                            try{
                                    user_details.push({
                                        id: results[0].id,
                                        name: results[0].name,
                                        username: results[0].username,
                                        email: results[0].email,
                                        department: results[0].department
                                    });
        
                                    resolve(user_details);
                            } catch (error){
                                    user_details.push({
                                        id: 'undefined',
                                        name: 'undefined',
                                        username: results[0].username,
                                        email: 'undefined',
                                        department: 'undefined'
                                    });
        
                                    resolve(user_details);
                            }
                            }
                        });
                    
                });
            }

            function consumedBarcodes(){
                return new Promise(function(resolve, reject){
                    
                        connection.query({
                            sql: 'SELECT * FROM tbl_consumed_barcodes ORDER BY upload_date DESC'
                        },  function(err, results, fields){
                            let consumed_obj=[];
                                for(let i=0; i<results.length;i++){
                                    consumed_obj.push({
                                        consumed_id: results[i].id,
                                        consumed_date:  moment(results[i].upload_date).format('lll'),
                                        consumed_line: results[i].line,
                                        lot_id: results[i].lot_id,
                                        consumed_barcode: results[i].barcode
                                    });
                                }
                            resolve(consumed_obj);
                        });

                });
            }
            
            function uploadHistory(){
                return new Promise(function(resolve, reject){
                        connection.query({
                            sql: 'SELECT id, upload_time, order_no FROM tbl_ingot_lot_barcodes GROUP BY order_no ORDER BY id DESC'
                        }, function(err, results, fields){
                            let uploaded_history = [];
                                for(let i=0; i<results.length;i++){
                                    uploaded_history.push({
                                        uploaded_history_id: results[i].id,
                                        uploaded_history_date: results[i].upload_time,
                                        uploaded_history_order_no: results[i].order_no
                                    });
                                }
                            resolve(uploaded_history);
                        });
                });
            }

            function supplierList(){
                return new Promise(function(resolve, reject){
                        connection.query({
                            sql: 'SELECT supplier_id, supplier_name FROM tbl_supplier_list'
                        }, function(err, results, fields){
                            let supplier_list = [];
                                for(let i=0; i<results.length;i++){
                                    supplier_list.push({
                                        supplier_id: results[i].supplier_id,
                                        supplier_name: results[i].supplier_name
                                    });
                                }
                            resolve(supplier_list);
                        });
                });
            }
            
            consumedBarcodes().then(function(consumed_obj){
                return uploadHistory().then(function(uploaded_history){
                    return supplierList().then(function(supplier_list){
                        //console.log(consumed_obj, uploaded_history);
                        return checkName().then(function(user_details){

                            // render the page
                            res.render('coauploader', {user_details, consumed_obj, uploaded_history, supplier_list});

                        });
                    
                        
                    });

                });
            });


            connection.release();
        });

            
    });

    /**
     * REST API CoA Rev2 Kitting
     */


    /**
     * REST API CoA Rev2 Operator UI
     */
     

}