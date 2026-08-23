// File Location: backend/routes/export.js
// File Name: export.js

const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const { authenticateAdmin } = require('../middleware/auth'); // Adjust auth middleware as needed
const SensorData = require('../models/SensorData'); // Example data model

router.get('/export-excel', authenticateAdmin, async (req, res) => {
    try {
        // 1. Fetch data from database
        const rawData = await SensorData.find({}).lean();

        // 2. Format data for Excel rows
        const formattedData = rawData.map(item => ({
            SensorID: item.sensor_id,
            Location: item.location_name,
            PM25: item.pm25,
            PM10: item.pm10,
            Timestamp: item.createdAt
        }));

        // 3. Create worksheet and workbook using 'xlsx'
        const worksheet = XLSX.utils.json_to_sheet(formattedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sensor Data");

        // 4. Generate buffer
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        // 5. Set response headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=pollution-data-report.xlsx');

        // Send buffer
        return res.send(excelBuffer);
    } catch (error) {
        console.error('Error generating Excel export:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to export data as Excel.' });
        }
    }
});

module.exports = router;
