-- ============================================================================
-- Supabase SQL Schema for Favorability Hotspot Map
-- ============================================================================
-- This script creates the necessary database objects for the application.
-- Run this in your Supabase SQL Editor.
-- ============================================================================

-- Enable PostGIS extension for spatial operations
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create the votes table
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 5),
    geom GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create spatial index for fast spatial queries
CREATE INDEX votes_geom_idx ON votes USING GIST (geom);

-- Create index on created_at for sorting by time
CREATE INDEX votes_created_at_idx ON votes (created_at DESC);

-- Enable Row Level Security (RLS) for security
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public SELECT (anyone can view votes)
CREATE POLICY "Allow public SELECT on votes"
ON votes FOR SELECT
USING (true);

-- Policy: Allow public INSERT (anyone can submit a vote)
CREATE POLICY "Allow public INSERT on votes"
ON votes FOR INSERT
WITH CHECK (true);

-- Policy: Deny UPDATE (prevent modification of votes)
CREATE POLICY "Deny UPDATE on votes"
ON votes FOR UPDATE
USING (false);

-- Policy: Deny DELETE (prevent deletion of votes)
CREATE POLICY "Deny DELETE on votes"
ON votes FOR DELETE
USING (false);

-- ============================================================================
-- Verify PostGIS installation
-- ============================================================================
SELECT postgis_full_version();

-- ============================================================================
-- Example query to view all votes as GeoJSON
-- ============================================================================
-- This can be used in the frontend to fetch votes as GeoJSON:
-- SELECT json_build_object(
--     'type', 'FeatureCollection',
--     'features', json_agg(
--         json_build_object(
--             'type', 'Feature',
--             'geometry', ST_AsGeoJSON(geom)::json,
--             'properties', json_build_object(
--                 'id', id,
--                 'user_name', user_name,
--                 'score', score,
--                 'created_at', created_at
--             )
--         )
--     )
-- ) FROM votes;
