const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware'); // Assume exists
const { generateReport, downloadReport } = require('../controllers/complianceController');

/**
 * @route POST /api/compliance/generate
 * @desc Generate a new compliance report
 * @access Private (Requires organizational role)
 */
router.post('/generate', authenticateToken, async (req, res) => {
    try {
        const report = await generateReport(req.body, req.user);
        res.status(201).json(report);
    } catch (error) {
        console.error('Compliance generation error:', error);
        res.status(500).json({ message: error.message || 'Internal server error' });
    }
});

/**
 * @route GET /api/compliance/:id/download
 * @desc Download a generated report
 * @access Private
 */
router.get('/:id/download', authenticateToken, async (req, res) => {
    try {
        const { format } = req.query;
        const reportData = await downloadReport(req.params.id, req.user);

        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=report_${req.params.id}.csv`);
            // Assuming reportData has a toCSV method or we use the utility
            res.send(reportData.csvContent);
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=report_${req.params.id}.json`);
            res.send(JSON.stringify(reportData, null, 2));
        }
    } catch (error) {
        res.status(500).json({ message: 'Failed to download report' });
    }
});

module.exports = router;
