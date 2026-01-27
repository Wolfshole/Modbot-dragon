const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

// Beispiel: Bot-Status-Endpunkt
app.get('/api/bot/status', (req, res) => {
    // Hier könntest du den echten Bot-Status einfügen
    res.json({ status: 'online', users: 123 });
});

// Beispiel: Befehl an den Bot senden
app.post('/api/bot/command', (req, res) => {
    const { command } = req.body;
    // Hier würdest du den Befehl an den Bot weiterleiten
    res.json({ success: true, command });
});

// Beispiel: Authentifizierung (Dummy)
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    // Hier würdest du echte Authentifizierung machen
    if (username === 'admin' && password === 'pass') {
        res.json({ success: true, token: 'dummy-token' });
    } else {
        res.status(401).json({ success: false });
    }
});

app.listen(port, () => {
    console.log(`API läuft auf http://localhost:${port}`);
});
