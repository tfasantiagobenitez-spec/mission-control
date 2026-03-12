const https = require('https');

const token = 'pk_198142576_97RIUPIK6VMP6AHCV0JC2HF1CIKER45C';
const listId = '901325944033';

const options = {
    hostname: 'api.clickup.com',
    port: 443,
    path: `/api/v2/list/${listId}/task?subtasks=true`,
    method: 'GET',
    headers: {
        'Authorization': token
    }
};

const req = https.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    let responseBody = '';

    res.on('data', (d) => {
        responseBody += d;
    });

    res.on('end', () => {
        const data = JSON.parse(responseBody);
        console.log('Tasks:', JSON.stringify(data.tasks.map(t => ({ id: t.id, name: t.name, status: t.status })), null, 2));
    });
});

req.on('error', (e) => {
    console.error('Error:', e);
});

req.end();
