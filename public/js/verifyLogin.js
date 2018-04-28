$('document').ready(function(){
    $('#login_auth').validate({
        rules:{
            username: {
                required: true
            },
            password: {
                required: true
            }
        },
        messages:{
            username: 'Invalid username.',
            password: 'Invalid password.'
        },
        submitHandler: submitForm
    });

    function submitForm(){

        var data = $('#login_auth').serialize();

        $.ajax({
            type: 'POST',
            url: '/api/auth/login',
            data: data,
            beforeSend: function(){
                $('#error').fadeOut();
                $('#btn-login').prop('disabled', true);
            },
            success: function(response){
                if(response.auth == true){
                   
                   window.location.href='/activities';

                } else {
                    $("#error").fadeIn(1000, function(){

                        $("#error").html('<div class="alert alert-danger">'+response.err+' </div>'); 
                        $("#btn-login").prop("disabled",false);
                        $("#btn-login").html('Sign In');

                    });
                   
                }
            }
        });
    
    }

});