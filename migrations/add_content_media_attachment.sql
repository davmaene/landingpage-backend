-- Pièce jointe média (YouTube, vidéo, PDF) sur les contenus
ALTER TABLE contents
  ADD COLUMN attachmentType ENUM('youtube', 'video', 'pdf') NULL AFTER galleryImages,
  ADD COLUMN attachmentUrl VARCHAR(500) NULL AFTER attachmentType,
  ADD COLUMN attachmentLayout ENUM('portrait', 'landscape', 'auto') NOT NULL DEFAULT 'auto' AFTER attachmentUrl;
