-- A single full-name field means a one-word name is stored with an empty last_name, so the lower bound of 1 must go.
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_last_name_check;
ALTER TABLE leads ADD CONSTRAINT leads_last_name_check CHECK (char_length(last_name) <= 80);
