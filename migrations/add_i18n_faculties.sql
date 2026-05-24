-- Run once on existing MySQL database
ALTER TABLE faculties
  ADD COLUMN nameEn VARCHAR(200) NULL AFTER name,
  ADD COLUMN domaineEn VARCHAR(200) NULL AFTER domaine,
  ADD COLUMN descriptionEn LONGTEXT NULL AFTER description,
  ADD COLUMN deanEn VARCHAR(200) NULL AFTER dean,
  ADD COLUMN secretaryEn VARCHAR(200) NULL AFTER secretary;

ALTER TABLE filieres
  ADD COLUMN nameEn VARCHAR(200) NULL AFTER name,
  ADD COLUMN descriptionEn TEXT NULL AFTER description,
  ADD COLUMN durationEn VARCHAR(50) NULL AFTER duration,
  ADD COLUMN diplomaEn VARCHAR(120) NULL AFTER diploma;
