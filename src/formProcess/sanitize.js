/**
 * This function verifies if the text contains only letters, numbers, 
 * underscores and hyphens, and if it is between 3 and 20 characters long
 * @param {*} text the text to verify
 * @returns a 400 error if the text contains invalid characters, otherwise it returns nothing
 */
export function verifyField(text) {

    return /^[a-zA-Z0-9_-]{3,20}$/.test(text);
}

/**
 * This function sanitizes a text by trimming it and removing
 *  any potentially dangerous characters
 * @param {*} value the text to sanitize
 * @returns the sanitized text
 */
export function sanitizeText(value) {
    return String(value ?? "")
        .trim()
        .replace(/[<>"'`\\]/g, "");
}