import crypto from 'crypto';
/**
 * Backend for the connexion page
 * @param {*} server 
 * @author Elias
 */
export function runConnex(server) {

    let app = server.app;
    let baseUrl = server.action;

    function hashPassword(password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.scryptSync(password, salt, 64).toString('hex');
        return `${salt}:${hash}`;
    }

    function verifyPassword(passwordAttempt, storedPassword) {
        const [salt, originalHash] = storedPassword.split(':');
        const attemptHash = crypto.scryptSync(passwordAttempt, salt, 64).toString('hex');
        return attemptHash === originalHash;
    }

    const defaultPasswordHash = hashPassword("admin123");
    
    const usersDB = [
        {
            email: "test@example.com",
            username: "testuser",
            passwordHash: defaultPasswordHash
        }
    ];

    app.get('/signin', (req, res) => {
        res.render("Form/formConnex.ejs", {action : baseUrl});
    });

    app.post('/signin', (req, res) => {
        const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
        const password = req.body.password ? req.body.password.trim() : '';

        if (!email || !password) {
            console.log("Error: Missing email or password");
            return res.status(400).send("Email and password are required.");
        }

        const user = usersDB.find(u => u.email === email);

        if (!user) {
            console.log("Error: User not found");
            return res.status(401).send("Email or password is incorrect.");
        }

        const isMatch = verifyPassword(password, user.passwordHash);
        
        if (!isMatch) {
            console.log("Error: Incorrect password");
            return res.status(401).send("Email or password is incorrect.");
        }

        console.log(`User ${user.username} logged in successfully!`);
        res.redirect('/profile');
    });
}