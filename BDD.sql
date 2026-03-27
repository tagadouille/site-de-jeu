/*-----------DROP TABLES---------------*/
DROP TABLE IF EXISTS `users`;

/*-----------TABLES---------------*/

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(255) NOT NULL,
  `firstname` VARCHAR(255) NOT NULL,
  `lastname` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `isOccuped` BOOLEAN NOT NULL,
  `isConnected` BOOLEAN NOT NULL,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS 'Games' (
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  PRIMARY KEY (`name`)
);

/*-----------ASSOCIATIONS---------------*/

CREATE TABLE IF NOT EXISTS 'FavGames' (
  `user_id` INT NOT NULL,
  `game_name` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`user_id`, `game_name`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`game_name`) REFERENCES `Games`(`name`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS 'PlayedGames' (
  `user_id` INT NOT NULL,
  `game_name` VARCHAR(255) NOT NULL,
  'NumberOfWins' INT NOT NULL,
  'NumberOfMatches' INT NOT NULL,
  PRIMARY KEY (`user_id`, `game_name`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`game_name`) REFERENCES `Games`(`name`) ON DELETE CASCADE
);