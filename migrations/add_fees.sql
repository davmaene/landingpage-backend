-- Grille des frais académiques (modifiable depuis le backoffice)
-- `total` est recalculé par l'API comme la somme de `detailsFrais`.
CREATE TABLE IF NOT EXISTS fees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  promotion VARCHAR(60) NOT NULL DEFAULT '',
  faculte VARCHAR(255) NOT NULL DEFAULT '',
  detailsFrais TEXT NULL,
  tranches TEXT NULL,
  total INT NOT NULL DEFAULT 0,
  academicYear VARCHAR(20) NULL,
  sortOrder INT NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  INDEX fees_sort_order (sortOrder)
);
