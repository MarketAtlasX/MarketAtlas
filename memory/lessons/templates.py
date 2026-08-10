from episodic_memory.models import Episode, OutcomeCategory


class LessonTemplates:
    def apply_market_lessons(self, episode: Episode) -> list[str]:
        lessons = []
        market_outcomes = [
            o for o in episode.outcomes if o.category == OutcomeCategory.MARKET
        ]
        if not market_outcomes:
            return lessons

        sectors = ", ".join(episode.sectors[:3]) or "broad markets"
        for outcome in market_outcomes[:2]:
            lessons.append(
                f"Geopolitical event affecting {sectors} shows {outcome.metric} "
                f"moves {outcome.direction} by {outcome.value}{outcome.unit}"
            )

        return lessons

    def apply_conflict_lessons(self, episode: Episode) -> list[str]:
        lessons = []
        military_events = [
            e for e in episode.timeline.events if e.event_type == "military"
        ]
        if not military_events:
            return lessons

        location = ", ".join(episode.locations[:2]) or "affected region"
        participants = ", ".join(p.name for p in episode.participants[:3])
        lessons.append(
            f"Armed conflict in {location}"
            + (f" involving {participants}" if participants else "")
            + " creates sustained volatility across related asset classes"
        )

        if episode.commodities:
            commodities = ", ".join(episode.commodities[:3])
            lessons.append(
                f"Conflict-related supply disruption of {commodities} "
                f"creates upward price pressure lasting weeks to months"
            )

        return lessons

    def apply_supply_lessons(self, episode: Episode) -> list[str]:
        lessons = []
        if not episode.commodities:
            return lessons

        for commodity in episode.commodities[:2]:
            lessons.append(
                f"Supply chain disruption for {commodity} originating from geopolitical "
                f"events triggers secondary effects in logistics, insurance, and alternative sourcing"
            )

        return lessons

    def apply_diplomatic_lessons(self, episode: Episode) -> list[str]:
        lessons = []
        diplomatic_events = [
            e for e in episode.timeline.events if e.event_type == "diplomatic"
        ]
        if not diplomatic_events:
            return lessons

        locations = ", ".join(episode.locations[:2]) or "region"
        lessons.append(
            f"Diplomatic engagement in {locations} serves as a leading indicator "
            f"for de-escalation and market relief rallies"
        )

        return lessons
