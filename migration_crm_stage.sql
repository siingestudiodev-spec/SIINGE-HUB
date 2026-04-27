-- Add crm_stage column to projects table
-- This field is written by the CRM whenever pipeline_stage changes on a linked project
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS crm_stage TEXT;
