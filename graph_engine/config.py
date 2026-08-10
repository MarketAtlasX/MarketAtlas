from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="GRAPH_ENGINE_")

    service_name: str = "graph_engine"
    host: str = "0.0.0.0"
    port: int = 8005
    ws_port: int = 8006
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password"
    log_level: str = "INFO"


settings = Settings()
