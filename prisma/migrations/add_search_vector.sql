-- Add search vector column for full-text search
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS post_search_idx ON "Post" USING GIN(search_vector);

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_post_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.subtitle, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.excerpt, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update search vector on insert or update
DROP TRIGGER IF EXISTS post_search_update ON "Post";
CREATE TRIGGER post_search_update
  BEFORE INSERT OR UPDATE OF title, subtitle, excerpt
  ON "Post"
  FOR EACH ROW
  EXECUTE FUNCTION update_post_search_vector();

-- Update existing posts to populate search vectors
UPDATE "Post" SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(subtitle, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(excerpt, '')), 'C');
