let clients = [];
const history = [];

const addClient = (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Send immediate history so they see past events
    res.write(`data: ${JSON.stringify({ type: 'history', data: history })}\n\n`);

    clients.push(res);

    req.on('close', () => {
        clients = clients.filter(c => c !== res);
    });
};

const sendEvent = (action, details, status = 'info') => {
    const logEntry = {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        action,
        details,
        status
    };
    
    history.push(logEntry);
    if (history.length > 100) history.shift(); // keep last 100

    clients.forEach(client => {
        client.write(`data: ${JSON.stringify({ type: 'new_log', data: logEntry })}\n\n`);
    });
    
    console.log(`[${status.toUpperCase()}] ${action}`);
};

module.exports = {
    addClient,
    sendEvent
};
