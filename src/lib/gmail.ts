/**
 * Gmail API helper library
 */

export interface GmailMessage {
    id: string;
    threadId: string;
    subject: string;
    from: string;
    date: string;
    snippet: string;
    body: string;
    hasAttachments: boolean;
}

export async function listGmailMessages(accessToken: string, maxResults = 50) {
    // Reverted to broad stable query while investigating missing specific items
    const query = `after:2026/02/25`;
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(`Gmail API error: ${JSON.stringify(error)}`);
    }

    const data = await res.json();
    return data.messages || [];
}

export async function getGmailMessage(accessToken: string, id: string): Promise<GmailMessage> {
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch Gmail message ${id}`);
    }

    const msg = await res.json();
    const headers = msg.payload.headers;

    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(No Subject)';
    const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
    const date = headers.find((h: any) => h.name === 'Date')?.value || 'Unknown';

    // Simplified body extraction (handle text/plain)
    let body = msg.snippet;
    let hasAttachments = false;

    if (msg.payload.parts) {
        // Recursive check for attachments in parts
        const checkParts = (parts: any[]) => {
            for (const part of parts) {
                if (part.filename && part.filename.length > 0) {
                    hasAttachments = true;
                }
                if (part.parts) {
                    checkParts(part.parts);
                }
            }
        };
        checkParts(msg.payload.parts);

        const textPart = msg.payload.parts.find((p: any) => p.mimeType === 'text/plain');
        if (textPart && textPart.body.data) {
            body = Buffer.from(textPart.body.data, 'base64').toString();
        }
    } else if (msg.payload.body.data) {
        body = Buffer.from(msg.payload.body.data, 'base64').toString();
    }

    return {
        id: msg.id,
        threadId: msg.threadId,
        subject,
        from,
        date,
        snippet: msg.snippet,
        body,
        hasAttachments
    };
}

export async function refreshGoogleToken(refreshToken: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId!,
            client_secret: clientSecret!,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
    });

    if (!res.ok) {
        throw new Error('Failed to refresh Google token');
    }

    return await res.json();
}
export async function sendGmailReply(accessToken: string, threadId: string, to: string, subject: string, body: string, messageId: string) {
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const str = [
        `Content-Type: text/plain; charset="UTF-8"\r\n`,
        `MIME-Version: 1.0\r\n`,
        `Content-Transfer-Encoding: 7bit\r\n`,
        `to: ${to}\r\n`,
        `subject: ${utf8Subject}\r\n`,
        `In-Reply-To: ${messageId}\r\n`,
        `References: ${messageId}\r\n`,
        `Thread-Id: ${threadId}\r\n\r\n`,
        `${body}`
    ].join('');

    const encodedMail = Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            raw: encodedMail,
            threadId: threadId
        })
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(`Failed to send Gmail reply: ${JSON.stringify(err)}`);
    }

    return await res.json();
}
