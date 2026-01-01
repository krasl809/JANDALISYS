# Use official Python image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies (needed for some python packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from root to current workdir
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the server code
COPY server/ .

# Expose port 8000
EXPOSE 8000

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV DATABASE_URL=sqlite:///./data/cashflow.db

# Create data and storage directory
RUN mkdir -p /app/data /app/storage/archive

# Run uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
