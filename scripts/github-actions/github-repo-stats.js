// github-repo-stats.js - GitHub Action Script
import fs from 'fs'
import path from 'path'

// ——— Config from ENV ———
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const OWNER = process.env.GITHUB_OWNER
const REPO = process.env.GITHUB_REPO
const OUTPUT_FILE = process.env.OUTPUT_FILE || path.resolve(process.cwd(), 'github-stats/repo-stats.json')

if (!GITHUB_TOKEN || !OWNER || !REPO) {
    console.error('❌ GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO must be set')
    process.exit(1)
}

const GITHUB_API_BASE = 'https://api.github.com'

async function fetchGitHubData(endpoint) {
    const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GitHub-Stats-Script'
        }
    })

    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} - ${response.statusText}`)
    }

    return response.json()
}

async function getRepositoryStats() {
    console.log(`📊 Fetching stats for ${OWNER}/${REPO}`)

    try {
        // Fetch repository data
        const repoData = await fetchGitHubData(`/repos/${OWNER}/${REPO}`)
        console.log(`✅ Repository data fetched`)

        // Fetch contributors
        const contributors = await fetchGitHubData(`/repos/${OWNER}/${REPO}/contributors`)
        console.log(`✅ Contributors data fetched (${contributors.length} contributors)`)

        // Fetch languages
        const languages = await fetchGitHubData(`/repos/${OWNER}/${REPO}/languages`)
        console.log(`✅ Languages data fetched`)

        // Fetch recent commits
        const commits = await fetchGitHubData(`/repos/${OWNER}/${REPO}/commits?per_page=100`)
        console.log(`✅ Recent commits data fetched (${commits.length} commits)`)

        // Fetch issues
        const issues = await fetchGitHubData(`/repos/${OWNER}/${REPO}/issues?state=all&per_page=100`)
        console.log(`✅ Issues data fetched (${issues.length} issues)`)

        // Fetch pull requests
        const pullRequests = await fetchGitHubData(`/repos/${OWNER}/${REPO}/pulls?state=all&per_page=100`)
        console.log(`✅ Pull requests data fetched (${pullRequests.length} PRs)`)

        // Fetch releases
        const releases = await fetchGitHubData(`/repos/${OWNER}/${REPO}/releases`)
        console.log(`✅ Releases data fetched (${releases.length} releases)`)

        // Calculate stats
        const now = new Date()
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`

        // Recent activity (last 30 days)
        const recentCommits = commits.filter(commit => {
            const commitDate = new Date(commit.commit.author.date)
            return commitDate >= lastMonth
        })

        const recentIssues = issues.filter(issue => {
            const issueDate = new Date(issue.created_at)
            return issueDate >= lastMonth
        })

        const recentPRs = pullRequests.filter(pr => {
            const prDate = new Date(pr.created_at)
            return prDate >= lastMonth
        })

        // Language stats
        const totalBytes = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0)
        const languagePercentages = {}
        Object.entries(languages).forEach(([lang, bytes]) => {
            languagePercentages[lang] = ((bytes / totalBytes) * 100).toFixed(2)
        })

        // Top contributors
        const topContributors = contributors.slice(0, 10).map(contributor => ({
            login: contributor.login,
            contributions: contributor.contributions,
            avatar_url: contributor.avatar_url,
            html_url: contributor.html_url
        }))

        // Compile stats
        const stats = {
            repository: {
                name: repoData.name,
                full_name: repoData.full_name,
                description: repoData.description,
                html_url: repoData.html_url,
                created_at: repoData.created_at,
                updated_at: repoData.updated_at,
                pushed_at: repoData.pushed_at,
                size: repoData.size,
                language: repoData.language,
                default_branch: repoData.default_branch,
                visibility: repoData.visibility,
                archived: repoData.archived,
                disabled: repoData.disabled
            },
            metrics: {
                stars: repoData.stargazers_count,
                watchers: repoData.watchers_count,
                forks: repoData.forks_count,
                open_issues: repoData.open_issues_count,
                network_count: repoData.network_count || 0,
                subscribers_count: repoData.subscribers_count || 0
            },
            activity: {
                total_commits: commits.length,
                recent_commits: recentCommits.length,
                total_issues: issues.length,
                recent_issues: recentIssues.length,
                total_pull_requests: pullRequests.length,
                recent_pull_requests: recentPRs.length,
                total_releases: releases.length,
                last_activity: repoData.pushed_at
            },
            contributors: {
                total: contributors.length,
                top_contributors: topContributors
            },
            languages: {
                raw: languages,
                percentages: languagePercentages,
                primary_language: repoData.language
            },
            period: {
                month: lastMonthKey,
                start_date: lastMonth.toISOString(),
                end_date: now.toISOString()
            },
            generated_at: now.toISOString()
        }

        // Load existing data if it exists
        let existingData = {}
        if (fs.existsSync(OUTPUT_FILE)) {
            existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'))
        }

        // Add current month's stats to historical data
        existingData[lastMonthKey] = {
            stars: stats.metrics.stars,
            forks: stats.metrics.forks,
            issues: stats.activity.total_issues,
            pull_requests: stats.activity.total_pull_requests,
            commits: stats.activity.recent_commits,
            contributors: stats.contributors.total,
            last_activity: stats.activity.last_activity
        }

        // Write both current stats and historical data
        const outDir = path.dirname(OUTPUT_FILE)
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true })
        }

        // Write current detailed stats
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(stats, null, 2))
        console.log(`✅ Current stats written to ${OUTPUT_FILE}`)

        // Write historical data to separate file
        const historicalFile = path.join(outDir, 'historical-stats.json')
        fs.writeFileSync(historicalFile, JSON.stringify(existingData, null, 2))
        console.log(`✅ Historical stats written to ${historicalFile}`)

        // Log summary
        console.log(`📈 Summary for ${lastMonthKey}:`)
        console.log(`  → Stars: ${stats.metrics.stars}`)
        console.log(`  → Forks: ${stats.metrics.forks}`)
        console.log(`  → Issues: ${stats.activity.total_issues}`)
        console.log(`  → PRs: ${stats.activity.total_pull_requests}`)
        console.log(`  → Recent Commits: ${stats.activity.recent_commits}`)
        console.log(`  → Contributors: ${stats.contributors.total}`)
        console.log(`  → Primary Language: ${stats.languages.primary_language}`)

        process.exit(0)
    } catch (error) {
        console.error('❌ Error fetching GitHub data:', error.message)
        process.exit(1)
    }
}

// Run the script
getRepositoryStats() 