const http = require('http');

const data = JSON.stringify({
    weight: 85.5,
    unit: 'kg',
    notes: 'Test log from assistant verification',
    source: 'verification-script'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/weight',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
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
