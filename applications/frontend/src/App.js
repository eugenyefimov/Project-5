// Project-5 Frontend Application
// React.js SPA with responsive design

import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [apiStatus, setApiStatus] = useState('Checking...');
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkApiHealth();
  }, []);

  const checkApiHealth = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/health`);
      const data = await response.json();
      
      if (response.ok) {
        setApiStatus('Connected ✅');
        setHealthData(data);
      } else {
        setApiStatus('Error ❌');
      }
    } catch (error) {
      console.error('API Health Check Error:', error);
      setApiStatus('Offline ❌');
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="hero-section">
          <h1>🚀 Project-5</h1>
          <p className="subtitle">Enterprise Multi-Cloud Infrastructure Portfolio</p>
          <div className="cloud-badges">
            <span className="badge aws">AWS</span>
            <span className="badge azure">Azure</span>
            <span className="badge gcp">GCP</span>
          </div>
        </div>

        <div className="status-section">
          <h2>System Status</h2>
          <div className="status-card">
            <div className="status-item">
              <span className="label">Backend API:</span>
              <span className={`status ${apiStatus.includes('✅') ? 'online' : 'offline'}`}>
                {apiStatus}
              </span>
            </div>
            
            {healthData && (
              <>
                <div className="status-item">
                  <span className="label">Environment:</span>
                  <span className="value">{healthData.environment}</span>
                </div>
                <div className="status-item">
                  <span className="label">Uptime:</span>
                  <span className="value">{formatUptime(healthData.uptime)}</span>
                </div>
                <div className="status-item">
                  <span className="label">Version:</span>
                  <span className="value">{healthData.version}</span>
                </div>
                <div className="status-item">
                  <span className="label">Last Check:</span>
                  <span className="value">{new Date(healthData.timestamp).toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="features-section">
          <h2>Architecture Highlights</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>🌐 Multi-Cloud</h3>
              <p>Deployed across AWS, Azure, and GCP for vendor diversity and optimal performance</p>
            </div>
            <div className="feature-card">
              <h3>🔄 DevOps Excellence</h3>
              <p>GitOps workflows with automated testing and zero-downtime deployments</p>
            </div>
            <div className="feature-card">
              <h3>📊 Observability</h3>
              <p>Comprehensive monitoring with Prometheus, Grafana, and distributed tracing</p>
            </div>
            <div className="feature-card">
              <h3>🔒 Security First</h3>
              <p>Zero-trust architecture with secrets management and policy enforcement</p>
            </div>
            <div className="feature-card">
              <h3>🚀 Scalable</h3>
              <p>Kubernetes orchestration with auto-scaling and load balancing</p>
            </div>
            <div className="feature-card">
              <h3>📈 Cost Optimized</h3>
              <p>Resource optimization strategies and multi-cloud cost management</p>
            </div>
          </div>
        </div>

        <div className="tech-stack">
          <h2>Technology Stack</h2>
          <div className="tech-categories">
            <div className="tech-category">
              <h4>Infrastructure</h4>
              <div className="tech-tags">
                <span>Terraform</span>
                <span>Kubernetes</span>
                <span>Helm</span>
                <span>Docker</span>
              </div>
            </div>
            <div className="tech-category">
              <h4>Applications</h4>
              <div className="tech-tags">
                <span>React.js</span>
                <span>Node.js</span>
                <span>Express</span>
                <span>PostgreSQL</span>
              </div>
            </div>
            <div className="tech-category">
              <h4>Monitoring</h4>
              <div className="tech-tags">
                <span>Prometheus</span>
                <span>Grafana</span>
                <span>ELK Stack</span>
                <span>Jaeger</span>
              </div>
            </div>
            <div className="tech-category">
              <h4>Security</h4>
              <div className="tech-tags">
                <span>Vault</span>
                <span>OPA</span>
                <span>Trivy</span>
                <span>Falco</span>
              </div>
            </div>
          </div>
        </div>

        <div className="actions-section">
          <button onClick={checkApiHealth} disabled={loading} className="refresh-btn">
            {loading ? 'Checking...' : 'Refresh Status'}
          </button>
          <a 
            href="https://github.com/eugenyefimov/Project-5" 
            target="_blank" 
            rel="noopener noreferrer"
            className="github-link"
          >
            View on GitHub
          </a>
        </div>

        <footer className="footer">
          <p>
            Built by <strong>Yevhen Yefimov</strong> | 
            <a href="https://yevhen.created.app" target="_blank" rel="noopener noreferrer">
              Portfolio
            </a>
          </p>
        </footer>
      </header>
    </div>
  );
}

export default App;
