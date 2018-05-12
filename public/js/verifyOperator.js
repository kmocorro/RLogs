$('document').ready(function(){

    $('#operator_form').validate({
        rules:{
            multifield: {
                required: true
            }
        },
        messages:{
            multifield: 'Enter stack barcode (100pcs).'
        },
        submitHandler: submitForm
    });

    function submitForm(){

        var data = $('#operator_form').serialize();
        console.log(data);

        $.ajax({
            type: 'POST',
            url: '/api/stackid',
            data: data,
            beforeSend: function(){
                $('#error').fadeOut();
                $('#btn-operator').prop('disabled', true);
                $('#btn-operator').html('Submit');
            },
            success: function(response){
                if(response.success){
                    $("#btn-operator").html('Saving...');
                    $("#btn-operator").prop("disabled",true);
                    $("#error").fadeIn(0, function(){						
                        $("#error").html('<div class="alert alert-success">'+response.success+' </div>');
                    });
                    $("#btn-operator").html('Submit');
                    setTimeout(' window.location.reload(true); ',500);

                } else {
                    $("#error").fadeIn(1000, function(){

                        $("#error").html('<div class="alert alert-danger">'+response.err+' </div>'); 
                        $("#btn-operator").prop("disabled",false);
                        $("#btn-operator").html('Try again');

                    });
                   
                }
            }
        });
    
    }

});