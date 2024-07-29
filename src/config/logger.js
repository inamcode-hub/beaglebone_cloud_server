const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;

// Define custom log format
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

// Create a logger
const logger = createLogger({
  level: 'debug', // Set default level to debug to log all messages
  format: combine(timestamp(), logFormat),
  transports: [
    new transports.Console({
      format: combine(
        colorize(), // Use default colors for all levels
        timestamp(),
        logFormat
      ),
    }),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});

module.exports = logger;
