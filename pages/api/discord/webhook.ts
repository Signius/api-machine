import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { type, data } = req.body

        // Handle Discord webhook events
        switch (type) {
            case 'MESSAGE_CREATE':
                console.log('📨 New message received:', data)
                // Process new message
                break

            case 'MEMBER_JOIN':
                console.log('👋 New member joined:', data)
                // Process new member
                break

            default:
                console.log('📡 Unhandled Discord event:', type, data)
        }

        res.status(200).json({ success: true })
    } catch (err) {
        console.error('❌ Webhook processing error:', err)
        res.status(500).json({ error: 'Internal Server Error' })
    }
} 