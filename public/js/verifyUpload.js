$('document').ready(function(){

    /* validation */
    $('#upload_form').validate({
        rules:{
            order_no:  {
                required: true
            },
            xlf: {
                required: true
            },
            delivery_date: {
                required: true
            },
            supplier_id: {
                required: true
            }
            
        },
        messages:{
            order_no: "Please enter the invoice number",
            delivery_date: "Please enter delivery date",
            supplier_id: "Select supplier name"
        },
        submitHandler: submitForm
    });
    $('input[name^="xlfile"]').rules('add', {
        required: true,
    });

    $('input:file').change('click', function(){
        $("#btn-upload").prop("disabled",true);
        $("#btn-upload").html('Loading excel file...');
        
        $("#xlf").prop("disabled",true);

        setTimeout(function(){
            $("#btn-upload").html('Upload');
            $("#btn-upload").prop("disabled",false);
        }, 10000);
            
    });
    /* validation */

    function submitForm(){

        var serializedForm = $('#upload_form').find('select, input[name!=xlfile]').serializeArray();
        var jsonSerializedForm ={header: serializedForm};
        var jsonOutput={xlf: outputJSON};

        console.log(jsonOutput);

        var toGo = JSON.stringify($.extend( jsonSerializedForm, jsonOutput));

        //console.log(toGo);

        $.ajax({
            type: 'POST',
            url:  '/api/upload',
            data: toGo,
            contentType: 'application/json',
            dataType: 'json',
            beforeSend: function(){
                $('#error').fadeOut();
                $('#btn-upload').prop('disabled', true);
                $('#btn-upload').html('sending ...');
            },
            success: function(response){
                //console.log(response);
                if(response=="Success: File has been uploaded"){
                    
					$("#btn-upload").html('Uploading...');
                    $("#btn-upload").prop("disabled",true);
                    $("#xlf").prop("disabled",true);
                    $("#error").fadeIn(0, function(){						
                        $("#error").html('<div class="alert alert-success">'+response+' </div>');
                    });
                    $("#btn-upload").html('Please wait...');
                    setTimeout(' window.location.href="/coauploader"; ', 3000);
                } else {
                    $("#error").fadeIn(1000, function(){						
                        $("#error").html('<div class="alert alert-danger">'+response+' </div>'); 
                        $("#btn-upload").prop("disabled",false);
                        $("#xlf").prop("disabled",false);
                        $("#btn-upload").html('Try again');
                        /*
                        let counter = 10;
                        let interval = setInterval(function(){
                            counter--;
                            $("#btn-upload").html('Please wait in ' + counter + ' secs');

                            if(counter !== 1){
                                $("#btn-upload").html('Please wait in ' + counter + ' secs');
                            } else {
                                $("#btn-upload").html('Please wait in ' + counter + ' sec');
                                clearInterval(interval);
                            }
                        },	1000);

                        setTimeout(function(){
                            $("#btn-upload").prop("disabled",false);
                            $("#btn-upload").html('Try again');
                        }, counter +'000');
                        */
                    });
                }
            }
        });

    }

});