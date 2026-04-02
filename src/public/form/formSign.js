/*------------------RECUPERATION----------------------*/
let username = $("#username");
let email = $("#email");
let lastname = $("#lastname");
let firstname = $("#firstname");
let password = $("#password");
let submit = $("#submit");
/*------------------DOM MANIPULATION----------------------*/
$(document).ready(function () {

    submit_form();

    // Display the password
    $("#aff").on("change", function () {

        if($(this).prop("checked")) {
            password.attr("type", "text");
        }
        else {
            password.attr("type", "password");
        }
    });

    // Verification if each input are filled
    $("form").on("keyup", function () {

        submit_form();
    });
});

function submit_form() {

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