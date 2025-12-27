-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    code VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add agent_id to contracts table
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_contracts_agent_id ON contracts(agent_id);
