const fs = require('fs');
const path = require('path');

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'];
const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');
const LOG_JSON = path.join(LOG_DIR, 'app.json');

function getTime() {
    return new Date().toISOString();
}

function logToFile(level, message) {
    const logMsg = `[${getTime()}] [${level.toUpperCase()}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logMsg, { encoding: 'utf8' });
}

function logToJson(level, message) {
    const entry = {
        timestamp: getTime(),
        level: level.toUpperCase(),
        message
    };
    let arr = [];
    try {
        if (fs.existsSync(LOG_JSON)) {
            const content = fs.readFileSync(LOG_JSON, 'utf8');
            arr = JSON.parse(content || '[]');
        }
    } catch {}
    arr.push(entry);
    fs.writeFileSync(LOG_JSON, JSON.stringify(arr, null, 2), { encoding: 'utf8' });
}

function logToConsole(level, message) {
    const logMsg = `[${getTime()}] [${level.toUpperCase()}] ${message}`;
    if (level === 'error') {
        console.error(logMsg);
    } else if (level === 'warn') {
        console.warn(logMsg);
    } else {
        console.log(logMsg);
    }
}

const logger = {};

LOG_LEVELS.forEach(level => {
    logger[level] = (msg) => {
        logToConsole(level, msg);
        logToFile(level, msg);
        logToJson(level, msg);
    };
});

module.exports = logger;
