import bcrypt

try:
    plain_password = "Admin@123"[:72]
    # تحويل النص إلى bytes
    password_bytes = plain_password.encode('utf-8')

    # تشفير كلمة المرور
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())

    # تحويل الناتج إلى نص
    hashed_password = hashed.decode('utf-8')
    print("Hashed Password:", hashed_password)
except Exception as e:
    print(f"Error hashing password: {e}")