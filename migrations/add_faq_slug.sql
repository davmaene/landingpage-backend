ALTER TABLE faqs ADD COLUMN slug VARCHAR(300) NULL;
CREATE UNIQUE INDEX faqs_slug_unique ON faqs (slug);
