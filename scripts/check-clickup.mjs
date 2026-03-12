import fs from 'fs';
import path from 'path';

async function checkClickUp() {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const token = envContent.match(/CLICKUP_API_TOKEN=(.+)/)?.[1];
    const listId = envContent.match(/CLICKUP_LIST_ID=(.+)/)?.[1];

    if (!token || !listId) {
        console.error('Missing config in .env.local');
        return;
    }

    console.log(`Checking List: ${listId.trim()}`);
    try {
        const response = await fetch(`https://api.clickup.com/api/v2/list/${listId.trim()}/task?subtasks=true`, {
            headers: {
                Authorization: token.trim()
            }
        });

        const data = await response.json();
        if (!response.ok) {
            console.error(`Status: ${response.status}`);
            console.log(JSON.stringify(data, null, 2));
            return;
        }

        console.log(`Found ${data.tasks?.length || 0} tasks.`);
        (data.tasks || []).forEach((t) => {
            console.log(`- [${t.id}] ${t.name} (Status: ${t.status?.status || 'N/A'})`);
        });
    } catch (err) {
        console.error(err);
    }
}

checkClickUp();
