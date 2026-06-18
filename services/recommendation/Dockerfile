FROM python:3.12-slim
WORKDIR /app
COPY . /app
RUN pip install --no-cache-dir -r requirements.txt
EXPOSE 8003
CMD ["uvicorn", "services.recommendation.app:app", "--host", "0.0.0.0", "--port", "8003"]
