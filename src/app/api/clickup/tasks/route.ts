import { NextResponse } from 'next/server'

export async function GET() {
    const token = process.env.CLICKUP_API_TOKEN
    const listId = process.env.CLICKUP_LIST_ID

    if (!token || !listId) {
        return NextResponse.json({ error: 'ClickUp config missing' }, { status: 500 })
    }

    try {
        const response = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task?subtasks=true`, {
            headers: {
                Authorization: token
            }
        })
        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch ClickUp tasks' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const token = process.env.CLICKUP_API_TOKEN
    const listId = process.env.CLICKUP_LIST_ID

    if (!token || !listId) {
        return NextResponse.json({ error: 'ClickUp config missing' }, { status: 500 })
    }

    try {
        const body = await request.json()
        const response = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
            method: 'POST',
            headers: {
                Authorization: token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: body.name,
                description: body.description,
                status: body.status || 'pendiente',
                priority: body.priority || 3
            })
        })
        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create ClickUp task' }, { status: 500 })
    }
}
