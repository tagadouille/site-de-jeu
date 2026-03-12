const express = require('express');
const app = express();

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));

let baseDeDonnees = [];

app.get('/', (req, res) => {
    
});

app.post('/', (req, res) => {
    
});

app.listen(4321);