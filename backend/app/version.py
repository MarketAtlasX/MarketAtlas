"""Version information for MarketAtlas backend."""
from __future__ import annotations

__version__ = '1.2.0'
__api_version__ = 'v1'
__build_date__ = '2026-09-30'

VERSION_INFO = {
    'app': 'MarketAtlas',
    'version': __version__,
    'api_version': __api_version__,
    'build_date': __build_date__,
    'python_min_version': '3.11',
}


def get_version_string() -> str:
    """Return formatted version string."""
    return f"MarketAtlas {__version__} (API {__api_version__})"
