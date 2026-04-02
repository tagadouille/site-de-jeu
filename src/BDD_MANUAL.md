# DATABASE MANUAL

This manual explains how to initialize and use the database for the website.

---

## Requirements

* PostgreSQL must be installed on your machine.
* Node.js environment with the `pg` package installed (for JavaScript database operations).

---

## Database Configuration

Ensure that your database is configured with the following parameters:

* **User:** `site_admin`
* **Host:** `localhost`
* **Database Name:** `site_bdd`
* **Password:** `P@risCite2026`
* **Port:** `5432`

> ⚠️ Make sure PostgreSQL is running and the credentials above are correctly set up.

---

## Example of a Query Function

Here is an example of a function to query the database using JavaScript:

```javascript
async function operations() {
    const client = await pool.connect(); // Connect to the database

    try {
        // Execute the query
        const res = await client.query("SELECT * FROM games");

        // Iterate through the results
        for (let row of res.rows) {
            console.log(row.name);
            console.log(row.description);
        }

        // Return the results (optional)
        return res.rows;

    } catch (err) {
        console.error('Database error:', err.stack); // Handle errors

    } finally {
        client.release(); // Always release the client
    }
}

// Run the function
operations()
    .then(result => console.log(result))
    .catch(err => console.error('Error executing operations:', err));
```

# Get the pool from another file : 

The pool is in the app_obj of *server.js*, the object that is passed to the runs method.

```javascript
const app_obj = { app: app, action: PATH, pool: pool };
```