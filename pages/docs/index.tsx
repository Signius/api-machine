import React from 'react'
import Link from 'next/link'
import styles from '../../styles/Home.module.css'
import ThemeToggle from '../../components/ui/ThemeToggle'

export default function Documentation() {
    return (
        <div className={styles.container}>
            <ThemeToggle />
            <main className={styles.main}>
                <h1 className={styles.title}>
                    📚 API Documentation
                </h1>

                <p className={styles.description}>
                    Documentation and examples for API Machine endpoints
                </p>

                <div style={{ marginBottom: '2rem' }}>
                    <Link href="/api-test" className={styles.backButton}>
                        ← Back to Testing Dashboard
                    </Link>
                </div>

                <div className={styles.grid}>
                    <div className={styles.testCard}>
                        <h3>🎮 Discord API</h3>
                        <p>Endpoints for Discord server statistics, webhooks, and integrations</p>
                        <ul style={{ margin: '1rem 0', paddingLeft: '1.5rem', color: 'var(--text-secondary)' }}>
                            <li>GET /api/discord/stats - Fetch server statistics</li>
                            <li>POST /api/discord/webhook - Test webhook endpoint</li>
                            <li>Background stats collection</li>
                        </ul>
                    </div>

                    <div className={styles.testCard}>
                        <h3>🐙 GitHub API</h3>
                        <p>Endpoints for GitHub repositories, actions, and workflows</p>
                        <ul style={{ margin: '1rem 0', paddingLeft: '1.5rem', color: 'var(--text-secondary)' }}>
                            <li>GET /api/github/repos - Fetch repository info</li>
                            <li>POST /api/github/actions - Trigger workflows</li>
                            <li>Repository validation</li>
                        </ul>
                    </div>

                    <div className={styles.testCard}>
                        <h3>🔧 Utility APIs</h3>
                        <p>Helper endpoints for validation and authentication</p>
                        <ul style={{ margin: '1rem 0', paddingLeft: '1.5rem', color: 'var(--text-secondary)' }}>
                            <li>POST /api/utils/validation - Validate data formats</li>
                            <li>POST /api/utils/auth - Test authentication</li>
                            <li>Error handling utilities</li>
                        </ul>
                    </div>

                    <div className={styles.testCard}>
                        <h3>🚀 Netlify Functions</h3>
                        <p>Serverless functions for background processing</p>
                        <ul style={{ margin: '1rem 0', paddingLeft: '1.5rem', color: 'var(--text-secondary)' }}>
                            <li>Discord stats background collection</li>
                            <li>GitHub action triggers</li>
                            <li>Webhook processing</li>
                        </ul>
                    </div>
                </div>
            </main>

            <footer className={styles.footer}>
                <p>API Machine - Documentation</p>
            </footer>
        </div>
    )
} 