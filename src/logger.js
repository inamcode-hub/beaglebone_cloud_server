// src/logger.js

const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(
      ({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`
    )
  ),
  transports: [
    new transports.File({ filename: 'logs/combined.log', level: 'info' }),
    new transports.File({ filename: 'logs/errors.log', level: 'error' }),
    new transports.Console(),
  ],
});

module.exports = logger;
