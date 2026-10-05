-- The claim form asks for a region (the SharpSpring field 296 list) instead of a postcode.
-- The leads table has never held a production row; postcode stays for history only.
ALTER TABLE leads ADD COLUMN region text;
ALTER TABLE leads ALTER COLUMN postcode DROP NOT NULL;
