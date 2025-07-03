export interface GitHubRepo {
    id: number
    name: string
    full_name: string
    description: string
    html_url: string
    stargazers_count: number
    forks_count: number
    language: string
    updated_at: string
    created_at: string
}

export interface GitHubWorkflow {
    id: number
    name: string
    path: string
    state: string
    created_at: string
    updated_at: string
}

export interface GitHubActionRun {
    id: number
    name: string
    status: string
    conclusion: string
    created_at: string
    updated_at: string
    html_url: string
}

export class GitHubService {
    private token: string
    private baseUrl = 'https://api.github.com'

    constructor(token: string) {
        this.token = token
    }

    private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        })

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} - ${response.statusText}`)
        }

        return response.json() as T
    }

    async getRepository(owner: string, repo: string): Promise<GitHubRepo> {
        return this.request<GitHubRepo>(`/repos/${owner}/${repo}`)
    }

    async getRepositories(owner: string): Promise<GitHubRepo[]> {
        return this.request<GitHubRepo[]>(`/users/${owner}/repos`)
    }

    async getWorkflows(owner: string, repo: string): Promise<{ workflows: GitHubWorkflow[] }> {
        return this.request<{ workflows: GitHubWorkflow[] }>(`/repos/${owner}/${repo}/actions/workflows`)
    }

    async triggerWorkflow(owner: string, repo: string, workflowId: string, ref: string = 'main'): Promise<void> {
        await this.request(`/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`, {
            method: 'POST',
            body: JSON.stringify({ ref })
        })
    }

    async getWorkflowRuns(owner: string, repo: string, workflowId: string): Promise<{ workflow_runs: GitHubActionRun[] }> {
        return this.request<{ workflow_runs: GitHubActionRun[] }>(`/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs`)
    }

    async getLatestWorkflowRun(owner: string, repo: string, workflowId: string): Promise<GitHubActionRun> {
        const runs = await this.getWorkflowRuns(owner, repo, workflowId)
        return runs.workflow_runs[0]
    }

    async getUser(): Promise<any> {
        return this.request('/user')
    }

    async getOrganization(org: string): Promise<any> {
        return this.request(`/orgs/${org}`)
    }

    async getOrganizationRepos(org: string): Promise<GitHubRepo[]> {
        return this.request<GitHubRepo[]>(`/orgs/${org}/repos`)
    }

    async searchRepositories(query: string, sort: string = 'stars', order: string = 'desc'): Promise<any> {
        const params = new URLSearchParams({
            q: query,
            sort,
            order
        })
        return this.request(`/search/repositories?${params.toString()}`)
    }

    async getRepositoryStats(owner: string, repo: string): Promise<any> {
        const [repoData, contributors, languages] = await Promise.all([
            this.getRepository(owner, repo),
            this.request<any[]>(`/repos/${owner}/${repo}/contributors`),
            this.request<any>(`/repos/${owner}/${repo}/languages`)
        ])

        return {
            repository: repoData,
            contributors: contributors.length,
            languages,
            stats: {
                stars: repoData.stargazers_count,
                forks: repoData.forks_count,
                issues: 0, // Would need additional API call
                pullRequests: 0 // Would need additional API call
            }
        }
    }

    async validateToken(): Promise<boolean> {
        try {
            await this.getUser()
            return true
        } catch {
            return false
        }
    }
}

export const createGitHubService = (token: string) => new GitHubService(token) 