import React, { useState } from 'react'
import Link from 'next/link'
import styles from '../../styles/Home.module.css'
import ThemeToggle from '../../components/ui/ThemeToggle'

export default function GitHubApiTest() {
    const [loading, setLoading] = useState(false)
    const [response, setResponse] = useState(null)
    const [error, setError] = useState(null)

    const testApi = async (endpoint: string, params?: any) => {
        setLoading(true)
        setError(null)
        setResponse(null)

        try {
            let url = `/api/github/${endpoint}`
            if (params) {
                const searchParams = new URLSearchParams(params)
                url += `?${searchParams.toString()}`
            }

            const res = await fetch(url)
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'API request failed')
            }

            setResponse(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }

    const testPostApi = async (endpoint: string, body: any) => {
        setLoading(true)
        setError(null)
        setResponse(null)

        try {
            const res = await fetch(`/api/github/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'API request failed')
            }

            setResponse(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }

    const testScenarios = [
        {
            name: '📦 Get Repository Info',
            description: 'Fetch repository information',
            action: () => testApi('repos', {
                owner: 'vercel',
                repo: 'next.js'
            })
        },
        {
            name: '🚀 Trigger GitHub Action',
            description: 'Trigger a GitHub Actions workflow',
            action: () => testPostApi('actions', {
                owner: 'vercel',
                repo: 'next.js',
                workflow_id: 'ci.yml',
                ref: 'main'
            })
        },
        {
            name: '✅ Validate Repository Format',
            description: 'Test repository format validation',
            action: async () => {
                setLoading(true)
                setError(null)
                setResponse(null)

                try {
                    const res = await fetch('/api/utils/validation', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'github_repo',
                            data: 'vercel/next.js'
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
        },
        {
            name: '🔐 Test GitHub Auth',
            description: 'Validate GitHub token',
            action: async () => {
                setLoading(true)
                setError(null)
                setResponse(null)

                try {
                    const res = await fetch('/api/utils/auth', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            service: 'github',
                            token: 'test-token'
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
                    🐙 GitHub API Testing
                </h1>

                <p className={styles.description}>
                    Test GitHub API endpoints and functions
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