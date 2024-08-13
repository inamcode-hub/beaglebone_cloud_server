const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

const uploadDir = path.join(__dirname, '../../../uploads'); // Directory where data will be stored

// Ensure the uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const handleDataUpload = (req, res) => {
  const { data } = req.body;

  if (!data) {
    return res.status(400).json({ error: 'No data provided' });
  }

  const timestamp = new Date().toISOString();
  const filePath = path.join(uploadDir, `upload_${timestamp}.json`);

  // Save the data to a file
  fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
    if (err) {
      logger.error(`Failed to save uploaded data: ${err.message}`);
      return res.status(500).json({ error: 'Failed to save data' });
    }

    logger.info(`Data successfully uploaded and saved to ${filePath}`);
    res.status(201).json({ message: 'Data uploaded successfully' });
  });
};

module.exports = {
  handleDataUpload,
};
