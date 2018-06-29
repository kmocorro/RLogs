let bodyParser = require('body-parser');
let moment = require('moment');
let jwt = require('jsonwebtoken');
let bcrypt = require('bcryptjs');
let Promise = require('bluebird');
const mysqlCloud = require('../dbConfig/dbCloud');
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
                        //mysqlCloud.connectAuth.getConnection(function(err, connection){
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
                        //    connection.release();
                        //});
    
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
            res.send({err: 'Fill up your form properly.'});
        }
        
        
    });

    /**
     * Kitting Barcode API uploader
     */
    app.post('/api/kitting', verifyToken, function(req, res){
        let post_kitting = req.body;

        if(post_kitting.box_no && post_kitting.multifield){
            let taggedRuncards = [];
            
            if((post_kitting.multifield).constructor === Array){
                for(let i = 0; i<post_kitting.multifield.length; i++){
                    if(post_kitting.multifield[i] != ''){
                        taggedRuncards.push({
                            runcard: post_kitting.multifield[i]
                        });
                    }
                }
            } else {
                if(post_kitting.multifield[0] != ''){
                    taggedRuncards = {
                        runcard: post_kitting.multifield[0]
                    };
                }
            }

            mysqlCloud.connectAuth.getConnection(function(err, connection){

                function checkName(){
                    return new Promise(function(resolve, reject){
                        //mysqlCloud.connectAuth.getConnection(function(err, connection){
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
                                        // hmmm
                                   }
                                }
                            });
                        //    connection.release();
                        //});
    
                    });
                }

                checkName().then(function(user_details){

                    function checkBoxIDifExist(){
                        return new Promise(function(resolve, reject){
                        
                            connection.query({
                                sql: 'SELECT * FROM tbl_coa_box WHERE box = ?',
                                values: [post_kitting.box_no]
                            }, function(err, results, fields){
                                if(typeof results != 'undefined' && results != null && results.length > 0){
                                    res.send({err: 'Box ID already exists!'});
                                } else {

                                    function uploadKitting(){
                                        return new Promise(function(resolve, reject){
                                            
                                            for(let i=0; i<taggedRuncards.length;i++){
                
                                                connection.query({
                                                    sql: 'INSERT INTO tbl_coa_box SET upload_date=?, box_id=?, runcard=?, username=?', // change box TO box_id
                                                    values: [new Date(), post_kitting.box_no, taggedRuncards[i].runcard, user_details[0].username]
                                                },  function(err, results, fields){
                    
                                                });
                
                                            }

                                            connection.release();
                                            res.send({success: 'Success!'});
                
                                        });
                                    }
                
                                    return uploadKitting();

                                }
                            });

                        });
                    }


                    return checkBoxIDifExist();
                    

                });

            });


        } else {
            res.send({err: 'Fill up your form properly.'});
        }

    });

    /**
     * Operator Stack ID/ Bundle Barcode uploader
     */
    app.post('/api/stackid', function(req, res){
        let post_operator = req.body;

        if(post_operator.multifield){
            let taggedStackID = [];

            if((post_operator.multifield).constructor === Array){
                for(let i = 0; i<post_operator.multifield.length; i++){
                    if(post_operator.multifield[i] != ''){
                        taggedStackID.push({
                            runcard: post_operator.multifield[i]
                        });
                    }
                }
            } else {
                if(post_operator.multifield[0] != ''){
                    taggedStackID = {
                        runcard: post_operator.multifield[0]
                    };
                }
            }

            mysqlCloud.connectAuth.getConnection(function(err, connection){

                function removeDups(){
                    return new Promise(function(resolve, reject){

                        let noDups = [];
                        let noDupsObj = {};

                        for(let i=0;i<taggedStackID.length;i++){
                            noDupsObj[taggedStackID[i].runcard]=0;
                        }

                        for(let i in noDupsObj){
                            noDups.push(i);
                        }

                        resolve(noDups);

                    });
                }

                function checkStackIDifExistsInCOA(){
                    return new Promise(function(resolve, reject){
                        let xCount = 0;
                        let lotIDResults = [];

                        for(let i=0;i<taggedStackID.length;i++){

                            connection.query({
                                sql: 'SELECT * FROM view_consolidate_barcodes WHERE lot_id =?',
                                values: [taggedStackID[i].runcard]
                            }, function(rr, results, fields){

                                xCount = xCount + 1;

                                if(results){

                                    if(results.length > 0){
                                        lotIDResults.push(
                                            results[0].barcode
                                        );
                                    }
                                }

                                if(taggedStackID.length == xCount){
                                    //console.log(taggedStackID.length, xCount)
                                    resolve(lotIDResults);
                                }

                            });

                        }


                    });
                }

                function checkStackIDifExists(){
                    return new Promise(function(resolve, reject){
                        let xCount = 0;
                        let runcardResults = [];

                        for(let i=0;i<taggedStackID.length;i++){
                            
                            //console.log(taggedStackID.length, xCount)
                            connection.query({
                                sql: 'SELECT * FROM tbl_consumed_barcodes WHERE barcode=?',
                                values: [taggedStackID[i].runcard]
                            },  function(err, results, fields){
                                
                                xCount = xCount + 1;

                                if(results){

                                    if(results.length > 0){
                                       
                                        runcardResults.push(
                                            results[0].barcode
                                        );

                                    }
                                    
                                }
                                
                                if(taggedStackID.length == xCount){
                                    //console.log(taggedStackID.length, xCount)
                                    resolve(runcardResults);
                                }

                            });

                            

                        }

                    });
                }

                removeDups().then(function(noDups){
                    console.log(noDups);
                    
                    return checkStackIDifExistsInCOA().then(function(lotIDResults){
                        return checkStackIDifExists().then(function(runcardResults){
                            
                            if(lotIDResults.length > 0){
                                
                            }
                            if(runcardResults.length == 0){
                                for(let i=0;i<noDups.length;i++){

                                    connection.query({
                                        sql: 'INSERT INTO tbl_consumed_barcodes SET upload_date =?, line =?, barcode=?',
                                        values: [new Date(), post_operator.liner, noDups[i]]
                                    }, function(err, results, fields){
                                    });
                                }
                                
                                res.send({success: 'Done.'});
                            } else {
                            
                                res.send({err: runcardResults + ' is already exists.'});
                            }
                            connection.release();

                        });
                    });
                });

            });

        } else {
            res.send({err: 'Fill up your form properly'});
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

        //console.log(post_xlf.header[2]['value']);

        /**
         * Supplier's ID
         * 1001 - TZS
         * 1002 - ACHL
         * 1003 - FERROTEC
         * 1004 - NORSUN
         * 1005 - ACMK
         * 1006 - LONGI
         * 1007 - ACHL v2
         */

        if(post_xlf.header[2]['value'] == '1001'){ // TZS

            if(!post_xlf.xlf['PROPOSED CofA']){ 
                res.send(JSON.stringify('Invalid TZS CoA file.'));
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
                            res.send(JSON.stringify('Invalid TZS Format.'));
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

                    function checkInvoiceIfExists(){
                        return new Promise(function(resolve, reject){
    
                            mysqlCloud.connectAuth.getConnection(function(err, connection){
    
                                connection.query({
                                    sql: 'SELECT * FROM view_existing_invoice WHERE order_no=?',
                                    values: [form_details_obj[0].order_no]
                                },  function(err, results, fields){
    
                                    let checkInvoiceIfExists_obj = '';
    
                                    if(results.length>0){
                                        checkInvoiceIfExists_obj = results[0].order_no;
                                        resolve(checkInvoiceIfExists_obj);
                                        //console.log(checkInvoiceIfExists_obj);
                                    } else {
                                        resolve(checkInvoiceIfExists_obj);
                                        //console.log(checkInvoiceIfExists_obj);
                                    }
                                    
                                    
                                });
    
                                connection.release();
    
                            });
    
                        });
                    }

                    return checkInvoiceIfExists().then(function(checkInvoiceIfExists_obj){
                        if(checkInvoiceIfExists_obj == ''){
                            return checkName().then(function(user_details){
                                return proposed_cofa().then(function(xlf_proposed_obj){ // changed from xlf_barcode_obj - BUG (2018/06/25 7:47)
                                    return ingot_barcode().then(function(xlf_barcode_obj){
            
                                        for(let i=0;i<xlf_proposed_obj.length;i++){
                                                    
                                            if(typeof xlf_proposed_obj[i].ingot_lot_id !== 'undefined' && xlf_proposed_obj[i].ingot_lot_id !== null && xlf_proposed_obj[i].ingot_lot_id.length > 0){
            
                                                mysqlCloud.connectAuth.getConnection(function(err,  connection){
                                                    
                                                    if(err !== undefined){
                                                        if(connection){
                                                            connection.query({
                                                                sql:'INSERT INTO tbl_tzs_coa SET ingot_lot_id=?, supplier_id=?, delivery_date=?, order_no=?, upload_time=?, username=?, box_id=?, location_id=?,wafer_pcs=?,block_length=?,totalCrystal_length=?,seedBlock=?,MCLT_top=?,MCLT_tail=?,RES_top=?,RES_tail=?,Oi_top=?,Oi_tail=?,Cs_top=?,Cs_tail=?,Dia_ave=?,Dia_std=?,Dia_min=?,Dia_max=?,Flat_ave=?,Flat_std=?,Flat_min=?,Flat_max=?,Flat_taper1=?,Flat_taper2=?,Flat_taper_min=?,Flat_taper_max=?,Corner_ave=?,Corner_std=?,Corner_min=?,Corner_max=?,Center_ave=?,Center_std=?,Center_min=?,Center_max=?,TTV_ave=?,TTV_std=?,TTV_min=?,TTV_max=?,RA_ave=?,RA_std=?,RA_min=?,RA_max=?,RZ_ave=?,RZ_std=?,RZ_min=?,RZ_max=?,Ver_ave=?,Ver_std=?,Ver_min=?,Ver_max=?,Copper_content=?,Iron_content=?,AcceptReject=?',
                                                                values: [xlf_proposed_obj[i].ingot_lot_id, form_details_obj[0].supplier_id, form_details_obj[0].delivery_date, form_details_obj[0].order_no, new Date(), user_details[0].username, xlf_proposed_obj[i].box_id, xlf_proposed_obj[i].location_id, xlf_proposed_obj[i].wafer_pcs, xlf_proposed_obj[i].block_length, xlf_proposed_obj[i].totalCystal_length, xlf_proposed_obj[i].seedBlock, xlf_proposed_obj[i].MCLT_top, xlf_proposed_obj[i].MCLT_tail, xlf_proposed_obj[i].RES_top, xlf_proposed_obj[i].RES_tail, xlf_proposed_obj[i].Oi_top, xlf_proposed_obj[i].Oi_tail, xlf_proposed_obj[i].Cs_top, xlf_proposed_obj[i].Cs_tail, xlf_proposed_obj[i].Dia_ave, xlf_proposed_obj[i].Dia_std, xlf_proposed_obj[i].Dia_min, xlf_proposed_obj[i].Dia_max, xlf_proposed_obj[i].Flat_ave, xlf_proposed_obj[i].Flat_std, xlf_proposed_obj[i].Flat_min, xlf_proposed_obj[i].Flat_max, xlf_proposed_obj[i].Flat_taper1, xlf_proposed_obj[i].Flat_taper2, xlf_proposed_obj[i].Flat_taper_min, xlf_proposed_obj[i].Flat_taper_max, xlf_proposed_obj[i].Corner_ave, xlf_proposed_obj[i].Corner_std, xlf_proposed_obj[i].Corner_min, xlf_proposed_obj[i].Corner_max, xlf_proposed_obj[i].Center_ave, xlf_proposed_obj[i].Center_std, xlf_proposed_obj[i].Center_min, xlf_proposed_obj[i].Center_max, xlf_proposed_obj[i].TTV_ave, xlf_proposed_obj[i].TTV_std, xlf_proposed_obj[i].TTV_min, xlf_proposed_obj[i].TTV_max, xlf_proposed_obj[i].RA_ave, xlf_proposed_obj[i].RA_std, xlf_proposed_obj[i].RA_min, xlf_proposed_obj[i].RA_max, xlf_proposed_obj[i].RZ_ave, xlf_proposed_obj[i].RZ_std, xlf_proposed_obj[i].RZ_min, xlf_proposed_obj[i].RZ_max, xlf_proposed_obj[i].Ver_ave, xlf_proposed_obj[i].Ver_std, xlf_proposed_obj[i].Ver_min, xlf_proposed_obj[i].Ver_max, xlf_proposed_obj[i].Copper_content, xlf_proposed_obj[i].Iron_content, xlf_proposed_obj[i].AcceptReject] 
                                                            },  function(err, results, fields){
                                                                if(err){return res.send(JSON.stringify('Error: Failed in inserting ingot_coa. Check your file.'))}
                                                                //console.log('saved to db!');
                                                            });
                                                            
                                                        connection.release();
                                                        }
                                                        
                                                    }
                                                    
            
                                                });
            
                                            }
                                        }
            
                                        // console.log('proposed: ' + xlf_barcode_obj.length);
                                        for(let i=0;i<xlf_barcode_obj.length;i++){
                                                    
                                            if(typeof xlf_barcode_obj[i].ingot_lot_id !== 'undefined' && xlf_barcode_obj[i].ingot_lot_id !== null && xlf_barcode_obj[i].ingot_lot_id.length > 0){
                                                
                                                mysqlCloud.connectAuth.getConnection(function(err,  connection){
                                                    
                                                    if(err !== undefined){
                                                        if(connection){
                                                            
                                                            connection.query({
                                                                sql: 'INSERT INTO tbl_ingot_lot_barcodes SET ingot_lot_id=?, supplier_id=?, delivery_date=?, order_no=?, upload_time=?, username=?, bundle_barcode=?',
                                                                values: [xlf_barcode_obj[i].ingot_lot_id, form_details_obj[0].supplier_id, form_details_obj[0].delivery_date, form_details_obj[0].order_no, new Date(), user_details[0].username, xlf_barcode_obj[i].ingot_barcode]
                                                            },  function(err, results, fields){
                                                            //  console.log('saved');
                                                                if(err){ return res.send(JSON.stringify('Error: Failed in inserting ingot_barcode. Check your file.'))}
                                                            });
                                                            connection.release();
            
                                                        }
                                                    }
                                                    
                                                
                                                });
            
                                            }
                                        }
                                        
                                        res.send(JSON.stringify({success: 'Uploading... Be patient. Large files need more time to build. Do not refresh.'}));
                                    });
                                });
                            }); 
                        } else {
                            res.send(JSON.stringify({err: checkInvoiceIfExists_obj + ' already exists.'}));
                        }
                    });   
                });
                
            }

        } else if(post_xlf.header[2]['value'] == '1002'){ // ACHL

            if(!post_xlf.xlf['Pallet_ID Carton_ID LOT_ID']){
                res.send(JSON.stringify('Invalid ACHL CoA File.'));
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

                function coaACHL(){
                    return new Promise(function(resolve, reject){

                        let coaACHL_obj = [];

                        for(let i=26; i < post_xlf.xlf['COA'].length; i++){
                            if(post_xlf.xlf['COA'][i][1] != null && post_xlf.xlf['COA'][i][2] != null ){
                                
                                coaACHL_obj.push({
                                    ingot_lot_id: post_xlf.xlf['COA'][i][1],
                                    pieces: post_xlf.xlf['COA'][i][2],
                                    block_length: post_xlf.xlf['COA'][i][3],
                                    totalCystal_length: post_xlf.xlf['COA'][i][4],
                                    seedBlock: post_xlf.xlf['COA'][i][5],
                                    location: post_xlf.xlf['COA'][i][6],
                                    distance: post_xlf.xlf['COA'][i][7],
                                    LT_top: post_xlf.xlf['COA'][i][8],
                                    LT_tail: post_xlf.xlf['COA'][i][9],
                                    Resist_top: post_xlf.xlf['COA'][i][10],
                                    Resist_tail: post_xlf.xlf['COA'][i][11],
                                    Oi_top: post_xlf.xlf['COA'][i][12],
                                    Oi_tail: post_xlf.xlf['COA'][i][13],
                                    Cs_top: post_xlf.xlf['COA'][i][14],
                                    Cs_tail: post_xlf.xlf['COA'][i][15],
                                    Angle: post_xlf.xlf['COA'][i][16],
                                    Dia_ave: post_xlf.xlf['COA'][i][17],
                                    Dia_std: post_xlf.xlf['COA'][i][18],
                                    Flat_X_length_ave: post_xlf.xlf['COA'][i][19],
                                    Flat_X_length_std: post_xlf.xlf['COA'][i][20],
                                    Flat_Y_lenght_ave: post_xlf.xlf['COA'][i][21],
                                    Flat_Y_length_std: post_xlf.xlf['COA'][i][22],
                                    Flat_taper_length_ave: post_xlf.xlf['COA'][i][23],
                                    Flat_taper_length_std: post_xlf.xlf['COA'][i][24],
                                    Corner_length_ave: post_xlf.xlf['COA'][i][25],
                                    Corner_length_std: post_xlf.xlf['COA'][i][26],
                                    Thickness_ave: post_xlf.xlf['COA'][i][27],
                                    Thickness_std: post_xlf.xlf['COA'][i][28],
                                    TTV: post_xlf.xlf['COA'][i][29],
                                    RZ: post_xlf.xlf['COA'][i][30],
                                    Copper_content: post_xlf.xlf['COA'][i][31],
                                    Iron_content: post_xlf.xlf['COA'][i][32],
                                    AcceptReject: post_xlf.xlf['COA'][i][33]
                                });

                            }

                        }

                        resolve(coaACHL_obj);

                    });
                }

                function ingotACHL(){
                    return new Promise(function(resolve, reject){

                        let ingotACHL_obj = [];

                        for(let i=0; i < post_xlf.xlf['Pallet_ID Carton_ID LOT_ID'].length; i++){
                            if(post_xlf.xlf['Pallet_ID Carton_ID LOT_ID'][i][0] !== null){
                                
                                ingotACHL_obj.push({
                                    pallet_id: post_xlf.xlf['Pallet_ID Carton_ID LOT_ID'][i][0],
                                    carton_id: post_xlf.xlf['Pallet_ID Carton_ID LOT_ID'][i][1],
                                    lot_id: post_xlf.xlf['Pallet_ID Carton_ID LOT_ID'][i][2],
                                    ausp_box_id: post_xlf.xlf['Pallet_ID Carton_ID LOT_ID'][i][3],
                                    qty: post_xlf.xlf['Pallet_ID Carton_ID LOT_ID'][i][4]
                                });
                            }

                            
                        }

                        resolve(ingotACHL_obj);

                    });
                }

                
                checkName().then(function(user_details){
                    return form_details().then(function(form_details_obj){
                        
                        function checkInvoiceIfExists(){
                            return new Promise(function(resolve, reject){

                                mysqlCloud.connectAuth.getConnection(function(err, connection){

                                    connection.query({
                                        sql: 'SELECT * FROM view_existing_invoice WHERE order_no=?',
                                        values: [form_details_obj[0].order_no]
                                    },  function(err, results, fields){

                                        let checkInvoiceIfExists_obj = '';

                                        if(results.length>0){
                                            checkInvoiceIfExists_obj = results[0].order_no;
                                            resolve(checkInvoiceIfExists_obj);
                                            //console.log(checkInvoiceIfExists_obj);
                                        } else {
                                            resolve(checkInvoiceIfExists_obj);
                                            //console.log(checkInvoiceIfExists_obj);
                                        }
                                        
                                        
                                    });

                                    connection.release();

                                });

                            });
                        }

                        return checkInvoiceIfExists().then(function(checkInvoiceIfExists_obj){
                            if(checkInvoiceIfExists_obj == ''){

                                return coaACHL().then(function(coaACHL_obj){
                                    return ingotACHL().then(function(ingotACHL_obj){

                                        for(let i = 0; i<coaACHL_obj.length;i++){
                                            mysqlCloud.connectAuth.getConnection(function(err, connection){
                                                if(err){return res.send(JSON.stringify('Error getConnection to AWS server.'))}
                                                
                                                if(connection){
                                                    connection.query({
                                                        sql: 'INSERT INTO tbl_achl_coa SET supplier_id=?, delivery_date=?, order_no=?, upload_time=?, username=?, ingot_lot_id=?, pieces=?, block_length=?, totalCrystal_length=?, seedBlock=?, location=?, distance=?, LT_top=?, LT_tail=?, Resist_top=?, Resist_tail=?, Oi_top=?, Oi_tail=?, Cs_top=?, Cs_tail=?, Angle=?, Dia_ave=?, Dia_std=?, Flat_X_length_ave=?, Flat_X_length_std=?, Flat_Y_length_ave=?, Flat_Y_length_std=?, Flat_taper_length_ave=?, Flat_taper_length_std=?, Corner_length_ave=?, Corner_length_std=?, Thickness_ave=?, Thickness_std=?, TTV=?, RZ=?, Copper_content=?, Iron_content=?, AcceptReject=?',
                                                        values: [form_details_obj[0].supplier_id, form_details_obj[0].delivery_date, form_details_obj[0].order_no, new Date(), user_details[0].username, coaACHL_obj[i].ingot_lot_id, coaACHL_obj[i].pieces,  coaACHL_obj[i].block_length, coaACHL_obj[i].totalCrystal_length, coaACHL_obj[i].seedBlock, coaACHL_obj[i].location, coaACHL_obj[i].distance, coaACHL_obj[i].LT_top, coaACHL_obj[i].LT_tail, coaACHL_obj[i].Resist_top, coaACHL_obj[i].Resist_tail, coaACHL_obj[i].Oi_top, coaACHL_obj[i].Oi_tail, coaACHL_obj[i].Cs_top, coaACHL_obj[i].Cs_tail, coaACHL_obj[i].Angle, coaACHL_obj[i].Dia_ave, coaACHL_obj[i].Dia_std, coaACHL_obj[i].Flat_X_length_ave, coaACHL_obj[i].Flat_X_length_std, coaACHL_obj[i].Flat_Y_length_ave, coaACHL_obj[i].Flat_Y_length_std, coaACHL_obj[i].Flat_taper_length_ave, coaACHL_obj[i].Flat_taper_length_std, coaACHL_obj[i].Corner_length_ave, coaACHL_obj[i].Corner_length_std, coaACHL_obj[i].Thickness_ave, coaACHL_obj[i].Thickness_std, coaACHL_obj[i].TTV, coaACHL_obj[i].RZ, coaACHL_obj[i].Copper_content, coaACHL_obj[i].Iron_content, coaACHL_obj[i].AcceptReject]
                                                    },  function(err, results, fields){
                                                    // console.log(results);
                                                    });

                                                    connection.release();
                                                }

                                            });
                                        }
                                        
                                        for(let i = 1; i<ingotACHL_obj.length;i++){
                                            mysqlCloud.connectAuth.getConnection(function(err, connection){
                                            // if(err){return res.send(JSON.stringify('Error getConnection to AWS server.'))}
                                                
                                                if(connection){
                                                    connection.query({
                                                        sql: 'INSERT INTO tbl_achl_ingot SET supplier_id=?, delivery_date=?, order_no=?, upload_time=?, username=?, pallet_id=?, carton_id=?, lot_id=?, box_id=?, qty=?', // changed ausp_box_id to box_id
                                                        values: [form_details_obj[0].supplier_id, form_details_obj[0].delivery_date, form_details_obj[0].order_no, new Date(), user_details[0].username, ingotACHL_obj[i].pallet_id, ingotACHL_obj[i].carton_id, ingotACHL_obj[i].lot_id, ingotACHL_obj[i].ausp_box_id, ingotACHL_obj[i].qty]
                                                    },  function(err, results, fields){

                                                    });
                                                    connection.release();
                                                }
                                            });
                                        }

                                        res.send(JSON.stringify({success: 'Uploading... Be patient. Large files need more time to build. Do not refresh.'}));

                                    });
                                });

                            } else {
                                res.send(JSON.stringify({err: checkInvoiceIfExists_obj + ' already exists.'}));
                            }
                        });
                    });
                });
                
            }

        } else if(post_xlf.header[2]['value'] == '1003'){ // FERROTEC

            if(!post_xlf.xlf['COA']){
                res.send(JSON.stringify('Invalid FERROTEC CoA File.'));
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

                function coaFERROTEC(){
                    return new Promise(function(resolve, reject){

                        let coaFERROTEC_obj = [];
                        
                        for(let i=7; i < post_xlf.xlf['COA'].length; i++){
                            if(post_xlf.xlf['COA'][i][0] != '' && post_xlf.xlf['COA'][i][1] != null){

                                coaFERROTEC_obj.push({
                                    ingot_lot_id: post_xlf.xlf['COA'][i][0],
                                    sunpower_lot_id: post_xlf.xlf['COA'][i][1],
                                    box_no: post_xlf.xlf['COA'][i][2],
                                    wafer_qty: post_xlf.xlf['COA'][i][3],
                                    wafer_qty_difference: post_xlf.xlf['COA'][i][4],
                                    block_length: post_xlf.xlf['COA'][i][5],
                                    totalCystal_length: post_xlf.xlf['COA'][i][6],
                                    seedBlock: post_xlf.xlf['COA'][i][7],
                                    MCLT_top: post_xlf.xlf['COA'][i][8],
                                    MCLT_tail: post_xlf.xlf['COA'][i][9],
                                    Res_top: post_xlf.xlf['COA'][i][10],
                                    Res_tail: post_xlf.xlf['COA'][i][11],
                                    Oi_top: post_xlf.xlf['COA'][i][12],
                                    Oi_tail: post_xlf.xlf['COA'][i][13],
                                    Cs_top: post_xlf.xlf['COA'][i][14],
                                    Cs_tail: post_xlf.xlf['COA'][i][15],
                                    Dia_ave: post_xlf.xlf['COA'][i][16],
                                    Dia_std: post_xlf.xlf['COA'][i][17],
                                    Dia_min: post_xlf.xlf['COA'][i][18],
                                    Dia_max: post_xlf.xlf['COA'][i][19],
                                    Flat_ave: post_xlf.xlf['COA'][i][20],
                                    Flat_std: post_xlf.xlf['COA'][i][21],
                                    Flat_min: post_xlf.xlf['COA'][i][22],
                                    Flat_max: post_xlf.xlf['COA'][i][23],
                                    Flat_taper_ave: post_xlf.xlf['COA'][i][24],
                                    Flat_taper_std: post_xlf.xlf['COA'][i][25],
                                    Flat_taper_min: post_xlf.xlf['COA'][i][26],
                                    Flat_taper_max: post_xlf.xlf['COA'][i][27],
                                    Corner_ave: post_xlf.xlf['COA'][i][28],
                                    Corner_std: post_xlf.xlf['COA'][i][29],
                                    Corner_min: post_xlf.xlf['COA'][i][30],
                                    Corner_max: post_xlf.xlf['COA'][i][31],
                                    Thickness_ave: post_xlf.xlf['COA'][i][32],
                                    Thickness_std: post_xlf.xlf['COA'][i][33],
                                    Thickness_min: post_xlf.xlf['COA'][i][34],
                                    Thickness_max: post_xlf.xlf['COA'][i][35],
                                    TTV_ave: post_xlf.xlf['COA'][i][36],
                                    TTV_std: post_xlf.xlf['COA'][i][37],
                                    TTV_min: post_xlf.xlf['COA'][i][38],
                                    TTV_max: post_xlf.xlf['COA'][i][39],
                                    RA_ave: post_xlf.xlf['COA'][i][40],
                                    RA_std: post_xlf.xlf['COA'][i][41],
                                    RA_min: post_xlf.xlf['COA'][i][42],
                                    RA_max: post_xlf.xlf['COA'][i][43],
                                    RZ_ave: post_xlf.xlf['COA'][i][44],
                                    RZ_std: post_xlf.xlf['COA'][i][45],
                                    RZ_min: post_xlf.xlf['COA'][i][46],
                                    RZ_max: post_xlf.xlf['COA'][i][47],
                                    Vertical_ave: post_xlf.xlf['COA'][i][48],
                                    Vertical_std: post_xlf.xlf['COA'][i][49],
                                    Vertical_min: post_xlf.xlf['COA'][i][50],
                                    Vertical_max: post_xlf.xlf['COA'][i][51],
                                    Copper_content: post_xlf.xlf['COA'][i][52],
                                    Iron_content: post_xlf.xlf['COA'][i][53],
                                    AcceptReject: post_xlf.xlf['COA'][i][54]
                                });
                            }
                        }

                        resolve(coaFERROTEC_obj);

                    });
                }

                function ingotFERROTEC(){
                    return new Promise(function(resolve, reject){

                        let ingotFERROTEC_obj = [];

                        for(let i = 1; i < post_xlf.xlf['Ingot Lot Barcodes'].length; i++){

                            if(post_xlf.xlf['Ingot Lot Barcodes'][i][0] !== null){
                                    
                                //  loop per row
                                for(let j=1;j<post_xlf.xlf['Ingot Lot Barcodes'][i].length;j++){
                                    ingotFERROTEC_obj.push({
                                        ingot_lot_id:   post_xlf.xlf['Ingot Lot Barcodes'][i][0],
                                        bundle_barcode:  post_xlf.xlf['Ingot Lot Barcodes'][i][j]
                                    });
                                }

                            } 

                        }

                        resolve(ingotFERROTEC_obj);
                    });
                }


                checkName().then(function(user_details){
                    return form_details().then(function(form_details_obj){

                        function checkInvoiceIfExists(){
                            return new Promise(function(resolve, reject){
        
                                mysqlCloud.connectAuth.getConnection(function(err, connection){
        
                                    connection.query({
                                        sql: 'SELECT * FROM view_existing_invoice WHERE order_no=?',
                                        values: [form_details_obj[0].order_no]
                                    },  function(err, results, fields){
        
                                        let checkInvoiceIfExists_obj = '';
        
                                        if(results.length>0){
                                            checkInvoiceIfExists_obj = results[0].order_no;
                                            resolve(checkInvoiceIfExists_obj);
                                            //console.log(checkInvoiceIfExists_obj);
                                        } else {
                                            resolve(checkInvoiceIfExists_obj);
                                            //console.log(checkInvoiceIfExists_obj);
                                        }
                                        
                                        
                                    });
        
                                    connection.release();
        
                                });
        
                            });
                        }

                        return checkInvoiceIfExists().then(function(checkInvoiceIfExists_obj){
                            if(checkInvoiceIfExists_obj == ''){
                                
                                return coaFERROTEC().then(function(coaFERROTEC_obj){
                                    return ingotFERROTEC().then(function(ingotFERROTEC_obj){

                                        for(let i=0;i<coaFERROTEC_obj.length;i++){ // coa
                                            mysqlCloud.connectAuth.getConnection(function(err, connection){

                                                if(connection){

                                                    connection.query({
                                                        sql: 'INSERT INTO tbl_ferrotec_coa SET supplier_id=?, delivery_date=?, order_no=?, upload_time=?, username=?, ingot_lot_id=?, sunpower_lot_id=?, box_id=?, wafer_qty=?, wafer_qty_difference=?, block_length=?, totalCrystal=?, seedBlock=?, MCLT_top=?, MCLT_tail=?, Res_top=?, Res_tail=?, Oi_top=?, Oi_tail=?, Cs_top=?, Cs_tail=?, Dia_ave=?, Dia_std=?, Dia_min=?, Dia_max=?, Flat_ave=?, Flat_std=?, Flat_min=?, Flat_max=?, Flat_taper_ave=?, Flat_taper_std=?, Flat_taper_min=?, Flat_taper_max=?, Corner_ave=?, Corner_std=?, Corner_min=?, Corner_max=?, Thickness_ave=?, Thickness_std=?, Thickness_min=?, Thickness_max=?, TTV_ave=?, TTV_std=?, TTV_min=?, TTV_max=?, RA_ave=?, RA_std=?, RA_min=?, RA_max=?, RZ_ave=?, RZ_std=?, RZ_min=?, RZ_max=?, Vertical_ave=?, Vertical_std=?, Vertical_min=?, Vertical_max=?, Copper_content=?, Iron_content=?, AcceptReject=?', // changed box_no TO box_id
                                                        values:[form_details_obj[0].supplier_id, form_details_obj[0].delivery_date, form_details_obj[0].order_no, new Date(), user_details[0].username, coaFERROTEC_obj[i].ingot_lot_id, coaFERROTEC_obj[i].sunpower_lot_id, coaFERROTEC_obj[i].box_no, coaFERROTEC_obj[i].wafer_qty, coaFERROTEC_obj[i].wafer_qty_difference, coaFERROTEC_obj[i].block_length, coaFERROTEC_obj[i].totalCrystal, coaFERROTEC_obj[i].seedBlock, coaFERROTEC_obj[i].MCLT_top, coaFERROTEC_obj[i].MCLT_tail, coaFERROTEC_obj[i].Res_top, coaFERROTEC_obj[i].Res_tail, coaFERROTEC_obj[i].Oi_top, coaFERROTEC_obj[i].Oi_tail, coaFERROTEC_obj[i].Cs_top, coaFERROTEC_obj[i].Cs_tail, coaFERROTEC_obj[i].Dia_ave, coaFERROTEC_obj[i].Dia_std, coaFERROTEC_obj[i].Dia_min, coaFERROTEC_obj[i].Dia_max, coaFERROTEC_obj[i].Flat_ave, coaFERROTEC_obj[i].Flat_std, coaFERROTEC_obj[i].Flat_min, coaFERROTEC_obj[i].Flat_max, coaFERROTEC_obj[i].Flat_taper_ave, coaFERROTEC_obj[i].Flat_taper_std, coaFERROTEC_obj[i].Flat_taper_min, coaFERROTEC_obj[i].Flat_taper_max, coaFERROTEC_obj[i].Corner_ave, coaFERROTEC_obj[i].Corner_std, coaFERROTEC_obj[i].Corner_min, coaFERROTEC_obj[i].Corner_max, coaFERROTEC_obj[i].Thickness_ave, coaFERROTEC_obj[i].Thickness_std, coaFERROTEC_obj[i].Thickness_min, coaFERROTEC_obj[i].Thickness_max, coaFERROTEC_obj[i].TTV_ave, coaFERROTEC_obj[i].TTV_std, coaFERROTEC_obj[i].TTV_min, coaFERROTEC_obj[i].TTV_max, coaFERROTEC_obj[i].RA_ave, coaFERROTEC_obj[i].RA_std, coaFERROTEC_obj[i].RA_min, coaFERROTEC_obj[i].RA_max, coaFERROTEC_obj[i].RZ_ave, coaFERROTEC_obj[i].RZ_std, coaFERROTEC_obj[i].RZ_min, coaFERROTEC_obj[i].RZ_max, coaFERROTEC_obj[i].Vertical_ave, coaFERROTEC_obj[i].Vertical_std, coaFERROTEC_obj[i].Vertical_min, coaFERROTEC_obj[i].Vertical_max, coaFERROTEC_obj[i].Copper_content, coaFERROTEC_obj[i].Iron_content, coaFERROTEC_obj[i].AcceptReject]
                                                    },  function(err, results, fields){
                                                    });

                                                    connection.release();
                                                }

                                            });
                                        }
                                        
                                        for(let i=0;i<ingotFERROTEC_obj.length;i++){
                                            mysqlCloud.connectAuth.getConnection(function(err, connection){

                                                if(connection){
                                                    connection.query({
                                                        sql: 'INSERT INTO tbl_ferrotec_ingot SET supplier_id=?, delivery_date=?, order_no=?, upload_time=?, username=?,ingot_lot_id=?, bundle_barcode=?',
                                                        values: [form_details_obj[0].supplier_id, form_details_obj[0].delivery_date, form_details_obj[0].order_no, new Date(), user_details[0].username, ingotFERROTEC_obj[i].ingot_lot_id, ingotFERROTEC_obj[i].bundle_barcode]
                                                    }, function(err, results, fields){
                                                    });
                                                
                                                    connection.release();

                                                }

                                            });
                                        }

                                        res.send(JSON.stringify({success: 'Uploading... Be patient. Large files need more time to build. Do not refresh.'}));

                                    });
                                });

                            }  else {
                                res.send(JSON.stringify({err: checkInvoiceIfExists_obj + ' already exists.'}));
                            }
                        });
                    });
                });

            }

        } else if(post_xlf.header[2]['value'] == '1004'){ // NORSUN

            if(!post_xlf.xlf['CofA']){
                res.send(JSON.stringify('Invalid NORSUN CoA file.'));
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

            }

        } else if(post_xlf.header[2]['value'] == '1005'){ // ACMK
            
            res.send(JSON.stringify('No parser for ACMK as of the moment.'));
        } else if(post_xlf.header[2]['value'] == '1006'){ // LONGI

            res.send(JSON.stringify('No parser for LONGI as of the moment.'));
        } else if(post_xlf.header[2]['value'] == '1007'){ // ACHL v2

            if(!post_xlf.xlf['Pallet_ID Carton_ID LOT_ID']){
                res.send(JSON.stringify('Invalid ACHL CoA File.'));
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

                function coaACHL(){
                    return new Promise(function(resolve, reject){

                        let coaACHL_obj = [];

                        for(let i=9; i < post_xlf.xlf['COA'].length; i++){ // row 10th
                            if(post_xlf.xlf['COA'][i][1] != null && post_xlf.xlf['COA'][i][2] != null ){
                                
                                coaACHL_obj.push({
                                    ingot_lot_id: post_xlf.xlf['COA'][i][0],
                                    box_id: post_xlf.xlf['COA'][i][1],
                                    location: post_xlf.xlf['COA'][i][2],
                                    wafer_qty: post_xlf.xlf['COA'][i][3],
                                    blocklength: post_xlf.xlf['COA'][i][4],
                                    totalcrystal: post_xlf.xlf['COA'][i][5],
                                    seedblock: post_xlf.xlf['COA'][i][6],
                                    mclt_top: post_xlf.xlf['COA'][i][7],
                                    mclt_bottom: post_xlf.xlf['COA'][i][8],
                                    res_top: post_xlf.xlf['COA'][i][9],
                                    res_bottom: post_xlf.xlf['COA'][i][10],
                                    oi_top: post_xlf.xlf['COA'][i][11],
                                    oi_bottom: post_xlf.xlf['COA'][i][12],
                                    cs_top: post_xlf.xlf['COA'][i][13],
                                    cs_bottom: post_xlf.xlf['COA'][i][14],
                                    dia_ave: post_xlf.xlf['COA'][i][15],
                                    dia_std: post_xlf.xlf['COA'][i][16],
                                    dia_min: post_xlf.xlf['COA'][i][17],
                                    dia_max: post_xlf.xlf['COA'][i][18],
                                    flat_width_ave: post_xlf.xlf['COA'][i][19],
                                    flat_width_std: post_xlf.xlf['COA'][i][20],
                                    flat_width_min: post_xlf.xlf['COA'][i][21],
                                    flat_width_max: post_xlf.xlf['COA'][i][22],
                                    flat_lenth_ave: post_xlf.xlf['COA'][i][23],
                                    flat_lenth_std: post_xlf.xlf['COA'][i][24],
                                    flat_lenth_min: post_xlf.xlf['COA'][i][25],
                                    flat_lenth_max: post_xlf.xlf['COA'][i][26],
                                    corner_length_ave: post_xlf.xlf['COA'][i][27],
                                    corner_length_std: post_xlf.xlf['COA'][i][28],
                                    corner_length_min: post_xlf.xlf['COA'][i][29],
                                    corner_length_max: post_xlf.xlf['COA'][i][30],
                                    center_thickness_ave: post_xlf.xlf['COA'][i][31],
                                    center_thickness_std: post_xlf.xlf['COA'][i][32],
                                    center_thickness_min: post_xlf.xlf['COA'][i][33],
                                    center_thickness_max: post_xlf.xlf['COA'][i][34],
                                    ttv_ave: post_xlf.xlf['COA'][i][35],
                                    ttv_std: post_xlf.xlf['COA'][i][36],
                                    ttv_min: post_xlf.xlf['COA'][i][37],
                                    ttv_max: post_xlf.xlf['COA'][i][38],
                                    ra_ave: post_xlf.xlf['COA'][i][39],
                                    ra_std: post_xlf.xlf['COA'][i][40],
                                    ra_min: post_xlf.xlf['COA'][i][41],
                                    ra_max: post_xlf.xlf['COA'][i][42],
                                    rz_ave: post_xlf.xlf['COA'][i][43],
                                    rz_std: post_xlf.xlf['COA'][i][44],
                                    rz_min: post_xlf.xlf['COA'][i][45],
                                    rz_max: post_xlf.xlf['COA'][i][46],
                                    verticality_ave: post_xlf.xlf['COA'][i][47],
                                    verticality_std: post_xlf.xlf['COA'][i][48],
                                    verticality_min: post_xlf.xlf['COA'][i][49],
                                    verticality_max: post_xlf.xlf['COA'][i][50],
                                    copper_content: post_xlf.xlf['COA'][i][51],
                                    iron_content: post_xlf.xlf['COA'][i][52],
                                    acceptreject: post_xlf.xlf['COA'][i][53]
                                });

                            }

                        }

                        resolve(coaACHL_obj);

                    });
                }

                function ingotACHL(){
                    return new Promise(function(resolve, reject){

                        let ingotACHL_obj = [];

                        for(let i=0; i < post_xlf.xlf['Pallet_ID Carton_ID LOT_ID'].length; i++){
                            if(post_xlf.xlf['Pallet_ID Carton_ID LOT_ID'][i][0] !== null){
                                
                                ingotACHL_obj.push({
                                    pallet_id: post_xlf.xlf['Pallet_ID Carton_ID LOT_ID'][i][0],
                                    carton_id: post_xlf.xlf['Pallet_ID Carton_ID LOT_ID'][i][1],
                                    lot_id: post_xlf.xlf['Pallet_ID Carton_ID LOT_ID'][i][2],
                                    ausp_box_id: post_xlf.xlf['Pallet_ID Carton_ID LOT_ID'][i][3],
                                    qty: post_xlf.xlf['Pallet_ID Carton_ID LOT_ID'][i][4]
                                });
                            }

                            
                        }

                        resolve(ingotACHL_obj);

                    });
                }

                
                checkName().then(function(user_details){
                    return form_details().then(function(form_details_obj){
                        
                        function checkInvoiceIfExists(){
                            return new Promise(function(resolve, reject){

                                mysqlCloud.connectAuth.getConnection(function(err, connection){

                                    connection.query({
                                        sql: 'SELECT * FROM view_existing_invoice_v2 WHERE order_no=?',
                                        values: [form_details_obj[0].order_no]
                                    },  function(err, results, fields){

                                        let checkInvoiceIfExists_obj = '';

                                        if(results.length>0){
                                            checkInvoiceIfExists_obj = results[0].order_no;
                                            resolve(checkInvoiceIfExists_obj);
                                            //console.log(checkInvoiceIfExists_obj);
                                        } else {
                                            resolve(checkInvoiceIfExists_obj);
                                            //console.log(checkInvoiceIfExists_obj);
                                        }
                                        
                                        
                                    });

                                    connection.release();

                                });

                            });
                        }

                        return checkInvoiceIfExists().then(function(checkInvoiceIfExists_obj){
                            if(checkInvoiceIfExists_obj == ''){

                                return coaACHL().then(function(coaACHL_obj){
                                    return ingotACHL().then(function(ingotACHL_obj){
                                        //console.log(coaACHL_obj);
                                        
                                        for(let i = 0; i<coaACHL_obj.length;i++){
                                            mysqlCloud.connectAuth.getConnection(function(err, connection){
                                                //if(err){return res.send(JSON.stringify('Error getConnection to AWS server.'))}

                                                if(err){ console.log(err)};

                                                if(connection){
                                                    connection.query({
                                                        sql: 'INSERT INTO tbl_achl_coa_v2 SET supplier_id=?, delivery_date=?, order_no=?, upload_time=?, username=?, ingot_lot_id=?, box_id=?, location=?, wafer_qty=?, blocklength=?, totalcrystal=?, seedblock=?, mclt_top=?, mclt_bottom=?, res_top=?, res_bottom=?, oi_top=?, oi_bottom=?, cs_top=?, cs_bottom=?, dia_ave=?, dia_std=?, dia_min=?, dia_max=?, flat_width_ave=?, flat_width_std=?, flat_width_min=?, flat_width_max=?, flat_length_ave=?, flat_length_std=?, flat_length_min=?, flat_length_max=?, corner_length_ave=?, corner_length_std=?, corner_length_min=?, corner_length_max=?, center_thickness_ave=?, center_thickness_std=?, center_thickness_min=?, center_thickness_max=?, ttv_ave=?, ttv_std=?, ttv_min=?, ttv_max=?, ra_ave=?, ra_std=?, ra_min=?, ra_max=?, rz_ave=?, rz_std=?, rz_min=?, rz_max=?, verticality_ave=?, verticality_std=?, verticality_min=?, verticality_max=?, copper_content=?, iron_content=?, acceptreject=?',
                                                        values: [form_details_obj[0].supplier_id, form_details_obj[0].delivery_date, form_details_obj[0].order_no, new Date(), user_details[0].username, coaACHL_obj[i].ingot_lot_id, coaACHL_obj[i].box_id,  coaACHL_obj[i].location, coaACHL_obj[i].wafer_qty, coaACHL_obj[i].blocklength, coaACHL_obj[i].totalcrystal, coaACHL_obj[i].seedblock, coaACHL_obj[i].mclt_top, coaACHL_obj[i].mclt_bottom, coaACHL_obj[i].res_top, coaACHL_obj[i].res_bottom, coaACHL_obj[i].oi_top, coaACHL_obj[i].oi_bottom, coaACHL_obj[i].cs_top, coaACHL_obj[i].cs_bottom, coaACHL_obj[i].dia_ave, coaACHL_obj[i].dia_std, coaACHL_obj[i].dia_min, coaACHL_obj[i].dia_max,  coaACHL_obj[i].flat_width_ave, coaACHL_obj[i].flat_width_std, coaACHL_obj[i].flat_width_min, coaACHL_obj[i].flat_width_max, coaACHL_obj[i].flat_length_ave, coaACHL_obj[i].flat_length_std, coaACHL_obj[i].flat_length_min, coaACHL_obj[i].flat_length_max, coaACHL_obj[i].corner_length_ave, coaACHL_obj[i].corner_length_std, coaACHL_obj[i].corner_length_min, coaACHL_obj[i].corner_length_max, coaACHL_obj[i].center_thickness_ave, coaACHL_obj[i].center_thickness_std, coaACHL_obj[i].center_thickness_min, coaACHL_obj[i].center_thickness_max, coaACHL_obj[i].ttv_ave, coaACHL_obj[i].ttv_std, coaACHL_obj[i].ttv_min, coaACHL_obj[i].ttv_max, coaACHL_obj[i].ra_ave, coaACHL_obj[i].ra_std, coaACHL_obj[i].ra_min, coaACHL_obj[i].ra_max, coaACHL_obj[i].rz_ave, coaACHL_obj[i].rz_std, coaACHL_obj[i].rz_min, coaACHL_obj[i].rz_max, coaACHL_obj[i].verticality_ave, coaACHL_obj[i].verticality_std, coaACHL_obj[i].verticality_min, coaACHL_obj[i].verticality_max, coaACHL_obj[i].copper_content, coaACHL_obj[i].iron_content, coaACHL_obj[i].acceptreject]
                                                    },  function(err, results, fields){
                                                        //if(err){ return res.send(JSON.stringify({err: 'Error uploading ACHL v2 COA file...'})) };
                                                        if(err){console.log(err)};
                                                    });

                                                    connection.release();
                                                }

                                            });
                                        }
                                        
                                        
                                        for(let i = 1; i<ingotACHL_obj.length;i++){
                                            mysqlCloud.connectAuth.getConnection(function(err, connection){
                                            // if(err){return res.send(JSON.stringify('Error getConnection to AWS server.'))}
                                            if(err){ console.log(err)};

                                                if(connection){
                                                    connection.query({
                                                        sql: 'INSERT INTO tbl_achl_ingot_v2 SET supplier_id=?, delivery_date=?, order_no=?, upload_time=?, username=?, pallet_id=?, carton_id=?, lot_id=?, box_id=?, qty=?', // changed ausp_box_id to box_id
                                                        values: [form_details_obj[0].supplier_id, form_details_obj[0].delivery_date, form_details_obj[0].order_no, new Date(), user_details[0].username, ingotACHL_obj[i].pallet_id, ingotACHL_obj[i].carton_id, ingotACHL_obj[i].lot_id, ingotACHL_obj[i].ausp_box_id, ingotACHL_obj[i].qty]
                                                    },  function(err, results, fields){
                                                        if(err){console.log(err)};
                                                    });
                                                    connection.release();
                                                }
                                            });
                                        }

                                        res.send(JSON.stringify({success: 'Uploading... Be patient. Large files need more time to build. Do not refresh.'}));

                                    });
                                });

                            } else {
                                res.send(JSON.stringify({err: checkInvoiceIfExists_obj + ' already exists.'}));
                            }
                        });
                    });
                });
                
            }

        }
        
        
    }); 

    /**
     * REST API CoA details, upload history and consumed barcodes
     */
    app.get('/coauploader', verifyToken, function(req, res){
        //console.log()
        //  get the consumed bcode list
            //console.log(mysqlCloud.connectAuth)
            
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');
                    
            mysqlCloud.connectAuth.getConnection(function(err, connection){
                if(err){return res.send('Cannot connect to database.')};
            
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
                            sql: 'SELECT B.supplier_name, A.order_no, A.username, A.upload_time FROM (SELECT id, supplier_id, upload_time, order_no, username FROM tbl_ingot_lot_barcodes GROUP BY order_no UNION SELECT id, supplier_id, upload_time, order_no, username FROM tbl_achl_ingot_v2 GROUP BY order_no UNION SELECT id, supplier_id, upload_time, order_no, username FROM tbl_ferrotec_ingot GROUP BY order_no) A JOIN (SELECT supplier_id, supplier_name FROM tbl_supplier_list) B ON A.supplier_id = B.supplier_id ORDER BY A.upload_time DESC'
                        }, function(err, results, fields){
                            let uploaded_history = [];
                                for(let i=0; i<results.length;i++){
                                    uploaded_history.push({
                                        uploaded_history_id: results[i].id,
                                        uploaded_history_supplier_name: results[i].supplier_name,
                                        uploaded_history_date: results[i].upload_time,
                                        uploaded_history_order_no: results[i].order_no,
                                        uploaded_history_username: results[i].username
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
    app.get('/kitting', verifyToken, function(req, res){
            
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');

        
        function checkName(){
            return new Promise(function(resolve, reject){
            
                mysqlCloud.connectAuth.getConnection(function(err, connection){
                if(err){res.send({err: 'Error in connecting to database.'})};

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

        function kittingUploadHistory(){
            return new Promise(function(resolve, reject){
                mysqlCloud.connectAuth.getConnection(function(err, connection){
                    if(err){res.send({err: 'Error in connecting to database.'})};

                    connection.query({
                        sql: 'SELECT * FROM tbl_coa_box ORDER BY id DESC'
                    },  function(err, results, fields){
                        if(results){
                            let kittingUploadHistory_obj = [];

                            for(let i=0; i<results.length;i++){
                                kittingUploadHistory_obj.push({
                                    id : results[i].id,
                                    upload_date : moment(results[i].upload_date).format('lll'),
                                    box_id : results[i].box_id, // box TO box_id
                                    runcard : results[i].runcard,
                                    username: results[i].username
                                });
                            }

                            resolve(kittingUploadHistory_obj);
                        }
                    });

                connection.release();
                });


            });
        }
        
        checkName().then(function(user_details){
            return kittingUploadHistory().then(function(kittingUploadHistory_obj){
                
                res.render('kitting', {kittingUploadHistory_obj, user_details});


            });
        });

    });


    /**
     * REST API CoA Rev2 Operator UI
     */
    app.get('/acs/:line', function(req, res){
    
        if(req.params.line == '17' || req.params.line == '18'  || req.params.line == '19'  || req.params.line == '20'  || req.params.line == '21'  || req.params.line == '22'){
            let lineGG = req.params.line;

            function operatorUploadHistory(){
                return new Promise(function(resolve, reject){
                    
                    mysqlCloud.connectAuth.getConnection(function(err, connection){

                        connection.query({
                            sql: 'SELECT * FROM tbl_consumed_barcodes ORDER BY id DESC'
                        },  function(err, results, fields){
                            if(results){
                                let operatorUploadHistory_obj = [];

                                for(let i=0; i<results.length;i++){
                                    operatorUploadHistory_obj.push({
                                        id : results[i].id,
                                        upload_date : moment(results[i].upload_date).format('lll'),
                                        line : results[i].line,
                                        barcode : results[i].barcode
                                    });
                                }

                                resolve(operatorUploadHistory_obj);
                            }
                        });

                        connection.release();

                    });

                });
            }

            operatorUploadHistory().then(function(operatorUploadHistory_obj){
                res.render('operator', { operatorUploadHistory_obj, lineGG });
            });

        } else {
            res.send('404 | Link unavailable.')
        }

        
    });

}