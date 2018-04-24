$('document').ready(function(){

    // hide all stack class
    $('.stackOf5').hide();
    $('.stackOf4').hide();
    $('.stackOf3').hide();
    $('.stackOf2').hide();
    $('.stackOf1').hide();
    $('.liner').hide();

    // check qty then display input boxes
    $('#qty').keyup(
        function(){
            var qtyVal = parseInt(document.getElementById('qty').value);
            if(qtyVal > 400 && qtyVal <= 500){
               $('.stackOf5').show();
               $('.stackOf4').hide();
               $('.stackOf3').hide();
               $('.stackOf2').hide();
               $('.stackOf1').hide();

            } else if(qtyVal > 300 && qtyVal <= 400){
                $('.stackOf5').hide();
                $('.stackOf4').show();
                $('.stackOf3').hide();
                $('.stackOf2').hide();
                $('.stackOf1').hide();

            } else if(qtyVal > 200 && qtyVal <= 300){
                $('.stackOf5').hide();
                $('.stackOf4').hide();
                $('.stackOf3').show();
                $('.stackOf2').hide();
                $('.stackOf1').hide();

            } else if(qtyVal > 100 && qtyVal <= 200){
                $('.stackOf5').hide();
                $('.stackOf4').hide();
                $('.stackOf3').hide();
                $('.stackOf2').show();
                $('.stackOf1').hide();

            } else if(qtyVal >= 1 && qtyVal <= 100){
                $('.stackOf5').hide();
                $('.stackOf4').hide();
                $('.stackOf3').hide();
                $('.stackOf2').hide();
                $('.stackOf1').show();
                
            } else if(qtyVal > 500){
                $('.stackOf5').hide();
                $('.stackOf4').hide();
                $('.stackOf3').hide();
                $('.stackOf2').hide();
                $('.stackOf1').hide();

            } else if(!qtyVal){
                $('.stackOf5').hide();
                $('.stackOf4').hide();
                $('.stackOf3').hide();
                $('.stackOf2').hide();
                $('.stackOf1').hide();
            }
        }
    );

    /* validation */
    $('#barcode_form').validate({
        rules:{
            lot_id:  {
                required: true,
                maxlength: 20
            },
            qty: {
                required: true,
                number: true,
                max: '500',
                maxlength: 3

            },
            stacker1: {
                required: true
            },
            stacker2: {
                required: true
            },
            stacker3: {
                required: true
            },
            stacker4: {
                required: true
            },
            stacker5: {
                required: true
            }
            
        },
        messages:{
            lot_id: "Please enter the Wafer Lot ID number (limit: 20 characters)",
            qty: "Please enter same Quantity from the runcard (max: 500)",
            stacker1: "Please scan the required stack id",
            stacker2: "Please scan the required stack id",
            stacker3: "Please scan the required stack id",
            stacker4: "Please scan the required stack id",
            stacker5: "Please scan the required stack id",
        },
        submitHandler: submitForm
    });
    /* validation */

    $('#qty').on('click',function(){
        $('#error').fadeOut();
    });


    // go go go
    function submitForm(){	

        var data = $("#barcode_form").serialize();
        
        $.ajax({
            type: 'POST',
            url:  '/api/barcode',
            data: data,
            beforeSend: function(){
                $('#error').fadeOut();
                $('#btn-barcode').prop('disabled', true);
                $('#btn-barcode').html('sending ...');
            },
            success: function(response){
                //console.log(response);
                if(response=="Form has been saved!"){
                    
					$("#btn-barcode").html('Saving...');
                    $("#btn-barcode").prop("disabled",true);
                    $("#error").fadeIn(0, function(){						
                        $("#error").html('<div class="alert alert-success">'+response+' </div>');
                    });
                    $("#btn-barcode").html('Please wait...');
                    setTimeout(' window.location.reload(true); ',3000);
                } else {
                    $("#error").fadeIn(1000, function(){		
                        $("#qty").val('');
                        
                        $("#stack5_id1").val('');
                        $("#stack5_id2").val('');
                        $("#stack5_id3").val('');
                        $("#stack5_id4").val('');
                        $("#stack5_id5").val('');
                        
                        $("#stack4_id1").val('');
                        $("#stack4_id2").val('');
                        $("#stack4_id3").val('');
                        $("#stack4_id4").val('');

                        
                        $("#stack3_id1").val('');
                        $("#stack3_id2").val('');
                        $("#stack3_id3").val('');

                        $("#stack2_id1").val('');
                        $("#stack2_id2").val('');

                        $("#stack1_id1").val('');

                        $("#qty").focus();
                        
                        $('.stackOf5').hide();
                        $('.stackOf4').hide();
                        $('.stackOf3').hide();
                        $('.stackOf2').hide();
                        $('.stackOf1').hide();
                        

                        $("#error").html('<div class="alert alert-danger">'+response+' </div>'); 
                        $("#btn-barcode").prop("disabled",false);
                        $("#btn-barcode").html('Try again');
                        
                        /*
                        let counter = 10;
                        let interval = setInterval(function(){
                            counter--;
                            $("#btn-barcode").html('Please wait in ' + counter + ' secs');

                            if(counter !== 1){
                                $("#btn-barcode").html('Please wait in ' + counter + ' secs');
                            } else {
                                $("#btn-barcode").html('Please wait in ' + counter + ' sec');
                                clearInterval(interval);
                            }
                        },	1000);

                        setTimeout(function(){
                            $("#btn-barcode").prop("disabled",false);
                            $("#btn-barcode").html('Try again');
                        }, counter +'000');
                        */
                    });
                }
            }
        });

    }

});