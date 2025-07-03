import React, { useState } from 'react'
import Link from 'next/link'
import styles from '../../styles/Home.module.css'
import ThemeToggle from '../../components/ui/ThemeToggle'

export default function DiscordApiTest() {
    const [loading, setLoading] = useState(false)
    const [response, setResponse] = useState<any>(null)
    const [logs, setLogs] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)

    const testApi = async (endpoint: string, params?: any) => {
        setLoading(true)
        setError(null)
        setResponse(null)
        setLogs([])

        try {
            let url = `/api/discord/${endpoint}`
            if (params) {
                const searchParams = new URLSearchParams(params)
                url += `?${searchParams.toString()}`
            }

            const res = await fetch(url)
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'API request failed')
            }

            // Handle both old format (just stats) and new format (stats + logs)
            if (data.logs) {
                setResponse(data.stats)
                setLogs(data.logs)
            } else {
                setResponse(data)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }

    const testScenarios = [
        {
            name: '📊 Get Discord Stats',
            description: 'Fetch current Discord server statistics',
            action: () => testApi('stats', { guildId: process.env.NEXT_PUBLIC_DISCORD_GUILD_ID || '123456789' })
        },
        {
            name: '🔄 Get Stats with Backfill',
            description: 'Fetch Discord stats with historical backfill',
            action: () => testApi('stats', {
                guildId: process.env.NEXT_PUBLIC_DISCORD_GUILD_ID || '123456789',
                backfill: 'true',
                year: '2025'
            })
        },
        {
            name: '🔗 Test Webhook',
            description: 'Test Discord webhook endpoint',
            action: () => testApi('webhook', undefined)
        },
        {
            name: '✅ Validate Guild ID',
            description: 'Test guild ID validation',
            action: async () => {
                setLoading(true)
                setError(null)
                setResponse(null)

                try {
                    const res = await fetch('/api/utils/validation', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'discord_guild_id',
                            data: '123456789012345678'
                        })
                    })
                    const data = await res.json()
                    setResponse(data)
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'Unknown error')
                } finally {
                    setLoading(false)
                }
            }
        }
    ]

    return (
        <div className={styles.container}>
            <ThemeToggle />
            <main className={styles.main}>
                <h1 className={styles.title}>
                    🎮 Discord API Testing
                </h1>

                <p className={styles.description}>
                    Test Discord API endpoints and functions
                </p>

                <div style={{ marginBottom: '2rem' }}>
                    <Link href="/api-test" className={styles.backButton}>
                        ← Back to Testing Dashboard
                    </Link>
                </div>

                <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
                    {testScenarios.map((scenario, index) => (
                        <div key={index} className={styles.testCard}>
                            <h3>{scenario.name}</h3>
                            <p>{scenario.description}</p>
                            <button
                                onClick={scenario.action}
                                disabled={loading}
                                className={styles.button}
                            >
                                {loading ? 'Testing...' : 'Test'}
                            </button>
                        </div>
                    ))}
                </div>

                {error && (
                    <div className={styles.errorCard}>
                        <h3>❌ Error</h3>
                        <p>{error}</p>
                    </div>
                )}

                {logs.length > 0 && (
                    <div className={styles.responseCard}>
                        <h3>📋 Processing Logs</h3>
                        <div className={styles.logContainer}>
                            {logs.map((log, index) => (
                                <div key={index} className={styles.logLine}>
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {response && (
                    <div className={styles.responseCard}>
                        <h3>✅ Response</h3>
                        <pre className={styles.codeBlock}>
                            {JSON.stringify(response, null, 2)}
                        </pre>
                    </div>
                )}
            </main>
        </div>
    )
}  