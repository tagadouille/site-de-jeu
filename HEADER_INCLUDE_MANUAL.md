# Manual of what object to pass to the include function or the res.render while including the header :

```js
{
    title : "My page title",
    script : "path to the JS script of the page",
    is_connect : false, // If the user is consider as connected
    is_display_buttons : false, // If we want to display the button
    stylesheet_html: '<link rel="stylesheet" href="my_stylesheet">' +
}
```