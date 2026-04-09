export function submit_form() {
    let valid_field_count = 0;
    let field_count = 0;

    $("form input:not([type='submit'])").each(function () {
        if($(this).val() !== "") {
            valid_field_count++;
            $(this).css("border", "solid black 1px");
        }
        else {
            $(this).css("border", "solid red 2px");
        }
        field_count++;
    });
}

export function display_pass() {
    $(document).ready(function () {
        submit_form();

        $("#aff").on("change", function () {

            let passwordField = $("#password"); 
            
            if($(this).prop("checked")) {
                passwordField.attr("type", "text");
            }
            else {
                passwordField.attr("type", "password");
            }
        });

        $("form").on("keyup", function () {
            submit_form();
        });
    });
}