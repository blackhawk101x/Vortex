/**
 * wrapper for logging functionality
 */

let logger = null;

// magic: when we're in the main process, this uses the logger from winston
// (which appears to be a singleton). In the renderer processes we connect
// to the main-process logger through ipc
if (process.type === 'renderer') {
  const { remote } = require('electron');
  logger = remote.getGlobal('logger');
} else {
  logger = require('winston');
  global.logger = logger;
}

type Level = 'debug' | 'info' | 'warn' | 'error';

/**
 * log a message
 * 
 * @export
 * @param {Level} level The log level of the message: 'debug', 'info' or 'error'
 * @param {string} message The text message. Should contain no variable data
 * @param {Object} [metadata] Additional information about the error instance
 */
export function log(level: Level, message: string, metadata?: Object) {
  if (metadata === undefined) {
    logger.log(level, message);
  } else {
    logger.log(level, message, metadata);
  }
}