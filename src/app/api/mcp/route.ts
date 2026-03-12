// [COPY-PASTE-SAFE]
// Archivo: src/app/api/mcp/route.ts

import { NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

export async function GET() {
    try {
        // Path to mcp_config.json
        // Based on the user environment, it's in c:\Users\benit\.gemini\antigravity\mcp_config.json
        // We can use os.homedir() to make it slightly more portable but hardcoded for now as per request
        const configPath = path.join(os.homedir(), '.gemini', 'antigravity', 'mcp_config.json')

        const fileContent = await fs.readFile(configPath, 'utf8')
        const config = JSON.parse(fileContent)

        const servers = Object.entries(config.mcpServers || {}).map(([id, details]: [string, any]) => ({
            id,
            name: id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            status: 'connected', // Mocked as connected if present in config
            description: details.env?.DESCRIPTION || `MCP Server: ${id}`,
            metrics: {
                latency: '0ms',
                lastSync: 'Now'
            }
        }))

        return NextResponse.json({ success: true, servers })
    } catch (error: any) {
        console.error('Error reading MCP config:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to read MCP configuration' },
            { status: 500 }
        )
    }
}
