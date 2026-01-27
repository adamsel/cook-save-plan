-- Add event fields to meal_plan_items for potlucks, guests, etc.
ALTER TABLE meal_plan_items
ADD COLUMN IF NOT EXISTS event_type TEXT CHECK (event_type IN ('potluck', 'guests', 'takeaway')),
ADD COLUMN IF NOT EXISTS guest_count INTEGER,
ADD COLUMN IF NOT EXISTS event_note TEXT;

-- Add comment for documentation
COMMENT ON COLUMN meal_plan_items.event_type IS 'Type of event: potluck, guests, or takeaway';
COMMENT ON COLUMN meal_plan_items.guest_count IS 'Number of guests - overrides household size for scaling';
COMMENT ON COLUMN meal_plan_items.event_note IS 'Optional note about the event (e.g., "Desert BBQ")';
