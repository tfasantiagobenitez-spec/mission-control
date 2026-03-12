
async function trigger() {
    try {
        const res = await fetch('http://localhost:3008/api/agents/email');
        const data = await res.json();
        console.log('Success:', data.success);
        console.log('Count:', data.emails?.length);
    } catch (e) {
        console.error('Error:', e.message);
    }
}
trigger();
