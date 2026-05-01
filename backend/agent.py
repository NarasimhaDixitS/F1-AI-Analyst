from openai import AsyncOpenAI
import json
import os
import re
import hashlib
from f1_service import F1DataService

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
XAI_BASE_URL = "https://api.x.ai/v1"
OPENAI_BASE_URL = "https://api.openai.com/v1"
RESPONSE_CACHE_DIR = os.path.join(os.path.dirname(__file__), "response_cache")
RESPONSE_CACHE_VERSION = "v1"

os.makedirs(RESPONSE_CACHE_DIR, exist_ok=True)

DRIVER_ALIASES = {
    "VER": ["ver", "verstappen", "max"],
    "HAM": ["ham", "hamilton", "lewis"],
    "NOR": ["nor", "norris", "lando"],
    "PIA": ["pia", "piastri", "oscar"],
    "LEC": ["lec", "leclerc", "charles"],
    "SAI": ["sai", "sainz", "carlos"],
    "RUS": ["rus", "russell", "george"],
    "PER": ["per", "perez", "checo"],
    "ALO": ["alo", "alonso", "fernando"],
    "STR": ["str", "stroll", "lance"],
    "GAS": ["gas", "gasly", "pierre"],
    "OCO": ["oco", "ocon", "esteban"],
    "ALB": ["alb", "albon", "alex"],
    "TSU": ["tsu", "tsunoda", "yuki"],
    "HUL": ["hul", "hulkenberg", "hulk", "nico"],
    "MAG": ["mag", "kevin", "magnussen"],
    "BOT": ["bot", "bottas", "valtteri"],
    "ZHO": ["zho", "zhou", "guanyu"],
    "RIC": ["ric", "ricciardo", "daniel"],
}

RACE_ALIASES = {
    "Bahrain Grand Prix": ["bahrain", "sakhir"],
    "Saudi Arabian Grand Prix": ["saudi", "jeddah"],
    "Australian Grand Prix": ["australia", "melbourne", "albert park"],
    "Japanese Grand Prix": ["japan", "suzuka"],
    "Chinese Grand Prix": ["china", "shanghai"],
    "Miami Grand Prix": ["miami"],
    "Emilia Romagna Grand Prix": ["imola", "emilia romagna"],
    "Monaco Grand Prix": ["monaco"],
    "Canadian Grand Prix": ["canada", "montreal", "gilles villeneuve"],
    "Spanish Grand Prix": ["spain", "barcelona", "catalunya"],
    "Austrian Grand Prix": ["austria", "red bull ring"],
    "British Grand Prix": ["britain", "british", "silverstone", "uk"],
    "Hungarian Grand Prix": ["hungary", "hungaroring"],
    "Belgian Grand Prix": ["belgium", "spa", "spa-francorchamps"],
    "Dutch Grand Prix": ["netherlands", "dutch", "zandvoort"],
    "Italian Grand Prix": ["italy", "monza"],
    "Azerbaijan Grand Prix": ["azerbaijan", "baku"],
    "Singapore Grand Prix": ["singapore", "marina bay"],
    "United States Grand Prix": ["usa", "austin", "cota", "united states"],
    "Mexico City Grand Prix": ["mexico", "mexico city"],
    "São Paulo Grand Prix": ["brazil", "sao paulo", "interlagos"],
    "Las Vegas Grand Prix": ["las vegas", "vegas"],
    "Qatar Grand Prix": ["qatar", "lusail"],
    "Abu Dhabi Grand Prix": ["abu dhabi", "yas marina"],
}


def _build_llm_providers():
    providers = []

    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if gemini_api_key:
        providers.append(
            {
                "name": "gemini",
                "client": AsyncOpenAI(
                    api_key=gemini_api_key,
                    base_url=os.getenv("GEMINI_BASE_URL", GEMINI_BASE_URL),
                ),
                "model": os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
            }
        )

    xai_api_key = os.getenv("XAI_API_KEY")
    if xai_api_key:
        providers.append(
            {
                "name": "xai",
                "client": AsyncOpenAI(
                    api_key=xai_api_key,
                    base_url=os.getenv("XAI_BASE_URL", XAI_BASE_URL),
                ),
                "model": os.getenv("XAI_MODEL", "grok-2-latest"),
            }
        )

    openai_api_key = os.getenv("OPENAI_API_KEY")
    if openai_api_key:
        providers.append(
            {
                "name": "openai",
                "client": AsyncOpenAI(
                    api_key=openai_api_key,
                    base_url=os.getenv("OPENAI_BASE_URL", OPENAI_BASE_URL),
                ),
                "model": os.getenv("OPENAI_MODEL", "gpt-4o"),
            }
        )

    return providers


LLM_PROVIDERS = _build_llm_providers()


def _extract_year(query: str):
    match = re.search(r"\b(20\d{2})\b", query)
    return int(match.group(1)) if match else None


def _extract_session(query_lower: str):
    if "quali" in query_lower:
        return "Qualifying"
    if "sprint" in query_lower:
        return "Sprint"
    if "race" in query_lower or "gp" in query_lower or "grand prix" in query_lower:
        return "Race"
    return "Race"


def _extract_race(query_lower: str):
    best_match = None
    best_len = -1
    for race_name, aliases in RACE_ALIASES.items():
        for alias in aliases:
            if re.search(rf"\b{re.escape(alias)}\b", query_lower):
                if len(alias) > best_len:
                    best_match = race_name
                    best_len = len(alias)
    return best_match


def _extract_driver_codes(query: str):
    q_lower = query.lower()
    hits = []

    # Full names/surnames
    for code, aliases in DRIVER_ALIASES.items():
        for alias in aliases:
            m = re.search(rf"\b{re.escape(alias)}\b", q_lower)
            if m:
                hits.append((m.start(), code))
                break

    # Explicit 3-letter codes from user query
    for m in re.finditer(r"\b[A-Za-z]{3}\b", query):
        token = m.group(0).upper()
        if token in DRIVER_ALIASES:
            hits.append((m.start(), token))

    hits.sort(key=lambda x: x[0])
    ordered_unique = []
    seen = set()
    for _, code in hits:
        if code not in seen:
            ordered_unique.append(code)
            seen.add(code)

    return ordered_unique[:2]


def _rule_based_extract(user_query: str):
    query_lower = user_query.lower()
    year = _extract_year(user_query)
    race = _extract_race(query_lower)
    session = _extract_session(query_lower)
    drivers = _extract_driver_codes(user_query)

    missing = []
    if len(drivers) < 2:
        missing.append("two driver names/codes")
    if not race:
        missing.append("race/place")
    if not year:
        missing.append("year")

    if missing:
        return None, missing

    return {
        "year": year,
        "race": race,
        "session": session,
        "driver1": drivers[0],
        "driver2": drivers[1],
    }, None


def _template_explanation(args, data_payload=None, head_to_head=None):
    driver1 = args['driver1']
    driver2 = args['driver2']
    race = args['race']
    year = args['year']
    session = args['session']

    base = (
        f"AI analysis is unavailable right now, so here is a deterministic summary for "
        f"{driver1} vs {driver2} at {race} {year} {session}."
    )

    summary_parts = []

    if head_to_head and isinstance(head_to_head, dict):
        q_winner = (head_to_head.get('summary') or {}).get('qualifying_winner')
        r_winner = (head_to_head.get('summary') or {}).get('race_winner')
        if q_winner:
            summary_parts.append(f"{q_winner} qualified ahead in qualifying")
        if r_winner:
            summary_parts.append(f"{r_winner} finished ahead in the race")

    if data_payload and data_payload.get('driver1') and data_payload.get('driver2'):
        lap1 = data_payload['driver1'].get('lap_time', '')
        lap2 = data_payload['driver2'].get('lap_time', '')
        if lap1 and lap2:
            summary_parts.append(f"fastest-lap benchmark: {driver1} {lap1} vs {driver2} {lap2}")

    if summary_parts:
        return base + " " + "; ".join(summary_parts) + "."
    return base


async def _chat_with_fallback(messages, tools=None, tool_choice=None):
    if not LLM_PROVIDERS:
        raise RuntimeError(
            "No LLM provider configured. Set GEMINI_API_KEY and/or XAI_API_KEY and/or OPENAI_API_KEY in backend/.env"
        )

    errors = []
    for provider in LLM_PROVIDERS:
        try:
            payload = {
                "model": provider["model"],
                "messages": messages,
            }
            if tools is not None:
                payload["tools"] = tools
            if tool_choice is not None:
                payload["tool_choice"] = tool_choice

            response = await provider["client"].chat.completions.create(**payload)
            return response, provider
        except Exception as exc:
            errors.append(f"{provider['name']}:{provider['model']} -> {exc}")

    raise RuntimeError("All LLM providers failed. " + " | ".join(errors))


def _normalize_request_for_cache(args: dict):
    return {
        "year": int(args.get("year")),
        "race": str(args.get("race", "")).strip(),
        "session": str(args.get("session", "")).strip(),
        "driver1": str(args.get("driver1", "")).strip().upper(),
        "driver2": str(args.get("driver2", "")).strip().upper(),
    }


def _build_response_cache_path(args: dict):
    normalized = _normalize_request_for_cache(args)
    key_raw = json.dumps(normalized, sort_keys=True, separators=(",", ":"))
    key_with_version = f"{RESPONSE_CACHE_VERSION}|{key_raw}"
    cache_id = hashlib.sha1(key_with_version.encode("utf-8")).hexdigest()
    return os.path.join(RESPONSE_CACHE_DIR, f"{cache_id}.json"), key_with_version


def _read_cached_response(args: dict):
    cache_path, cache_key = _build_response_cache_path(args)
    if not os.path.exists(cache_path):
        print(f"[response-cache] miss key={cache_key}")
        return None

    try:
        with open(cache_path, "r", encoding="utf-8") as f:
            payload = json.load(f)
        print(f"[response-cache] hit key={cache_key}")
        return payload
    except Exception as exc:
        print(f"[response-cache] read-failed key={cache_key} err={exc}")
        return None


def _write_cached_response(args: dict, payload: dict):
    cache_path, cache_key = _build_response_cache_path(args)
    try:
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(payload, f)
        print(f"[response-cache] stored key={cache_key}")
    except Exception as exc:
        print(f"[response-cache] write-failed key={cache_key} err={exc}")

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "compare_drivers",
            "description": "Compare telemetry and lap times between two drivers for a specific race session.",
            "parameters": {
                "type": "object",
                "properties": {
                    "year": {"type": "integer"},
                    "race": {"type": "string"},
                    "session": {"type": "string", "enum": ["Race", "Qualifying", "Sprint"]},
                    "driver1": {"type": "string", "description": "3-letter driver code (e.g., VER)"},
                    "driver2": {"type": "string", "description": "3-letter driver code (e.g., PER)"}
                },
                "required": ["year", "race", "session", "driver1", "driver2"]
            }
        }
    }
]

async def process_query(user_query: str):
    args = None
    extraction_provider = {"name": "rule_based", "model": "none"}
    extraction_error = None

    try:
        # 1. Intent & Entity Extraction via Tool Calling
        response, extraction_provider = await _chat_with_fallback(
            messages=[
                {
                    "role": "system",
                    "content": "You are an F1 Race Analyst. Extract entities to call the appropriate data tools. Use 3-letter driver acronyms.",
                },
                {"role": "user", "content": user_query},
            ],
            tools=TOOLS,
            tool_choice="auto",
        )

        message = response.choices[0].message

        if message.tool_calls:
            tool_call = message.tool_calls[0]
            args = json.loads(tool_call.function.arguments)
        else:
            extraction_error = "LLM did not return structured tool arguments"

    except Exception as exc:
        extraction_error = str(exc)

    # Rule-based fallback for missing/failed LLM extraction
    if args is None:
        parsed_args, missing = _rule_based_extract(user_query)
        if not parsed_args:
            return {
                "explanation": (
                    "Could not parse your query. Please include two drivers, race/place, and year. "
                    f"Missing: {', '.join(missing)}"
                ),
                "data": None,
                "results": [],
                "request": None,
                "provider": "rule_based",
                "model": "none",
                "type": "error",
                "cache": {"response": "miss"},
            }

        args = parsed_args
        extraction_provider = {"name": "rule_based", "model": "none"}

    cached_response = _read_cached_response(args)
    if cached_response is not None:
        cached_response["cache"] = {"response": "hit"}
        return cached_response

    try:
        # 2. Execute Backend Tool
        data_payload = None
        results_payload = []
        race_results_payload = []
        head_to_head_payload = {}
        race_timeline_payload = []
        team_battles_payload = []
        race_context_payload = {}
        speed_trap_payload = {}
        tyre_strategy_payload = {}

        request_sessions = {}

        def _get_request_session(session_name: str, weather: bool = False):
            key = (
                int(args["year"]),
                str(args["race"]).strip(),
                str(session_name).strip(),
                bool(weather),
            )
            if key not in request_sessions:
                request_sessions[key] = F1DataService.load_session(
                    year=args["year"],
                    race=args["race"],
                    session=session_name,
                    weather=weather,
                )
            return request_sessions[key]

        selected_session = _get_request_session(
            args["session"],
            weather=False,
        )
        race_session = _get_request_session("Race", weather=False)
        qualifying_session = _get_request_session("Qualifying", weather=False)

        data_payload = F1DataService.compare_drivers(
            year=args["year"],
            race=args["race"],
            session=args["session"],
            driver1=args["driver1"],
            driver2=args["driver2"],
            session_obj=selected_session,
        )
        results_payload = F1DataService.get_results(
            year=args["year"],
            race=args["race"],
            session=args["session"],
            session_obj=selected_session,
        )
        race_results_payload = F1DataService.get_results(
            year=args["year"],
            race=args["race"],
            session="Race",
            session_obj=race_session,
        )
        head_to_head_payload = F1DataService.get_head_to_head(
            year=args["year"],
            race=args["race"],
            driver1=args["driver1"],
            driver2=args["driver2"],
            quali_session=qualifying_session,
            race_session=race_session,
        )
        race_timeline_payload = F1DataService.get_race_timeline(
            year=args["year"],
            race=args["race"],
            race_session=race_session,
        )
        team_battles_payload = F1DataService.get_team_battles(
            year=args["year"],
            race=args["race"],
            session="Race",
            session_obj=race_session,
        )
        race_context_payload = F1DataService.get_race_context(
            year=args["year"],
            race=args["race"],
            race_session=race_session,
            quali_session=qualifying_session,
        )
        speed_trap_payload = F1DataService.get_speed_trap_summary(
            year=args["year"],
            race=args["race"],
            session=args["session"],
            driver1=args["driver1"],
            driver2=args["driver2"],
            session_obj=selected_session,
        )
        tyre_strategy_payload = F1DataService.get_tyre_strategy(
            year=args["year"],
            race=args["race"],
            driver1=args["driver1"],
            driver2=args["driver2"],
            race_session=race_session,
        )
    except Exception as exc:
        return {
            "explanation": f"Data fetch error: {exc}",
            "data": None,
            "results": [],
            "request": args,
            "provider": extraction_provider["name"],
            "model": extraction_provider["model"],
            "type": "error",
            "cache": {"response": "miss"},
        }

    # 3. Generate Explanation based on Data
    analysis_prompt = f"Analyze this telemetry data between {args['driver1']} and {args['driver2']}. Driver 1 time: {data_payload['driver1']['lap_time']}, Driver 2 time: {data_payload['driver2']['lap_time']}. Briefly explain where time was gained or lost based on typical F1 dynamics."

    analysis_provider = {"name": "template", "model": "none"}
    explanation_text = None
    analysis_error = None

    try:
        analysis_response, analysis_provider = await _chat_with_fallback(
            messages=[{"role": "user", "content": analysis_prompt}]
        )
        explanation_text = analysis_response.choices[0].message.content
    except Exception as exc:
        analysis_error = str(exc)
        explanation_text = _template_explanation(args, data_payload=data_payload, head_to_head=head_to_head_payload)

    if extraction_error and extraction_provider["name"] == "rule_based":
        explanation_text += " Query parsing used deterministic fallback extraction."

    response_payload = {
        "explanation": explanation_text,
        "data": data_payload,
        "results": race_results_payload or results_payload,
        "session_results": results_payload,
        "head_to_head": head_to_head_payload,
        "race_timeline": race_timeline_payload,
        "team_battles": team_battles_payload,
        "race_context": race_context_payload,
        "speed_trap": speed_trap_payload,
        "tyre_strategy": tyre_strategy_payload,
        "request": {
            "year": args.get("year"),
            "race": args.get("race"),
            "session": args.get("session"),
            "driver1": args.get("driver1"),
            "driver2": args.get("driver2"),
        },
        "provider": {
            "extraction": extraction_provider["name"],
            "analysis": analysis_provider["name"],
        },
        "model": {
            "extraction": extraction_provider["model"],
            "analysis": analysis_provider["model"],
        },
        "type": "comparison",
    }

    _write_cached_response(args, response_payload)
    response_payload["cache"] = {"response": "miss"}
    return response_payload
