import argon2 from "argon2";

/**
 * Hash a password using argon2
 * @param {*} password the password to hash
 * @returns the hashed password
 */
export async function hashPassword(password) {
  const hash = await argon2.hash(password);
  return hash;
}

/**
 * Verify a password against a hash
 * @param {*} password the password to be verify (not hash)
 * @param {*} hash the hash
 * @returns true if the password is correct, false otherwise
 */
export async function verifyPassword(password, hash) {
  return await argon2.verify(hash, password);
}