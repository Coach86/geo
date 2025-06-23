// Example Shopify App Integration with Mint AI Backend
// This demonstrates how a Shopify app would authenticate with the Mint AI backend

// In a real Shopify app, you would get the session token from Shopify App Bridge
import { authenticatedFetch } from '@shopify/app-bridge-utils';
import { getSessionToken } from '@shopify/app-bridge-utils';

const MINT_AI_API_URL = process.env.MINT_AI_API_URL || 'https://api.mintai.com';

class MintAIClient {
  constructor(app) {
    this.app = app; // Shopify App Bridge instance
    this.accessToken = null;
  }

  // Authenticate with Mint AI backend using Shopify session token
  async authenticate() {
    try {
      // Get session token from Shopify
      const sessionToken = await getSessionToken(this.app);
      
      // Exchange session token for Mint AI JWT
      const response = await fetch(`${MINT_AI_API_URL}/auth/shopify/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionToken: sessionToken
        })
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.user = data.user;

      return data;
    } catch (error) {
      console.error('Failed to authenticate with Mint AI:', error);
      throw error;
    }
  }

  // Make authenticated API calls to Mint AI
  async apiCall(endpoint, options = {}) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    const response = await fetch(`${MINT_AI_API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      }
    });

    // If token expired, refresh and retry
    if (response.status === 401) {
      await this.refreshToken();
      return this.apiCall(endpoint, options);
    }

    return response.json();
  }

  // Refresh JWT token
  async refreshToken() {
    const response = await fetch(`${MINT_AI_API_URL}/auth/shopify/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      }
    });

    if (!response.ok) {
      // Token refresh failed, re-authenticate
      return this.authenticate();
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    return data;
  }

  // Example API calls

  // Get user profile
  async getUserProfile() {
    return this.apiCall('/users/profile');
  }

  // Get organization details
  async getOrganization() {
    return this.apiCall('/users/organization');
  }

  // Create a new project
  async createProject(projectData) {
    return this.apiCall('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData)
    });
  }

  // Get all projects
  async getProjects() {
    return this.apiCall('/projects');
  }

  // Get batch results
  async getBatchResults(projectId) {
    return this.apiCall(`/projects/${projectId}/batch-results`);
  }
}

// Usage in a Shopify app component
export function useMintAI(app) {
  const [client, setClient] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const mintClient = new MintAIClient(app);
    
    // Authenticate on mount
    mintClient.authenticate()
      .then(() => {
        setClient(mintClient);
        setIsAuthenticated(true);
      })
      .catch(error => {
        console.error('Failed to initialize Mint AI client:', error);
      });
  }, [app]);

  return { client, isAuthenticated };
}

// Example React component
export function MintAIDashboard({ app }) {
  const { client, isAuthenticated } = useMintAI(app);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && client) {
      client.getProjects()
        .then(data => {
          setProjects(data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Failed to load projects:', error);
          setLoading(false);
        });
    }
  }, [isAuthenticated, client]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>Your Brand Intelligence Projects</h2>
      {projects.length === 0 ? (
        <p>No projects yet. Create your first project to get started.</p>
      ) : (
        <ul>
          {projects.map(project => (
            <li key={project.id}>
              {project.brandName} - {project.market}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}