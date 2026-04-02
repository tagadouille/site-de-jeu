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

/*-----------INSERTIONS---------------*/
INSERT INTO users (username, firstname, lastname, email, password, is_occupied, is_connected) VALUES
  ('john_doe', 'John', 'Doe', 'john@mail.com', 'password123', false, false),
  ('jane_smith', 'Jane', 'Smith', 'jane@mail.com', 'password456', true, false);


INSERT INTO games (name, description) VALUES
  ('Tic Tac Toe', 'A strategic  game where players must align their forms.'),
  ('Power 4', 'A strategic game where players use gravity to align their pieces.');


INSERT INTO fav_games (user_id, game_name) VALUES
  (1, 'Tic Tac Toe'),
  (1, 'Power 4'),
  (2, 'Tic Tac Toe');

INSERT INTO played_games (user_id, game_name, number_of_wins, number_of_matches) VALUES
  (1, 'Tic Tac Toe', 5, 10),
  (1, 'Power 4', 3, 8),
  (2, 'Tic Tac Toe', 2, 5);