FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p /data
EXPOSE 5000
CMD ["uvicorn", "run:app", "--host", "0.0.0.0", "--port", "5000"]