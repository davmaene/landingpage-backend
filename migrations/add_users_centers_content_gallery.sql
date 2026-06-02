-- Utilisateurs liés aux centres + personnel ; galerie sur les contenus
ALTER TABLE users
  ADD COLUMN centerId INT NULL AFTER facultyId,
  ADD COLUMN staffId INT NULL AFTER centerId;

ALTER TABLE users
  MODIFY COLUMN role ENUM('super_admin', 'faculty_publisher', 'center_publisher') NOT NULL DEFAULT 'faculty_publisher';

ALTER TABLE contents
  ADD COLUMN centerId INT NULL AFTER facultyId,
  ADD COLUMN galleryImages TEXT NULL AFTER coverImage;
