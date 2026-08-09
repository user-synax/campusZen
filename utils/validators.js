import mongoose from 'mongoose';

export function validateEmail(email) {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

export function validateUsername(username) {
  const re = /^[a-zA-Z0-9_]{3,20}$/;
  return re.test(username);
}

export function validatePassword(password) {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  return { valid: true, message: '' };
}

export function sanitizeString(str) {
  return str.trim().replace(/\s+/g, ' ');
}

export function validateObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

export function isValidObjectId(id) { 
  return mongoose.Types.ObjectId.isValid(id) 
}
