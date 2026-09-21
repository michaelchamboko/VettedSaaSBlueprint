import bcrypt from "bcryptjs";

export async function verifyOwnerPassword(password: string) {
  const hashedPassword = process.env.APP_PASSWORD_HASH;
  if (!hashedPassword) return false;
  return bcrypt.compare(password, hashedPassword);
}

export async function hashOwnerPassword(password: string) {
  return bcrypt.hash(password, 12);
}
