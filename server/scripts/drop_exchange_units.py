from core.database import engine
from sqlalchemy import text

def drop_table():
    with engine.connect() as conn:
        print("Dropping exchange_quote_units table...")
        conn.execute(text("DROP TABLE IF EXISTS exchange_quote_units CASCADE"))
        conn.commit()
        print("Table dropped.")

if __name__ == "__main__":
    drop_table()
