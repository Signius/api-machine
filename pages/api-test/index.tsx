import React from 'react'
import Link from 'next/link'
import styles from '../../styles/Home.module.css'
import ThemeToggle from '../../components/ui/ThemeToggle'

export default function ApiTestDashboard() {
    return (
        <div className={styles.container}>
            <ThemeToggle />
            <main className={styles.main}>
                <h1 className={styles.title}>
                    🧪 API Testing Dashboard
                </h1>

                <p className={styles.description}>
                    Test your API routes and Netlify functions
                </p>

                <div className={styles.grid}>
                    <Link href="/api-test/discord" className={styles.card}>
                        <h2>Discord APIs &rarr;</h2>
                        <p>Test Discord stats, webhooks, and integrations</p>
                    </Link>

                    <Link href="/api-test/github" className={styles.card}>
                        <h2>GitHub APIs &rarr;</h2>
                        <p>Test GitHub repos, actions, and workflows</p>
                    </Link>

                    <Link href="/docs" className={styles.card}>
                        <h2>Documentation &rarr;</h2>
                        <p>View API documentation and examples</p>
                    </Link>

                    <Link href="/" className={styles.card}>
                        <h2>Home &rarr;</h2>
                        <p>Return to the main dashboard</p>
                    </Link>
                </div>
            </main>

            <footer className={styles.footer}>
                <p>API Machine - Testing Interface</p>
            </footer>
        </div>
    )
} 