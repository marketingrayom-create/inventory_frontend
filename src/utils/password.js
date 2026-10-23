export function pendingPasswordRules(password = '') {
  return [
    [password.length >= 8 && password.length <= 12, 'Use 8–12 characters'],
    [/[A-Z]/.test(password), 'Add 1 capital letter (A–Z)'],
    [/[a-z]/.test(password), 'Add 1 small letter (a–z)'],
    [/[0-9]/.test(password), 'Add 1 number (0–9)'],
    [/[^A-Za-z0-9\s]/.test(password), 'Add 1 special character (e.g. @, #, !)'],
  ].filter(([valid]) => !valid).map(([, label]) => label);
}
