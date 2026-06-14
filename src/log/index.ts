// Log a timestamped message. Accepts any value so callers can log
// strings, errors or structured objects.
function log(message: unknown): void {
    const timestamp = new Date().toISOString();
    if (typeof message === 'string') {
        console.log(`[${timestamp}] ${message}`);
    } else {
        console.log(`[${timestamp}]`, message);
    }
}

export { log };
