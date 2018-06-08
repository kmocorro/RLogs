$('document').ready(function(){
    $('#kitting_form').validate({
        rules:{
            box_no: {
                required: true
            },
            multifield: {
                required: true,
                minlength: 15
            }
        },
        messages:{
            box_no: 'Enter Box no.',
            multifield: 'Enter runcard no. Minimum 15 characters.'
        },
        submitHandler: submitForm
    });

    function submitForm(){

        var data = $('#kitting_form').serialize();
        console.log(data);

        $.ajax({
            type: 'POST',
            url: '/api/kitting',
            data: data,
            beforeSend: function(){
                $('#error').fadeOut();
                $('#btn-kitting').prop('disabled', true);
                $('#btn-kitting').html('Submit');
            },
            success: function(response){
                if(response.success){
                    $("#btn-kitting").html('Saving...');
                    $("#btn-kitting").prop("disabled",true);
                    $("#error").fadeIn(0, function(){						
                        $("#error").html('<div class="alert alert-success">'+response.success+' </div>');
                    });
                    $("#btn-kitting").html('Submit');
                    setTimeout(' window.location.reload(true); ',500);

                } else {
                    $("#error").fadeIn(1000, function(){

                        $("#error").html('<div class="alert alert-danger">'+response.err+' </div>'); 
                        $("#btn-kitting").prop("disabled",false);
                        $("#btn-kitting").html('Try again');

                    });
                   
                }
            }
        });
    
    }

});