const https = require('https');

const token = 'pk_198142576_97RIUPIK6VMP6AHCV0JC2HF1CIKER45C';
const listId = '901325944033';

const data = JSON.stringify({
    name: "Final Verification Task",
    description: "Testing ClickUp integration fix with 'pendiente' status",
    status: "pendiente",
    priority: 3
});

const options = {
    hostname: 'api.clickup.com',
    port: 443,
    path: `/api/v2/list/${listId}/task`,
    method: 'POST',
    headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    let responseBody = '';

    res.on('data', (d) => {
        responseBody += d;
    });

    res.on('end', () => {
        console.log('Response Body:', responseBody);
    });
});

req.on('error', (e) => {
    console.error('Error:', e);
});

req.write(data);
req.end();
