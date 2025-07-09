// netlify/functions/catalyst-proposals-background.mts
import type { Context } from '@netlify/functions'
import { config as dotenv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

dotenv()

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Lido CSRF token for lidonation API calls
const LIDO_CSRF_TOKEN = process.env.LIDO_CSRF_TOKEN

if (!LIDO_CSRF_TOKEN) {
    throw new Error('Missing LIDO_CSRF_TOKEN environment variable')
}

const API_BASE = 'https://www.lidonation.com/api/catalyst-explorer'

/**
 * Fetches voting metrics for a single proposal by title & fund number.
 */
async function getProposalMetrics({ fundNumber, title, csrfToken }: {
    fundNumber: number | string
    title: string
    csrfToken: string
}) {
    const headers = {
        'Accept': 'application/json',
        'X-CSRF-TOKEN': csrfToken,
    }

    // 1) Get all funds, find the one matching "Fund ${fundNumber}"
    const fundsRes = await fetch(`${API_BASE}/funds`, { headers })
    if (!fundsRes.ok) throw new Error(`Failed to fetch funds: ${fundsRes.status}`)
    const { data: funds } = await fundsRes.json() as { data: any[] }
    const fund = funds.find((f: any) => f.title === `Fund ${fundNumber}`)
    if (!fund) throw new Error(`Fund ${fundNumber} not found`)
    const fundId = fund.id

    // 2) Search proposals in that fund for the exact title
    const searchTerm = encodeURIComponent(title)
    const propsRes = await fetch(
        `${API_BASE}/proposals?fund_id=${fundId}&search=${searchTerm}&per_page=5&page=1`,
        { headers }
    )
    if (!propsRes.ok) throw new Error(`Failed to search proposals: ${propsRes.status}`)
    const propsJson = await propsRes.json() as { data: any[] }
    const match = propsJson.data.find((p: any) => p.title === title)
    if (!match) throw new Error(`Proposal titled "${title}" not found in Fund ${fundNumber}`)
    const proposalId = match.id

    // 3) Fetch full proposal details by ID
    const detailRes = await fetch(`${API_BASE}/proposals/${proposalId}`, { headers })
    if (!detailRes.ok) throw new Error(`Failed to fetch proposal ${proposalId}: ${detailRes.status}`)
    const { data: detail } = await detailRes.json() as { data: any }

    const {
        yes_votes_count,
        no_votes_count,
        abstain_votes_count,
        unique_wallets
    } = detail

    return { proposalId, yes_votes_count, no_votes_count, abstain_votes_count, unique_wallets }
}

/**
 * Generates a URL-friendly slug from a project title.
 */
function generateUrlFromTitle(title: string): string {
    if (!title) return ''

    return title
        // Replace '&' with 'and'
        .replace(/&/g, 'and')
        // Replace '|' with 'or'
        .replace(/\|/g, 'or')
        // Replace '[' and ']' with empty string
        .replace(/[\[\]]/g, '')
        // Replace multiple spaces, hyphens, or underscores with single space
        .replace(/[\s\-_]+/g, ' ')
        // Remove special characters except spaces and alphanumeric
        .replace(/[^a-zA-Z0-9\s]/g, '')
        // Replace multiple spaces with single space
        .replace(/\s+/g, ' ')
        // Trim whitespace
        .trim()
        // Replace spaces with hyphens
        .replace(/\s/g, '-')
        // Convert to lowercase
        .toLowerCase()
}

/**
 * Extracts category slug from challenges data.
 */
function extractCategoryFromChallenges(challenges: any): string | null {
    if (!challenges || !challenges.title) {
        return null
    }

    // Remove the fund prefix (e.g., "F11: ") and clean up the title
    const categoryMatch = challenges.title.match(/^F\d+:\s*(.+)$/i)
    if (categoryMatch) {
        return generateUrlFromTitle(categoryMatch[1])
    }

    return null
}

/**
 * Extracts fund number from challenges data.
 */
function extractFundNumberFromChallenges(challenges: any): string | null {
    if (!challenges || !challenges.title) {
        return null
    }

    // Extract fund number from challenge title (e.g., "F11: OSDE: ...")
    const fundMatch = challenges.title.match(/^F(\d+):/i)
    if (fundMatch) {
        return fundMatch[1]
    }

    return null
}

/**
 * Generates the full Catalyst URL for a project.
 */
function generateCatalystUrl(title: string, fundNumber: string, categorySlug: string): string {
    if (!title || !fundNumber || !categorySlug) return ''

    const slug = generateUrlFromTitle(title)
    return `https://projectcatalyst.io/funds/${fundNumber}/${categorySlug}/${slug}`
}

/**
 * Retrieves the proposal details from Supabase.
 */
async function getProposalDetails(projectId: string) {
    console.log(`Getting proposal details for project ${projectId}`)

    const { data, error } = await supabase
        .from('proposals')
        .select(`
      id,
      title,
      budget,
      milestones_qty,
      funds_distributed,
      challenges(*),
      project_id
    `)
        .eq('project_id', projectId)
        .single()

    if (error) {
        console.error(`Error fetching proposal details for project ${projectId}:`, error)
        return null
    }

    return data
}

/**
 * Fetches milestone snapshot data.
 */
async function fetchSnapshotData(projectId: string) {
    try {
        const response = await axios.post(
            `${supabaseUrl}/rest/v1/rpc/getproposalsnapshot`,
            { _project_id: projectId },
            {
                headers: {
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'Content-Type': 'application/json',
                    'Content-Profile': 'public',
                    'x-client-info': 'supabase-js/2.2.3'
                }
            }
        )
        return response.data
    } catch (error) {
        console.error(`Error fetching snapshot data for project ${projectId}:`, error)
        return []
    }
}

export default async (req: Request, context: Context) => {
    const url = new URL(req.url)
    const projectIds = url.searchParams.get('projectIds') || ''

    if (!projectIds) {
        return new Response(
            JSON.stringify({ error: 'Missing projectIds parameter' }),
            {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            }
        )
    }

    // Parse comma-separated project IDs
    const PROJECT_IDS = projectIds.split(',').map(id => id.trim())

    try {
        console.log('Processing Catalyst data for projects:', PROJECT_IDS)

        const processedProjects = []

        for (const projectId of PROJECT_IDS) {
            const projectDetails = await getProposalDetails(projectId)
            if (!projectDetails) continue

            // Determine fund number from challenges
            let fundNumber = null
            if (projectDetails.challenges && Array.isArray(projectDetails.challenges) && projectDetails.challenges.length > 0) {
                fundNumber = extractFundNumberFromChallenges(projectDetails.challenges[0])
                if (fundNumber) {
                    console.log(`[Fund] Extracted fund number ${fundNumber} from challenges: ${projectDetails.challenges[0].title}`)
                }
            }

            // If not found in challenges, try to get fund number from category
            if (!fundNumber) {
                const category = projectDetails.challenges?.[0]?.title || ''
                const catMatch = category.match(/^F(\d+)/i)
                if (catMatch) {
                    fundNumber = catMatch[1]
                    console.log(`[Fund] Extracted fund number ${fundNumber} from category: ${category}`)
                }
            }

            // Last fallback: use all digits to the left of the last 5 digits of project_id
            if (!fundNumber && projectDetails.project_id) {
                const pidStr = String(projectDetails.project_id)
                if (pidStr.length > 5) {
                    fundNumber = pidStr.substring(0, pidStr.length - 5)
                    console.log(`[Fund] Extracted fund number ${fundNumber} from project_id: ${projectDetails.project_id}`)
                }
            }

            // Extract category from challenges data
            let categorySlug = null
            if (projectDetails.challenges && Array.isArray(projectDetails.challenges) && projectDetails.challenges.length > 0) {
                categorySlug = extractCategoryFromChallenges(projectDetails.challenges[0])
                if (categorySlug) {
                    console.log(`[Category] Extracted category slug "${categorySlug}" from challenges: ${projectDetails.challenges[0].title}`)
                }
            }

            // Generate the proper Catalyst URL with fund number and category
            let url = ''
            if (fundNumber && projectDetails.title && categorySlug) {
                url = generateCatalystUrl(projectDetails.title, fundNumber, categorySlug)
                console.log(`[URL] Generated Catalyst URL for "${projectDetails.title}": ${url}`)
            }

            // Fetch voting metrics if we have fund number and title
            let voting = null
            if (fundNumber && projectDetails.title) {
                console.log(`[Metrics] Fetching metrics for project "${projectDetails.title}" (ID: ${projectId})`)
                try {
                    const metrics = await getProposalMetrics({
                        fundNumber,
                        title: projectDetails.title,
                        csrfToken: LIDO_CSRF_TOKEN
                    })
                    voting = metrics
                    console.log(`[Metrics] Successfully fetched metrics for project "${projectDetails.title}"`)
                } catch (err) {
                    console.error(`[Metrics] Failed to fetch voting metrics for "${projectDetails.title}":`, err)
                }
            }

            // Fetch milestone data
            const snapshotData = await fetchSnapshotData(projectId)
            const milestonesCompleted = snapshotData.filter(
                (m: any) => m.som_signoff_count > 0 && m.poa_signoff_count > 0
            ).length

            // Prepare data for Supabase
            const supabaseData = {
                project_id: projectId,
                title: projectDetails.title,
                budget: projectDetails.budget,
                milestones_qty: projectDetails.milestones_qty,
                funds_distributed: projectDetails.funds_distributed,
                name: projectDetails.title,
                category: projectDetails.challenges?.[0]?.title || '',
                url: url,
                status: 'In Progress',
                finished: '',
                fund_number: fundNumber,
                category_slug: categorySlug,
                voting: voting,
                milestones_completed: milestonesCompleted,
                updated_at: new Date().toISOString()
            }

            // Upsert data to Supabase
            const { data, error } = await supabase
                .from('catalyst_proposals')
                .upsert(supabaseData, {
                    onConflict: 'project_id'
                })

            if (error) {
                console.error(`❌ Failed to save project ${projectId} to Supabase:`, error)
                continue
            }

            processedProjects.push(supabaseData)
            console.log(`✅ Successfully saved project ${projectId} to Supabase`)
        }

        console.log('✅ Successfully processed all Catalyst projects')

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Catalyst proposals fetched and saved successfully',
                processed_count: processedProjects.length,
                projects: processedProjects
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        )
    } catch (err) {
        console.error('❌ Failed to process Catalyst proposals:', err)
        return new Response(
            JSON.stringify({
                error: 'Internal Server Error',
                details: err instanceof Error ? err.message : 'Unknown error'
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        )
    }
} 