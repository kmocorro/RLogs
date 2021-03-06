$('document').ready(function(){
    $('#rlogs_form').validate({
        rules:{
            date_range: {
                required: true
            },
            process_name: {
                required: true
            },
            comments:{
                required: true
            }
        },
        messages:{
            date_range: 'Enter date range.',
            process_name: 'Enter process name affected.',
            comments: 'Enter your activity.'
        },
        submitHandler: submitForm
    });

    function submitForm(){

        var data = $('#rlogs_form').serialize();

        $.ajax({
            type: 'POST',
            url: '/api/runlogs',
            data: data,
            beforeSend: function(){
                $('#error').fadeOut();
                $('#btn-rlogs').prop('disabled', true);
                $('#btn-rlogs').html('Post Your Activities');
            },
            success: function(response){
                if(response.success){
                    $("#btn-rlogs").html('Saving...');
                    $("#btn-rlogs").prop("disabled",true);
                    $("#error").fadeIn(0, function(){						
                        $("#error").html('<div class="alert alert-success">'+response.success+' </div>');
                    });
                    $("#btn-rlogs").html('Post Your Activities');
                    setTimeout(' window.location.reload(true); ',500);

                } else {
                    $("#error").fadeIn(1000, function(){

                        $("#error").html('<div class="alert alert-danger">'+response.err+' </div>'); 
                        $("#btn-rlogs").prop("disabled",false);
                        $("#btn-rlogs").html('Try again');

                    });
                   
                }
            }
        });
    
    }

});