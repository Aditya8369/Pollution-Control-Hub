
const express = require('express');
const router = express.Router();
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const { authenticateAdmin } = require('../middleware/auth'); // Example auth middleware

router.get('/export', authenticateAdmin, async (req, res) => {
    try {
        // Set headers for file download
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename=server-logs-audit.zip');

        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression level
        });

        archive.on('error', (err) => {
            throw err;
        });

        // Pipe archive data to the response stream
        archive.pipe(res);

        // Directory where server logs are stored
        const logsDir = path.join(__dirname, '../logs');

        if (fs.existsSync(logsDir)) {
            // Append files from the logs directory into the archive
            archive.directory(logsDir, false);
        } else {
            return res.status(404).json({ error: 'Logs directory not found.' });
        }

        await archive.finalize();
    } catch (error) {
        console.error('Error generating log export:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to export logs.' });
        }
    }
});

module.exports = router;
