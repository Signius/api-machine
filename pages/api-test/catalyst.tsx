import { useState } from 'react'
import Head from 'next/head'

export default function CatalystTest() {
    const [projectIds, setProjectIds] = useState('')
    const [statusData, setStatusData] = useState<any>(null)
    const [proposalsData, setProposalsData] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const checkStatus = async () => {
        if (!projectIds.trim()) {
            setError('Please enter project IDs')
            return
        }

        setLoading(true)
        setError('')

        try {
            const response = await fetch(`/api/catalyst/status?projectIds=${encodeURIComponent(projectIds)}`)
            const data = await response.json()

            if (response.ok) {
                setStatusData(data)
            } else {
                setError(data.error || 'Failed to check status')
            }
        } catch (err) {
            setError('Network error')
        } finally {
            setLoading(false)
        }
    }

    const fetchProposals = async () => {
        if (!projectIds.trim()) {
            setError('Please enter project IDs')
            return
        }

        setLoading(true)
        setError('')

        try {
            const response = await fetch(`/api/catalyst/proposals?projectIds=${encodeURIComponent(projectIds)}`)
            const data = await response.json()

            if (response.ok) {
                setProposalsData(data)
            } else {
                setError(data.error || 'Failed to fetch proposals')
            }
        } catch (err) {
            setError('Network error')
        } finally {
            setLoading(false)
        }
    }

    const triggerBackgroundJob = async () => {
        if (!projectIds.trim()) {
            setError('Please enter project IDs')
            return
        }

        setLoading(true)
        setError('')

        try {
            // This would be the Netlify function URL in production
            const functionUrl = `${process.env.NEXT_PUBLIC_NETLIFY_URL || 'http://localhost:8888'}/.netlify/functions/catalyst-proposals-background?projectIds=${encodeURIComponent(projectIds)}`

            const response = await fetch(functionUrl)
            const data = await response.json()

            if (response.ok) {
                alert(`Background job triggered successfully! Processed ${data.processed_count} projects.`)
            } else {
                setError(data.error || 'Failed to trigger background job')
            }
        } catch (err) {
            setError('Network error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <Head>
                <title>Catalyst Proposals API Test</title>
            </Head>

            <h1 className="text-3xl font-bold mb-6">Catalyst Proposals API Test</h1>

            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                    Project IDs (comma-separated):
                </label>
                <input
                    type="text"
                    value={projectIds}
                    onChange={(e) => setProjectIds(e.target.value)}
                    placeholder="e.g., 123456, 789012, 345678"
                    className="w-full p-2 border border-gray-300 rounded"
                />
            </div>

            <div className="flex gap-4 mb-6">
                <button
                    onClick={checkStatus}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                    Check Status
                </button>
                <button
                    onClick={fetchProposals}
                    disabled={loading}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                    Fetch Proposals
                </button>
                <button
                    onClick={triggerBackgroundJob}
                    disabled={loading}
                    className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                >
                    Trigger Background Job
                </button>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                    {error}
                </div>
            )}

            {statusData && (
                <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">Status Response</h2>
                    <pre className="bg-gray-100 p-4 rounded overflow-auto">
                        {JSON.stringify(statusData, null, 2)}
                    </pre>
                </div>
            )}

            {proposalsData && (
                <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">Proposals Response</h2>
                    <pre className="bg-gray-100 p-4 rounded overflow-auto">
                        {JSON.stringify(proposalsData, null, 2)}
                    </pre>
                </div>
            )}

            <div className="mt-8 p-4 bg-gray-100 rounded">
                <h3 className="text-lg font-semibold mb-2">API Endpoints:</h3>
                <ul className="list-disc list-inside space-y-1">
                    <li><code>GET /api/catalyst/status?projectIds=123,456</code> - Check status of proposals</li>
                    <li><code>GET /api/catalyst/proposals?projectIds=123,456</code> - Fetch full proposal data</li>
                    <li><code>GET /.netlify/functions/catalyst-proposals-background?projectIds=123,456</code> - Trigger background job</li>
                </ul>
            </div>
        </div>
    )
} 