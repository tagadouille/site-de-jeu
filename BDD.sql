/*-----------DROP TABLES---------------*/
DROP TABLE IF EXISTS played_games;
DROP TABLE IF EXISTS fav_games;
DROP TABLE IF EXISTS games;
DROP TABLE IF EXISTS users;

/*-----------TABLES---------------*/

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  firstname VARCHAR(255) NOT NULL,
  lastname VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  is_occupied BOOLEAN NOT NULL,
  is_connected BOOLEAN NOT NULL
);

CREATE TABLE games (
  name VARCHAR(255) PRIMARY KEY,
  description TEXT NOT NULL
);

/*-----------ASSOCIATIONS---------------*/

CREATE TABLE fav_games (
  user_id INTEGER NOT NULL,
  game_name VARCHAR(255) NOT NULL,
  PRIMARY KEY (user_id, game_name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (game_name) REFERENCES games(name) ON DELETE CASCADE
);

CREATE TABLE played_games (
  user_id INTEGER NOT NULL,
  game_name VARCHAR(255) NOT NULL,
  number_of_wins INTEGER NOT NULL,
  number_of_matches INTEGER NOT NULL,
  PRIMARY KEY (user_id, game_name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (game_name) REFERENCES games(name) ON DELETE CASCADE
);