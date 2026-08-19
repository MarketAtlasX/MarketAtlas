"""Map a user query to a structured VisualizationIntent for the World Core.

The World Core is the holographic particle intelligence interface. This module
decides, from the raw text, what the frontend should show — a country focus, a
trade route, a conflict region, a risk heatmap, or a fully abstract field —
and how the camera should behave (pullback for global, zoom for country).
"""
import re
from typing import Optional

from ..models import IntentType, VisualMode, VisualizationIntent

ROUTE_SIGNALS = re.compile(
    r"\b(route|routes|corridor|corridors|shipping|sea lane|sea lanes|trade route|"
    r"trade routes|supply chain|supply chains|from .* to |between .* and .*|"
    r"pipeline|pipelines|flow|flows|import|export|connect|connected|link|links)\b",
    re.IGNORECASE,
)

CONFLICT_SIGNALS = re.compile(
    r"\b(conflict|war|tension|tensions|attack|attacks|military|strike|strikes|"
    r"strait|border|boundary|crisis|escalation|invasion|blockade|sanction|"
    r"missile|naval|fleet|deployment|proxy)\b",
    re.IGNORECASE,
)

RISK_SIGNALS = re.compile(
    r"\b(risk|risky|volatile|volatility|dangerous|threat|threats|hazard|"
    r"how risky|danger|vulnerab)\b",
    re.IGNORECASE,
)

NETWORK_SIGNALS = re.compile(
    r"\b(network|networks|graph|relationship|relationships|connection|connections|"
    r"linked|link|ties|alliance|alliances|web)\b",
    re.IGNORECASE,
)

MARKET_SIGNALS = re.compile(
    r"\b(market|stock|price|energy|oil|gold|commodity|commodities|sector|"
    r"forecast|etf|index|ticker|brent|crude|invest)\b",
    re.IGNORECASE,
)

ABSTRACT_SIGNALS = re.compile(
    r"\b(explain|define|what is|what are|how does|how do|why does|why is|who is|"
    r"meaning of|difference between|calculate|compute|solve|write|code|program|"
    r"function|python|javascript|typescript|algorithm|formula|equation|"
    r"mathematics|physics|chemistry|biology|philosophy|theory|relativity|quantum|"
    r"translate|summarize|steps? to|recipe|tutorial|guide|fourier|transform)\b",
    re.IGNORECASE,
)

COUNTRY_ALIASES = {
    "usa": "United States",
    "us": "United States",
    "america": "United States",
    "u.s.": "United States",
    "uk": "United Kingdom",
    "britain": "United Kingdom",
    "uae": "UAE",
    "emirates": "UAE",
    "south korea": "South Korea",
    "north korea": "North Korea",
    "saudi arabia": "Saudi Arabia",
    "saudi": "Saudi Arabia",
    "russia": "Russia",
    "china": "China",
    "india": "India",
    "japan": "Japan",
    "germany": "Germany",
    "france": "France",
    "iran": "Iran",
    "israel": "Israel",
    "turkey": "Turkey",
    "brazil": "Brazil",
    "canada": "Canada",
    "australia": "Australia",
    "mexico": "Mexico",
    "indonesia": "Indonesia",
    "taiwan": "Taiwan",
    "singapore": "Singapore",
    "netherlands": "Netherlands",
    "italy": "Italy",
    "spain": "Spain",
    "poland": "Poland",
    "ukraine": "Ukraine",
    "egypt": "Egypt",
    "nigeria": "Nigeria",
    "qatar": "Qatar",
    "kuwait": "Kuwait",
    "argentina": "Argentina",
    "chile": "Chile",
    "colombia": "Colombia",
    "pakistan": "Pakistan",
    "vietnam": "Vietnam",
    "thailand": "Thailand",
    "malaysia": "Malaysia",
    "philippines": "Philippines",
    "greece": "Greece",
    "sweden": "Sweden",
    "norway": "Norway",
    "switzerland": "Switzerland",
    "hong kong": "Hong Kong",
}

ENTITY_ALIASES = {
    "strait of hormuz": "Hormuz Strait",
    "hormuz": "Hormuz Strait",
    "taiwan strait": "Taiwan Strait",
    "suez canal": "Suez Canal",
    "red sea": "Red Sea",
    "south china sea": "South China Sea",
    "strait of malacca": "Malacca Strait",
    "black sea": "Black Sea",
    "persian gulf": "Persian Gulf",
    "arabian gulf": "Arabian Gulf",
    "middle east": "Middle East",
    "gulf region": "Middle East",
    "baltic": "Baltic",
    "arctic": "Arctic",
    "nato": "NATO",
    "europe": "Europe",
    "asia": "Asia",
    "africa": "Africa",
    "latin america": "Latin America",
    "north america": "North America",
}

# Keep a lightweight country list (name -> canonical) so we don't need to
# import the full API data module (which pulls in DB-backed services).
_COUNTRY_NAMES = list(COUNTRY_ALIASES.keys()) + [
    "United States", "United Kingdom", "South Korea", "North Korea",
    "Saudi Arabia", "Russia", "China", "India", "Japan", "Germany",
    "France", "Iran", "Israel", "Turkey", "Brazil", "Canada", "Australia",
    "Mexico", "Indonesia", "Taiwan", "Singapore", "Netherlands", "Italy",
    "Spain", "Poland", "Ukraine", "Egypt", "Nigeria", "Qatar", "Kuwait",
    "Argentina", "Chile", "Colombia", "Pakistan", "Vietnam", "Thailand",
    "Malaysia", "Philippines", "Greece", "Sweden", "Norway", "Switzerland",
    "Hong Kong", "UAE", "South Africa",
]


def _clean_name(raw: str) -> str:
    return raw.strip().strip('"').strip("'").strip(",").strip(".").strip("?")


def extract_entities(query: str) -> list[str]:
    q = query.lower()
    found: list[str] = []

    def _add(name: str) -> None:
        if not any(n.lower() == name.lower() for n in found):
            found.append(name)

    for alias, canonical in COUNTRY_ALIASES.items():
        if re.search(r"\b" + re.escape(alias) + r"\b", q):
            _add(canonical)

    for name in _COUNTRY_NAMES:
        if re.search(r"\b" + re.escape(name.lower()) + r"\b", q):
            _add(name)

    for alias, canonical in ENTITY_ALIASES.items():
        if re.search(r"\b" + re.escape(alias) + r"\b", q):
            _add(canonical)

    return found


def _pick_origin_destination(entities: list[str]) -> tuple[Optional[str], Optional[str]]:
    origin = None
    destination = None
    if len(entities) == 1:
        origin = entities[0]
    elif len(entities) >= 2:
        origin = entities[0]
        destination = entities[1]
    return origin, destination


def extract_visualization(query: str, intent: IntentType = None) -> VisualizationIntent:
    q = query.lower()
    entities = extract_entities(query)
    origin, destination = _pick_origin_destination(entities)

    has_route = bool(ROUTE_SIGNALS.search(q))
    has_conflict = bool(CONFLICT_SIGNALS.search(q))
    has_risk = bool(RISK_SIGNALS.search(q))
    has_network = bool(NETWORK_SIGNALS.search(q))
    has_abstract = bool(ABSTRACT_SIGNALS.search(q))

    caption = ""

    # Explicit from/to pair → ROUTE even without the word "route".
    from_to = re.search(r"\bfrom\s+(.+?)\s+to\s+(.+?)\b", q)
    if from_to and len(entities) >= 2:
        has_route = True
        origin = origin or _clean_name(from_to.group(1))
        destination = destination or _clean_name(from_to.group(2))

    # Abstract reasoning has priority when there are no geographic anchors —
    # a pure knowledge question should restructure the core, not simulate a map.
    if has_abstract and not entities:
        return VisualizationIntent(
            mode=VisualMode.ABSTRACT,
            scale="global",
            focus=[],
            transition="disintegrate",
            camera="orbit",
            palette="core",
            caption="Abstract intelligence field — particles restructured for reasoning.",
        )

    if has_route and entities:
        focus = [e for e in [origin, destination] if e] or [entities[0]]
        return VisualizationIntent(
            mode=VisualMode.ROUTE,
            scale="global",
            focus=focus,
            origin=origin,
            destination=destination,
            transition="particle_reform",
            camera="pullback",
            palette="ultron",
            caption=f"Flow path: {origin or 'origin'} → {destination or 'network'}",
        )

    if has_route and not entities:
        return VisualizationIntent(
            mode=VisualMode.ROUTE,
            scale="global",
            focus=[],
            transition="particle_reform",
            camera="pullback",
            palette="ultron",
            caption="Global route network — flow particles aligning across the World Core.",
        )

    if has_conflict and not entities:
        return VisualizationIntent(
            mode=VisualMode.CONFLICT,
            scale="global",
            focus=[],
            transition="disintegrate",
            camera="pullback",
            palette="risk",
            caption="Conflict field — red particle clusters mark stress regions.",
        )

    if has_conflict and entities:
        return VisualizationIntent(
            mode=VisualMode.CONFLICT,
            scale="regional",
            focus=entities,
            origin=origin,
            destination=destination,
            transition="particle_reform",
            camera="zoom_in",
            palette="risk",
            caption="Conflict field active — red particle clusters mark stress regions.",
        )

    if has_risk and entities:
        return VisualizationIntent(
            mode=VisualMode.RISK,
            scale="regional",
            focus=entities,
            origin=origin,
            destination=destination,
            transition="disintegrate",
            camera="zoom_in",
            palette="risk",
            caption="Risk heatfield — elevated zones glow hot.",
        )

    if has_network and entities:
        return VisualizationIntent(
            mode=VisualMode.NETWORK,
            scale="global",
            focus=entities,
            origin=origin,
            destination=destination,
            transition="particle_reform",
            camera="pullback",
            palette="ultron",
            caption="Knowledge web — particles aligning into connection geometry.",
        )

    if has_network and not entities:
        return VisualizationIntent(
            mode=VisualMode.NETWORK,
            scale="global",
            focus=[],
            transition="particle_reform",
            camera="pullback",
            palette="ultron",
            caption="Knowledge web — particle connections materializing.",
        )

    if has_risk and not entities:
        return VisualizationIntent(
            mode=VisualMode.RISK,
            scale="global",
            focus=[],
            transition="disintegrate",
            camera="pullback",
            palette="risk",
            caption="Risk heatfield — elevated zones glow across the core.",
        )

    if len(entities) == 1:
        return VisualizationIntent(
            mode=VisualMode.COUNTRY,
            scale="country",
            focus=entities,
            origin=entities[0],
            transition="particle_reform",
            camera="zoom_in",
            palette="ultron",
            caption=f"Focus: {entities[0]}",
        )

    if len(entities) > 1:
        return VisualizationIntent(
            mode=VisualMode.REGION,
            scale="regional",
            focus=entities,
            origin=origin,
            destination=destination,
            transition="particle_reform",
            camera="zoom_in",
            palette="ultron",
            caption="Regional field — multiple nodes active.",
        )

    if intent == IntentType.ATLAS:
        return VisualizationIntent(
            mode=VisualMode.ABSTRACT,
            scale="global",
            focus=[],
            transition="disintegrate",
            camera="orbit",
            palette="core",
            caption="Abstract reasoning — World Core in computation mode.",
        )

    return VisualizationIntent(
        mode=VisualMode.GLOBE,
        scale="global",
        focus=[],
        transition="particle_reform",
        camera="pullback",
        palette="ultron",
        caption="Global particle core online.",
    )