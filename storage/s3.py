import json
from typing import Optional


class S3Store:
    def __init__(
        self,
        bucket: Optional[str] = None,
        endpoint_url: Optional[str] = None,
    ):
        from config import settings

        self.bucket = bucket or settings.s3_bucket
        self._client = None

    @property
    def client(self):
        if self._client is None:
            import boto3
            from botocore.config import Config
            from config import settings

            config = Config(retries=dict(max_attempts=3))
            self._client = boto3.client(
                "s3",
                endpoint_url=settings.s3_endpoint,
                config=config,
            )
            self._ensure_bucket()
        return self._client

    def _ensure_bucket(self):
        try:
            self.client.head_bucket(Bucket=self.bucket)
        except Exception:
            self.client.create_bucket(Bucket=self.bucket)

    def store_article(self, article_id: str, data: dict) -> str:
        key = f"articles/{article_id}.json"
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=json.dumps(data, default=str).encode(),
            ContentType="application/json",
        )
        return key

    def store_report(self, episode_id: str, report_type: str, data: dict) -> str:
        key = f"reports/{episode_id}/{report_type}.json"
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=json.dumps(data, default=str).encode(),
            ContentType="application/json",
        )
        return key

    def get_article(self, article_id: str) -> Optional[dict]:
        key = f"articles/{article_id}.json"
        try:
            response = self.client.get_object(Bucket=self.bucket, Key=key)
            return json.loads(response["Body"].read().decode())
        except Exception:
            return None

    def get_report(self, episode_id: str, report_type: str) -> Optional[dict]:
        key = f"reports/{episode_id}/{report_type}.json"
        try:
            response = self.client.get_object(Bucket=self.bucket, Key=key)
            return json.loads(response["Body"].read().decode())
        except Exception:
            return None

    def delete_article(self, article_id: str) -> bool:
        key = f"articles/{article_id}.json"
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
            return True
        except Exception:
            return False
