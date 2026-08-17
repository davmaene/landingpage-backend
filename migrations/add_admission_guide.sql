CREATE TABLE IF NOT EXISTS admission_guide (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL DEFAULT 'Guide d''inscription',
  academicYear VARCHAR(20) NULL,
  introHtml TEXT NULL,
  contentHtml LONGTEXT NULL,
  contactPhones VARCHAR(255) NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);
