"""Test live API connectivity for all services and providers configured in .env.
Safe test: never prints secret keys or sensitive tokens.
"""

import asyncio
from pathlib import Path
import sys

# Ensure paths
_ROOT = Path(__file__).resolve().parents[2]
_BACKEND = Path(__file__).resolve().parents[1]
for _p in [str(_ROOT), str(_BACKEND)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

import httpx
from app.config import settings
from app.chatbot.llm.provider import get_llm, PerplexityLLM, HybridLLM, MarketAtlasLLM
from app.services.financial_data_service import FinancialDataService


def mask_key(k: str) -> str:
    if not k or len(k) < 6:
        return "[NOT SET / EMPTY]"
    return f"{k[:4]}...{k[-4:]} ({len(k)} chars)"


async def test_llm_providers():
    print("\n" + "=" * 60)
    print("  1. AI / LLM API CONNECTIVITY")
    print("=" * 60)

    # Check Perplexity
    print(f"\n[Perplexity API]")
    print(f"  Key Configured : {mask_key(settings.perplexity_api_key)}")
    print(f"  Model          : {settings.perplexity_model}")
    if settings.perplexity_api_key:
        try:
            llm = PerplexityLLM()
            resp = llm.generate("State in 5 words: Perplexity API connected and online.", temperature=0.1)
            print(f"  Connection     : SUCCESS [LIVE]")
            print(f"  Response       : {resp.strip()[:100]}")
        except Exception as e:
            print(f"  Connection     : FAILED -> {e}")
    else:
        print("  Connection     : SKIPPED (No API key)")

    # Check Gemini / Hybrid
    print(f"\n[Gemini API]")
    print(f"  Key Configured : {mask_key(settings.gemini_api_key)}")
    if settings.gemini_api_key:
        try:
            llm = HybridLLM()
            resp = llm.generate("Say 'MarketAtlas Gemini Connected' in 4 words.", temperature=0.1)
            print(f"  Connection     : SUCCESS [LIVE]")
            print(f"  Response       : {resp.strip()[:100]}")
        except Exception as e:
            print(f"  Connection     : FAILED -> {e}")
    else:
        print("  Connection     : SKIPPED (No API key)")

    # Check OpenAI
    print(f"\n[OpenAI API]")
    print(f"  Key Configured : {mask_key(settings.openai_api_key)}")
    if settings.openai_api_key:
        try:
            llm = MarketAtlasLLM()
            resp = llm.generate("Say 'MarketAtlas OpenAI Connected' in 4 words.", temperature=0.1)
            print(f"  Connection     : SUCCESS [LIVE]")
            print(f"  Response       : {resp.strip()[:100]}")
        except Exception as e:
            print(f"  Connection     : FAILED -> {e}")
    else:
        print("  Connection     : SKIPPED (No API key)")

    # Check Default LLM Hierarchy Dispatch
    print(f"\n[Primary System LLM Dispatcher (get_llm())]")
    try:
        default_llm = get_llm()
        print(f"  Active Provider: {default_llm.__class__.__name__}")
        resp = default_llm.generate("Ping test for MarketAtlas 3-Agent system.", temperature=0.1)
        print(f"  Dispatch Status: SUCCESS [LIVE]")
        print(f"  Sample Output  : {resp.strip()[:120]}...")
    except Exception as e:
        print(f"  Dispatch Status: FAILED -> {e}")


async def test_market_data_api():
    print("\n" + "=" * 60)
    print("  2. FINANCIAL & MARKET DATA CONNECTIVITY")
    print("=" * 60)
    print(f"  Alpha Vantage Key: {mask_key(settings.alpha_vantage_api_key)}")
    try:
        from app.services.financial_data_service import get_stock_quote
        quote = await get_stock_quote("AAPL")
        if quote and quote.get("price"):
            print(f"  Live Quote (AAPL): SUCCESS [LIVE] -> ${quote.get('price'):.2f} (Source: {quote.get('source')})")
        else:
            print(f"  Live Quote (AAPL): Offline / Default data")
    except Exception as e:
        print(f"  Market Data API  : {e}")


async def test_infrastructure():
    print("\n" + "=" * 60)
    print("  3. INFRASTRUCTURE & MICROSERVICES")
    print("=" * 60)

    # Redis
    print(f"\n[Redis Cache]")
    print(f"  URL: {settings.redis_url}")
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=2)
        await r.ping()
        await r.aclose()
        print(f"  Status: CONNECTED [ONLINE]")
    except Exception as e:
        print(f"  Status: OFFLINE / In-Memory Fallback Active ({e})")

    # PostgreSQL Database
    print(f"\n[PostgreSQL Database]")
    print(f"  Host: {settings.db_host}:{settings.db_port}, DB: {settings.db_name}, User: {settings.db_user}")
    try:
        from app.database import engine
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        print(f"  Status: CONNECTED [ONLINE]")
    except Exception as e:
        print(f"  Status: OFFLINE / Mock DB Fallback Active ({e})")

    # Microservices
    for svc_name, svc_url in [
        ("Dynamic World State", settings.world_state_url),
        ("Knowledge Graph Agent", settings.kg_agent_url),
        ("Market Agents Gateway", settings.market_agents_url),
        ("Episodic Memory", settings.memory_url),
    ]:
        print(f"\n[{svc_name}]")
        print(f"  URL: {svc_url}")
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{svc_url}/docs")
                print(f"  Status: CONNECTED [ONLINE] (HTTP {res.status_code})")
        except Exception:
            print(f"  Status: OFFLINE (Graceful fallback active)")


async def main():
    await test_llm_providers()
    await test_market_data_api()
    await test_infrastructure()
    print("\n" + "=" * 60)
    print("  API & ENVIRONMENT VERIFICATION COMPLETE")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
