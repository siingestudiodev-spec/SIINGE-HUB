-- SQL to create folders table and modify manufacturers table for folder functionality

-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add folder_id column to manufacturers table (nullable)
ALTER TABLE manufacturers
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_manufacturers_folder_id ON manufacturers(folder_id);

-- Optional: Insert a default folder for existing manufacturers
-- Uncomment the following lines if you want to create a "1st Batch" folder and assign existing manufacturers to it
/*
INSERT INTO folders (name) VALUES ('1st Batch')
ON CONFLICT DO NOTHING;

-- Get the ID of the newly created folder
-- Then you can update existing manufacturers:
-- UPDATE manufacturers SET folder_id = (SELECT id FROM folders WHERE name = '1st Batch' LIMIT 1) WHERE folder_id IS NULL;
*/