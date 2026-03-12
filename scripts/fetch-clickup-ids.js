const token = 'pk_198142576_97RIUPIK6VMP6AHCV0JC2HF1CIKER45C';

async function fetchDetails() {
    const teamId = "90133089038";
    const spacesResponse = await fetch(`https://api.clickup.com/api/v2/team/${teamId}/space`, {
        headers: { Authorization: token }
    });
    const spacesData = await spacesResponse.json();

    for (const space of spacesData.spaces) {
        console.log(`Space: ${space.name} (${space.id})`);
        const listsResponse = await fetch(`https://api.clickup.com/api/v2/space/${space.id}/list`, {
            headers: { Authorization: token }
        });
        const listsData = await listsResponse.json();
        if (listsData.lists) {
            listsData.lists.forEach(l => console.log(`  List: ${l.name} (${l.id})`));
        }

        const foldersResponse = await fetch(`https://api.clickup.com/api/v2/space/${space.id}/folder`, {
            headers: { Authorization: token }
        });
        const foldersData = await foldersResponse.json();
        if (foldersData.folders) {
            for (const folder of foldersData.folders) {
                console.log(`  Folder: ${folder.name} (${folder.id})`);
                const fListsResponse = await fetch(`https://api.clickup.com/api/v2/folder/${folder.id}/list`, {
                    headers: { Authorization: token }
                });
                const fListsData = await fListsResponse.json();
                if (fListsData.lists) {
                    fListsData.lists.forEach(l => console.log(`    List: ${l.name} (${l.id})`));
                }
            }
        }
    }
}

fetchDetails();
