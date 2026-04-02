import crypto from 'crypto';

/**
 
Backend for the connexion page
@param {*} server
@author Noa*/
export function runSign(server) {

    let app = server.app;
    let baseUrl = server.action;

    function hashPassword(password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.scryptSync(password, salt, 64).toString('hex');
        return `${salt}:${hash}`;
    }

    const usersDB = []; 

    app.get('/signup', (req, res) => {
        res.render("Form/formSign.ejs", {action : baseUrl});
    });

    app.post('/signup', (req, res) => {
        
        const username = req.body.username ? req.body.username.trim() : '';
        const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
        const password = req.body.password ? req.body.password.trim() : '';

        if (!username || !email || !password) {
            console.log("Error: Missing username, email, or password");
            return res.status(400).send(" Username, email, and password are required.");
        }

        if (password.length < 8) {
            console.log("Error: Password too short");
            return res.status(400).send("The password must be at least 8 characters long.");
        }

        const existingUser = usersDB.find(u => u.email === email);
        if (existingUser) {
            console.log("Error: Email already exists");
            return res.status(400).send("This email is already in use.");
        }

        const passwordHash = hashPassword(password);

        const newUser = {
            username: username,
            email: email,
            passwordHash: passwordHash
        };
        
        usersDB.push(newUser);
        console.log(`New user registered: ${username} (${email})`);

        res.redirect('/signin');
    });
}