"""
Authentication Module
User authentication, password hashing, and session management
"""

import hashlib
import secrets
import re
from datetime import datetime, timedelta


def hash_password(password):
    """
    Hash password using SHA-256 with salt
    
    Args:
        password (str): Plain text password
    
    Returns:
        str: Hashed password (salt + hash)
    """
    # Generate random salt
    salt = secrets.token_hex(16)
    
    # Hash password with salt
    password_hash = hashlib.sha256((salt + password).encode()).hexdigest()
    
    # Return salt + hash (separated by $)
    return f"{salt}${password_hash}"


def verify_password(password, stored_hash):
    """
    Verify password against stored hash
    
    Args:
        password (str): Plain text password to verify
        stored_hash (str): Stored hash (salt$hash format)
    
    Returns:
        bool: True if password matches, False otherwise
    """
    try:
        # Split salt and hash
        salt, hash_value = stored_hash.split('$')
        
        # Hash the input password with the same salt
        test_hash = hashlib.sha256((salt + password).encode()).hexdigest()
        
        # Compare
        return test_hash == hash_value
    
    except Exception:
        return False


def validate_email(email):
    """
    Validate email format
    
    Args:
        email (str): Email address
    
    Returns:
        tuple: (valid: bool, message: str)
    """
    # Basic email regex pattern
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    if not email:
        return (False, 'Email is required')
    
    if not re.match(pattern, email):
        return (False, 'Invalid email format')
    
    if len(email) > 255:
        return (False, 'Email too long (max 255 characters)')
    
    return (True, 'Valid email')


def validate_username(username):
    """
    Validate username
    
    Args:
        username (str): Username
    
    Returns:
        tuple: (valid: bool, message: str)
    """
    if not username:
        return (False, 'Username is required')
    
    if len(username) < 3:
        return (False, 'Username must be at least 3 characters')
    
    if len(username) > 50:
        return (False, 'Username too long (max 50 characters)')
    
    # Allow alphanumeric, underscore, hyphen
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        return (False, 'Username can only contain letters, numbers, underscore, and hyphen')
    
    return (True, 'Valid username')


def validate_password(password, retype_password=None):
    """
    Validate password strength
    
    Args:
        password (str): Password
        retype_password (str, optional): Password confirmation
    
    Returns:
        tuple: (valid: bool, message: str)
    """
    if not password:
        return (False, 'Password is required')
    
    if len(password) < 6:
        return (False, 'Password must be at least 6 characters')
    
    if len(password) > 128:
        return (False, 'Password too long (max 128 characters)')
    
    # Check if passwords match (if retype provided)
    if retype_password is not None and password != retype_password:
        return (False, 'Passwords do not match')
    
    # Optional: Add more strength checks
    # if not any(c.isupper() for c in password):
    #     return (False, 'Password must contain at least one uppercase letter')
    # if not any(c.isdigit() for c in password):
    #     return (False, 'Password must contain at least one number')
    
    return (True, 'Valid password')


def generate_session_token():
    """
    Generate secure session token
    
    Returns:
        str: Random session token
    """
    return secrets.token_urlsafe(32)


def validate_registration(username, email, password, retype_password):
    """
    Validate registration form data
    
    Args:
        username (str): Username
        email (str): Email
        password (str): Password
        retype_password (str): Password confirmation
    
    Returns:
        tuple: (valid: bool, errors: dict)
    """
    errors = {}
    
    # Validate username
    valid, msg = validate_username(username)
    if not valid:
        errors['username'] = msg
    
    # Validate email
    valid, msg = validate_email(email)
    if not valid:
        errors['email'] = msg
    
    # Validate password
    valid, msg = validate_password(password, retype_password)
    if not valid:
        errors['password'] = msg
    
    return (len(errors) == 0, errors)


def validate_login(identifier, password):
    """
    Validate login form data
    
    Args:
        identifier (str): Username or email
        password (str): Password
    
    Returns:
        tuple: (valid: bool, errors: dict)
    """
    errors = {}
    
    if not identifier:
        errors['identifier'] = 'Username or email is required'
    
    if not password:
        errors['password'] = 'Password is required'
    
    return (len(errors) == 0, errors)


def is_email(identifier):
    """
    Check if identifier is an email
    
    Args:
        identifier (str): Username or email
    
    Returns:
        bool: True if email, False if username
    """
    return '@' in identifier


if __name__ == "__main__":
    # Test password hashing
    password = "test123"
    hashed = hash_password(password)
    print(f"Password: {password}")
    print(f"Hashed: {hashed}")
    print(f"Verification: {verify_password(password, hashed)}")
    print(f"Wrong password: {verify_password('wrong', hashed)}")
    
    # Test validation
    print("\nValidation Tests:")
    print(validate_username("user123"))
    print(validate_email("test@example.com"))
    print(validate_password("password", "password"))
    print(validate_password("short", "short"))
