import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import * as projectApi from '../utils/projectApi';
import { socket } from '../utils/socket';
import '../styles/ProjectSelector.css';

interface ProjectSelectorProps {
  onProjectSelected: (sessionToken: string) => void;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({ onProjectSelected }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [currentToken, setCurrentToken] = useState('');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Load projects when component mounts
  useEffect(() => {
    loadProjects();

    // Listen for client count updates
    if (socket) {
      socket.on('clientsUpdated', (projectId: string, count: number) => {
        setProjects(prevProjects => 
          prevProjects.map(project => 
            project.id === projectId 
              ? { ...project, connectedClients: count } 
              : project
          )
        );
      });

      // Listen for project deleted
      socket.on('projectDeleted', (projectId: string) => {
        setProjects(prevProjects => 
          prevProjects.filter(project => project.id !== projectId)
        );
      });
    }

    return () => {
      if (socket) {
        socket.off('clientsUpdated');
        socket.off('projectDeleted');
      }
    };
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await projectApi.getProjects();
      if (response.success) {
        setProjects(response.data || []);
      } else {
        setError(response.message || 'Failed to load projects');
      }
    } catch (err) {
      setError('Error connecting to server. Please try again later.');
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProject = async (projectId: string) => {
    try {
      const response = await projectApi.joinProject(projectId);
      if (response.success && response.data?.token) {
        onProjectSelected(response.data.token);
      } else {
        setError(response.message || 'Failed to join project');
      }
    } catch (err) {
      setError('Error joining project. Please try again later.');
      console.error('Error joining project:', err);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      setCreateError('Project name is required');
      return;
    }

    setCreateError(null);
    
    try {
      const response = await projectApi.createProject(
        newProjectName.trim(), 
        newProjectDescription.trim() || null
      );
      
      if (response.success && response.data?.token) {
        onProjectSelected(response.data.token);
      } else {
        setCreateError(response.message || 'Failed to create project');
      }
    } catch (err) {
      setCreateError('Error creating project. Please try again later.');
      console.error('Error creating project:', err);
    }
  };

  const handleGenerateShareToken = async (projectId: string) => {
    try {
      const response = await projectApi.joinProject(projectId);
      if (response.success && response.data?.token) {
        setCurrentToken(response.data.token);
        setCurrentProjectId(projectId);
        setShowTokenModal(true);
      } else {
        setError(response.message || 'Failed to generate sharing token');
      }
    } catch (err) {
      setError('Error generating sharing token. Please try again later.');
      console.error('Error generating token:', err);
    }
  };

  const handleJoinWithToken = async () => {
    if (!tokenInput.trim()) {
      setJoinError('Please enter a session token');
      return;
    }

    setJoinLoading(true);
    setJoinError(null);

    try {
      // Try to get project info with this token
      projectApi.saveSessionToken(tokenInput.trim());
      const project = await projectApi.getCurrentProject(tokenInput.trim());
      
      if (project.success && project.data) {
        onProjectSelected(tokenInput.trim());
      } else {
        setJoinError(project.message || 'Invalid session token');
        projectApi.clearSessionToken();
      }
    } catch (err) {
      setJoinError('Error joining project. Please try again later.');
      projectApi.clearSessionToken();
      console.error('Error joining with token:', err);
    } finally {
      setJoinLoading(false);
    }
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(currentToken);
  };

  if (loading) {
    return (
      <div className="project-selector-container">
        <div className="project-selector loading">
          <div className="loading-content">Loading projects...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="project-selector-container">
      <div className="project-selector">
        <h2>Select a Project</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="projects-list">
          {projects.length === 0 ? (
            <div className="no-projects">
              No projects found. Create a new project to get started.
            </div>
          ) : (
            projects.map(project => (
              <div key={project.id} className="project-item">
                <div className="project-info">
                  <h3>{project.name}</h3>
                  {project.description && <p>{project.description}</p>}
                  <div className="project-meta">
                    <span>Created: {new Date(project.created_at).toLocaleString()}</span>
                    {project.connectedClients !== undefined && project.connectedClients > 0 && (
                      <span className="connected-users">
                        {project.connectedClients} active {project.connectedClients === 1 ? 'user' : 'users'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="project-actions">
                  <button onClick={() => handleSelectProject(project.id)}>
                    Open
                  </button>
                  <button 
                    className="share-button"
                    onClick={() => handleGenerateShareToken(project.id)}
                  >
                    Share
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        {showCreateForm ? (
          <div className="create-project-form">
            {createError && <div className="error-message">{createError}</div>}
            
            <div className="form-group">
              <label htmlFor="project-name">Project Name</label>
              <input
                id="project-name"
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="project-description">Description (optional)</label>
              <textarea
                id="project-description"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="Enter project description"
                rows={3}
              />
            </div>
            
            <div className="form-actions">
              <button 
                className="create-button"
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
              >
                Create Project
              </button>
              <button 
                className="cancel-button"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="form-group">
            <label htmlFor="token-input">Or Join with Token</label>
            <div style={{ display: 'flex' }}>
              <input
                id="token-input"
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste session token"
                style={{ flex: 1, marginRight: '8px' }}
              />
              <button 
                onClick={handleJoinWithToken}
                disabled={joinLoading || !tokenInput.trim()}
              >
                {joinLoading ? 'Joining...' : 'Join'}
              </button>
            </div>
            {joinError && <div className="error-message" style={{ marginTop: '8px' }}>{joinError}</div>}
          </div>
        )}
        
        <div className="project-selector-actions">
          {!showCreateForm && (
            <button 
              className="create-project-button"
              onClick={() => setShowCreateForm(true)}
            >
              Create New Project
            </button>
          )}
          <button 
            className="refresh-button"
            onClick={loadProjects}
          >
            Refresh List
          </button>
        </div>
      </div>
      
      {showTokenModal && (
        <div className="modal-overlay">
          <div className="share-modal">
            <h3>Share Project</h3>
            <p>Share this token with others to give them access to this project:</p>
            
            <div className="token-container">
              <input
                type="text"
                className="token-input"
                value={currentToken}
                readOnly
              />
              <button 
                className="copy-button"
                onClick={handleCopyToken}
              >
                Copy
              </button>
            </div>
            
            <div className="share-info">
              <p>Instructions for joining:</p>
              <ol>
                <li>Copy the token above</li>
                <li>Open GraphApp</li>
                <li>Select "Join with Token" and paste the token</li>
              </ol>
            </div>
            
            <button 
              className="close-button"
              onClick={() => setShowTokenModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSelector; 