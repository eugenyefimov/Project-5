-- Project-5 Database Initialization Script
-- Multi-cloud database schema for enterprise application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create application schema
CREATE SCHEMA IF NOT EXISTS project5;

-- Users table
CREATE TABLE IF NOT EXISTS project5.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Applications table for multi-cloud deployments
CREATE TABLE IF NOT EXISTS project5.applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cloud_provider VARCHAR(50) NOT NULL CHECK (cloud_provider IN ('aws', 'azure', 'gcp')),
    region VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'deploying', 'running', 'stopped', 'error')),
    version VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES project5.users(id)
);

-- Deployments table
CREATE TABLE IF NOT EXISTS project5.deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES project5.applications(id) ON DELETE CASCADE,
    environment VARCHAR(50) NOT NULL CHECK (environment IN ('development', 'staging', 'production')),
    version VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'deploying', 'deployed', 'failed', 'rolled_back')),
    deployment_config JSONB,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    deployed_by UUID REFERENCES project5.users(id)
);

-- Metrics table for monitoring data
CREATE TABLE IF NOT EXISTS project5.metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES project5.applications(id) ON DELETE CASCADE,
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(50),
    tags JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS project5.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES project5.users(id),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- API keys table for authentication
CREATE TABLE IF NOT EXISTS project5.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES project5.users(id) ON DELETE CASCADE,
    key_name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    permissions JSONB,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP WITH TIME ZONE
);

-- Infrastructure resources table
CREATE TABLE IF NOT EXISTS project5.infrastructure_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_type VARCHAR(100) NOT NULL,
    resource_name VARCHAR(255) NOT NULL,
    cloud_provider VARCHAR(50) NOT NULL CHECK (cloud_provider IN ('aws', 'azure', 'gcp')),
    region VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    configuration JSONB,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'error')),
    cost_per_hour DECIMAL(10,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON project5.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON project5.users(username);
CREATE INDEX IF NOT EXISTS idx_applications_cloud_provider ON project5.applications(cloud_provider);
CREATE INDEX IF NOT EXISTS idx_applications_status ON project5.applications(status);
CREATE INDEX IF NOT EXISTS idx_deployments_application_id ON project5.deployments(application_id);
CREATE INDEX IF NOT EXISTS idx_deployments_environment ON project5.deployments(environment);
CREATE INDEX IF NOT EXISTS idx_metrics_application_id ON project5.metrics(application_id);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON project5.metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON project5.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON project5.audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON project5.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_infrastructure_resources_cloud_provider ON project5.infrastructure_resources(cloud_provider);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION project5.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON project5.users 
    FOR EACH ROW EXECUTE FUNCTION project5.update_updated_at_column();

CREATE TRIGGER update_applications_updated_at 
    BEFORE UPDATE ON project5.applications 
    FOR EACH ROW EXECUTE FUNCTION project5.update_updated_at_column();

CREATE TRIGGER update_infrastructure_resources_updated_at 
    BEFORE UPDATE ON project5.infrastructure_resources 
    FOR EACH ROW EXECUTE FUNCTION project5.update_updated_at_column();

-- Create views for common queries
CREATE OR REPLACE VIEW project5.application_summary AS
SELECT 
    a.id,
    a.name,
    a.cloud_provider,
    a.region,
    a.status,
    a.version,
    a.created_at,
    u.username as created_by_username,
    COUNT(d.id) as total_deployments,
    MAX(d.completed_at) as last_deployment
FROM project5.applications a
LEFT JOIN project5.users u ON a.created_by = u.id
LEFT JOIN project5.deployments d ON a.id = d.application_id
GROUP BY a.id, a.name, a.cloud_provider, a.region, a.status, a.version, a.created_at, u.username;

CREATE OR REPLACE VIEW project5.deployment_history AS
SELECT 
    d.id,
    a.name as application_name,
    d.environment,
    d.version,
    d.status,
    d.started_at,
    d.completed_at,
    u.username as deployed_by_username,
    EXTRACT(EPOCH FROM (d.completed_at - d.started_at)) as duration_seconds
FROM project5.deployments d
LEFT JOIN project5.applications a ON d.application_id = a.id
LEFT JOIN project5.users u ON d.deployed_by = u.id
ORDER BY d.started_at DESC;

-- Grant permissions
GRANT USAGE ON SCHEMA project5 TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA project5 TO PUBLIC;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA project5 TO PUBLIC;

-- Insert initial data
INSERT INTO project5.users (email, username, password_hash, first_name, last_name, is_admin) 
VALUES 
    ('admin@project5.dev', 'admin', crypt('admin123', gen_salt('bf')), 'System', 'Administrator', true),
    ('user@project5.dev', 'user', crypt('user123', gen_salt('bf')), 'Test', 'User', false)
ON CONFLICT (email) DO NOTHING;

COMMIT;
