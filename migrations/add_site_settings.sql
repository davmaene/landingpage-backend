-- Paramètres globaux du site (thème de l'année, etc.)
CREATE TABLE IF NOT EXISTS site_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL,
  value TEXT NULL,
  label VARCHAR(255) NULL,
  description TEXT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  UNIQUE KEY site_settings_key (`key`)
);

INSERT IGNORE INTO site_settings (`key`, value, label, description, createdAt, updatedAt)
VALUES
  (
    'annual_theme',
    'L''intelligence artificielle au service de l''excellence académique',
    'Thème de l''année',
    'Thème académique annuel affiché sur la page d''accueil',
    NOW(),
    NOW()
  ),
  (
    'annual_theme_image',
    '',
    'Image du thème de l''année',
    'URL de l''image illustrant le thème de l''année',
    NOW(),
    NOW()
  );
