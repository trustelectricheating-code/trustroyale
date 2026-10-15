-- Members already gave their email on the members' page, so a claim may arrive without a phone number (region has been nullable since 002).
ALTER TABLE leads ALTER COLUMN phone DROP NOT NULL;
