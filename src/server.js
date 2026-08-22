// File Location: backend/server.js
// File Name: server.js

const express = require('express');
const helmet = require('helmet');
const app = express();

// Configure Content Security Policy (CSP) via Helmet
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
            fontSrc: ["'self'", "fonts.gstatic.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
        },
    })
);

// Body parser and routes setup
app.use(express.json());

// Example route
app.get('/', (req, res) => {
    res.send('Pollution Control Hub API running securely.');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
