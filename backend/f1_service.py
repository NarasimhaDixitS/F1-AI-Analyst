import fastf1
import pandas as pd
import numpy as np
import os
import threading

# Enable persistent caching
os.makedirs("cache", exist_ok=True)
fastf1.Cache.enable_cache("cache")

class F1DataService:
    _SESSION_CACHE = {}
    _SESSION_CACHE_LOCK = threading.Lock()
    TELEMETRY_MAX_POINTS = 1800

    STATUS_MAP = {
        '1': 'Track Clear',
        '2': 'Yellow Flag',
        '3': 'SC Deployed',
        '4': 'Safety Car',
        '5': 'Red Flag',
        '6': 'VSC Deployed',
        '7': 'VSC Ending',
    }

    @staticmethod
    def _safe_time_str(value):
        if value is None or pd.isna(value):
            return ""

        try:
            td = pd.to_timedelta(value)
            if pd.isna(td):
                return ""

            total_seconds = float(td.total_seconds())
            sign = "-" if total_seconds < 0 else ""
            total_seconds = abs(total_seconds)

            hours = int(total_seconds // 3600)
            minutes = int((total_seconds % 3600) // 60)
            seconds = total_seconds % 60

            if hours > 0:
                return f"{sign}{hours}:{minutes:02d}:{seconds:06.3f}"
            return f"{sign}{minutes}:{seconds:06.3f}"
        except Exception:
            return str(value)

    @staticmethod
    def _timedelta_to_seconds(value):
        if value is None or pd.isna(value):
            return None
        try:
            return float(value.total_seconds())
        except Exception:
            return None

    @staticmethod
    def _driver_label(row):
        if row is None:
            return ""
        if isinstance(row, dict):
            return row.get('Abbreviation') or row.get('BroadcastName') or row.get('FullName') or ""
        return row.get('Abbreviation', '') or row.get('BroadcastName', '') or row.get('FullName', '')

    @staticmethod
    def _get_driver_result_row(results_df, driver_code: str):
        if results_df is None or 'Abbreviation' not in results_df.columns:
            return None
        match = results_df[results_df['Abbreviation'] == driver_code]
        if match.empty:
            return None
        return match.iloc[0]

    @staticmethod
    def _build_session_cache_key(year: int, race: str, session: str, weather: bool = False):
        return (
            int(year),
            str(race).strip(),
            str(session).strip(),
            bool(weather),
        )

    @staticmethod
    def _downsample_aligned_telemetry(telemetry_df: pd.DataFrame, max_points: int = None):
        if telemetry_df is None or telemetry_df.empty:
            return {
                "distance": [],
                "speed": [],
                "throttle": [],
                "brake": [],
                "x": [],
                "y": [],
            }

        max_points = max_points or F1DataService.TELEMETRY_MAX_POINTS
        total_points = len(telemetry_df)
        if total_points <= 0:
            return {
                "distance": [],
                "speed": [],
                "throttle": [],
                "brake": [],
                "x": [],
                "y": [],
            }

        if total_points <= max_points:
            sampled = telemetry_df
        else:
            sample_idx = np.linspace(0, total_points - 1, num=max_points, dtype=int)
            sampled = telemetry_df.iloc[np.unique(sample_idx)]

        return {
            "distance": sampled['Distance'].fillna(0).tolist() if 'Distance' in sampled else [],
            "speed": sampled['Speed'].fillna(0).tolist() if 'Speed' in sampled else [],
            "throttle": sampled['Throttle'].fillna(0).tolist() if 'Throttle' in sampled else [],
            "brake": sampled['Brake'].fillna(0).tolist() if 'Brake' in sampled else [],
            "x": sampled['X'].fillna(0).tolist() if 'X' in sampled else [],
            "y": sampled['Y'].fillna(0).tolist() if 'Y' in sampled else [],
        }

    @staticmethod
    def load_session(year: int, race: str, session: str, weather: bool = False):
        cache_key = F1DataService._build_session_cache_key(year, race, session, weather)

        with F1DataService._SESSION_CACHE_LOCK:
            cached_session = F1DataService._SESSION_CACHE.get(cache_key)

        if cached_session is not None:
            print(f"[session-cache] hit key={cache_key}")
            return cached_session

        print(f"[session-cache] miss key={cache_key}")
        session_obj = fastf1.get_session(year, race, session)
        session_obj.load(telemetry=True, weather=weather, messages=False)

        with F1DataService._SESSION_CACHE_LOCK:
            F1DataService._SESSION_CACHE[cache_key] = session_obj

        return session_obj

    @staticmethod
    def compare_drivers(year: int, race: str, session: str, driver1: str, driver2: str, session_obj=None):
        if session_obj is None:
            session_obj = F1DataService.load_session(year, race, session)
        
        laps_d1 = session_obj.laps.pick_driver(driver1)
        laps_d2 = session_obj.laps.pick_driver(driver2)
        
        fastest_d1 = laps_d1.pick_fastest()
        fastest_d2 = laps_d2.pick_fastest()
        
        tel_d1 = fastest_d1.get_telemetry().add_distance()
        tel_d2 = fastest_d2.get_telemetry().add_distance()
        
        # Calculate Delta Time (simplified for JSON transport)
        # In production, use fastf1.utils.delta_time
        
        tel_payload_d1 = F1DataService._downsample_aligned_telemetry(tel_d1)
        tel_payload_d2 = F1DataService._downsample_aligned_telemetry(tel_d2)

        return {
            "driver1": {
                "name": driver1,
                "lap_time": F1DataService._safe_time_str(fastest_d1['LapTime']),
                "telemetry": tel_payload_d1,
            },
            "driver2": {
                "name": driver2,
                "lap_time": F1DataService._safe_time_str(fastest_d2['LapTime']),
                "telemetry": tel_payload_d2,
            }
        }

    @staticmethod
    def get_results(year: int, race: str, session: str, session_obj=None):
        if session_obj is None:
            session_obj = F1DataService.load_session(year, race, session)
        results = session_obj.results
        available_columns = [
            col for col in ['Abbreviation', 'Position', 'Time', 'Status', 'Points']
            if col in results.columns
        ]
        return results[available_columns].fillna("").to_dict(orient="records")

    @staticmethod
    def get_head_to_head(year: int, race: str, driver1: str, driver2: str, quali_session=None, race_session=None):
        payload = {
            "drivers": [driver1, driver2],
            "qualifying": None,
            "race": None,
            "summary": {},
        }

        # Qualifying H2H
        try:
            quali = quali_session or F1DataService.load_session(year, race, "Qualifying")
            q_results = quali.results

            q_row_d1 = F1DataService._get_driver_result_row(q_results, driver1)
            q_row_d2 = F1DataService._get_driver_result_row(q_results, driver2)

            q_lap_d1 = F1DataService._safe_time_str(quali.laps.pick_driver(driver1).pick_fastest()['LapTime'])
            q_lap_d2 = F1DataService._safe_time_str(quali.laps.pick_driver(driver2).pick_fastest()['LapTime'])

            payload["qualifying"] = {
                "driver1": {
                    "code": driver1,
                    "position": None if q_row_d1 is None else q_row_d1.get('Position', ''),
                    "lap_time": q_lap_d1,
                    "sector1": F1DataService._safe_time_str(quali.laps.pick_driver(driver1).pick_fastest().get('Sector1Time', '')),
                    "sector2": F1DataService._safe_time_str(quali.laps.pick_driver(driver1).pick_fastest().get('Sector2Time', '')),
                    "sector3": F1DataService._safe_time_str(quali.laps.pick_driver(driver1).pick_fastest().get('Sector3Time', '')),
                },
                "driver2": {
                    "code": driver2,
                    "position": None if q_row_d2 is None else q_row_d2.get('Position', ''),
                    "lap_time": q_lap_d2,
                    "sector1": F1DataService._safe_time_str(quali.laps.pick_driver(driver2).pick_fastest().get('Sector1Time', '')),
                    "sector2": F1DataService._safe_time_str(quali.laps.pick_driver(driver2).pick_fastest().get('Sector2Time', '')),
                    "sector3": F1DataService._safe_time_str(quali.laps.pick_driver(driver2).pick_fastest().get('Sector3Time', '')),
                },
            }
        except Exception:
            payload["qualifying"] = None

        # Race H2H
        try:
            race_session = race_session or F1DataService.load_session(year, race, "Race", weather=True)
            race_results = race_session.results

            r_row_d1 = F1DataService._get_driver_result_row(race_results, driver1)
            r_row_d2 = F1DataService._get_driver_result_row(race_results, driver2)

            payload["race"] = {
                "driver1": {
                    "code": driver1,
                    "position": None if r_row_d1 is None else r_row_d1.get('Position', ''),
                    "status": "" if r_row_d1 is None else r_row_d1.get('Status', ''),
                    "time": "" if r_row_d1 is None else F1DataService._safe_time_str(r_row_d1.get('Time', '')),
                    "points": "" if r_row_d1 is None else r_row_d1.get('Points', ''),
                },
                "driver2": {
                    "code": driver2,
                    "position": None if r_row_d2 is None else r_row_d2.get('Position', ''),
                    "status": "" if r_row_d2 is None else r_row_d2.get('Status', ''),
                    "time": "" if r_row_d2 is None else F1DataService._safe_time_str(r_row_d2.get('Time', '')),
                    "points": "" if r_row_d2 is None else r_row_d2.get('Points', ''),
                },
            }
        except Exception:
            payload["race"] = None

        # Summary
        q = payload.get("qualifying")
        r = payload.get("race")

        if q:
            p1 = q["driver1"].get("position")
            p2 = q["driver2"].get("position")
            if p1 not in [None, ""] and p2 not in [None, ""]:
                payload["summary"]["qualifying_winner"] = driver1 if float(p1) < float(p2) else driver2

        if r:
            rp1 = r["driver1"].get("position")
            rp2 = r["driver2"].get("position")
            if rp1 not in [None, ""] and rp2 not in [None, ""]:
                payload["summary"]["race_winner"] = driver1 if float(rp1) < float(rp2) else driver2

            pts1 = r["driver1"].get("points")
            pts2 = r["driver2"].get("points")
            try:
                payload["summary"]["points_delta"] = float(pts1) - float(pts2)
            except Exception:
                pass

        return payload

    @staticmethod
    def get_race_timeline(year: int, race: str, race_session=None):
        try:
            race_session = race_session or F1DataService.load_session(year, race, "Race")
            track_status = race_session.track_status
            if track_status is None or track_status.empty:
                return []

            timeline = []
            seen = set()
            for _, row in track_status.iterrows():
                status = str(row.get('Status', ''))
                key = (status, str(row.get('Time', '')))
                if key in seen:
                    continue
                seen.add(key)

                impact_map = {
                    '1': 'Neutral',
                    '2': 'Caution',
                    '3': 'Major Disruption',
                    '4': 'Major Disruption',
                    '5': 'Critical',
                    '6': 'Caution',
                    '7': 'Neutral',
                }
                event = F1DataService.STATUS_MAP.get(status, f"Status {status}")
                session_time = F1DataService._safe_time_str(row.get('Time', ''))
                timeline.append(
                    {
                        "time": session_time,
                        "session_time": session_time,
                        "status_code": status,
                        "status": event,
                        "event": event,
                        "meaning": "Race running normally" if status == '1' else event,
                        "impact": impact_map.get(status, "Info"),
                    }
                )

            return timeline[:40]
        except Exception:
            return []

    @staticmethod
    def get_race_context(year: int, race: str, race_session=None, quali_session=None):
        payload = {
            "winner": None,
            "podium": [],
            "pole_sitter": None,
            "fastest_lap": None,
            "weather": None,
        }

        try:
            race_session = race_session or F1DataService.load_session(year, race, "Race")
            results = race_session.results
            if results is not None and not results.empty:
                sorted_results = results.sort_values('Position')
                winner = sorted_results.iloc[0]
                payload["winner"] = {
                    "code": winner.get('Abbreviation', ''),
                    "position": winner.get('Position', ''),
                    "team": winner.get('TeamName', ''),
                }

                podium_rows = sorted_results.head(3)
                payload["podium"] = [
                    {
                        "code": r.get('Abbreviation', ''),
                        "position": r.get('Position', ''),
                        "team": r.get('TeamName', ''),
                    }
                    for _, r in podium_rows.iterrows()
                ]

            try:
                fastest_lap = race_session.laps.pick_fastest()
                if fastest_lap is not None:
                    payload["fastest_lap"] = {
                        "driver": fastest_lap.get('Driver', ''),
                        "lap_time": F1DataService._safe_time_str(fastest_lap.get('LapTime', '')),
                        "lap_number": int(fastest_lap.get('LapNumber')) if pd.notna(fastest_lap.get('LapNumber')) else None,
                    }
            except Exception:
                payload["fastest_lap"] = None

            try:
                weather = race_session.weather_data
                if weather is not None and not weather.empty:
                    payload["weather"] = {
                        "air_temp_avg": round(float(weather['AirTemp'].mean()), 1) if 'AirTemp' in weather else None,
                        "track_temp_avg": round(float(weather['TrackTemp'].mean()), 1) if 'TrackTemp' in weather else None,
                        "humidity_avg": round(float(weather['Humidity'].mean()), 1) if 'Humidity' in weather else None,
                        "rain_observed": bool(weather['Rainfall'].fillna(False).any()) if 'Rainfall' in weather else None,
                    }
            except Exception:
                payload["weather"] = None
        except Exception:
            pass

        try:
            quali = quali_session or F1DataService.load_session(year, race, "Qualifying")
            q_results = quali.results
            if q_results is not None and not q_results.empty:
                q_sorted = q_results.sort_values('Position')
                pole = q_sorted.iloc[0]
                payload["pole_sitter"] = {
                    "code": pole.get('Abbreviation', ''),
                    "position": pole.get('Position', ''),
                    "team": pole.get('TeamName', ''),
                }
        except Exception:
            payload["pole_sitter"] = None

        return payload

    @staticmethod
    def get_team_battles(year: int, race: str, session: str = "Race", session_obj=None):
        try:
            if session_obj is None:
                session_obj = F1DataService.load_session(year, race, session)
            results = session_obj.results
            if results is None or results.empty or 'TeamName' not in results.columns:
                return []

            battles = []
            grouped = results.groupby('TeamName')
            for team, group in grouped:
                g = group.sort_values('Position').head(2)
                if len(g) < 2:
                    continue
                d1 = g.iloc[0]
                d2 = g.iloc[1]
                battles.append(
                    {
                        "team": team,
                        "driver1": {
                            "code": d1.get('Abbreviation', ''),
                            "position": d1.get('Position', ''),
                            "points": d1.get('Points', ''),
                        },
                        "driver2": {
                            "code": d2.get('Abbreviation', ''),
                            "position": d2.get('Position', ''),
                            "points": d2.get('Points', ''),
                        },
                    }
                )

            return battles
        except Exception:
            return []

    @staticmethod
    def get_speed_trap_summary(year: int, race: str, session: str, driver1: str, driver2: str, session_obj=None):
        try:
            if session_obj is None:
                session_obj = F1DataService.load_session(year, race, session)
            lap1 = session_obj.laps.pick_driver(driver1).pick_fastest()
            lap2 = session_obj.laps.pick_driver(driver2).pick_fastest()

            tel1 = lap1.get_telemetry().add_distance()
            tel2 = lap2.get_telemetry().add_distance()

            max1 = float(tel1['Speed'].max()) if 'Speed' in tel1 else None
            max2 = float(tel2['Speed'].max()) if 'Speed' in tel2 else None

            faster = None
            if max1 is not None and max2 is not None:
                faster = driver1 if max1 > max2 else driver2

            return {
                "driver1": {
                    "code": driver1,
                    "max_speed_kph": round(max1, 1) if max1 is not None else None,
                },
                "driver2": {
                    "code": driver2,
                    "max_speed_kph": round(max2, 1) if max2 is not None else None,
                },
                "faster_driver": faster,
                "speed_delta_kph": round(abs(max1 - max2), 1) if max1 is not None and max2 is not None else None,
            }
        except Exception:
            return {
                "driver1": {"code": driver1, "max_speed_kph": None},
                "driver2": {"code": driver2, "max_speed_kph": None},
                "faster_driver": None,
                "speed_delta_kph": None,
            }

    @staticmethod
    def _build_driver_stints(session_obj, driver_code: str):
        try:
            laps = session_obj.laps.pick_driver(driver_code)
            if laps is None or laps.empty or 'Stint' not in laps.columns:
                return []

            stints = []
            grouped = laps.groupby('Stint', dropna=True)
            for stint_no, group in grouped:
                if group.empty:
                    continue
                start_lap = int(group['LapNumber'].min()) if 'LapNumber' in group else None
                end_lap = int(group['LapNumber'].max()) if 'LapNumber' in group else None
                compound = ''
                if 'Compound' in group:
                    non_null = group['Compound'].dropna()
                    compound = str(non_null.iloc[0]) if not non_null.empty else ''

                stints.append(
                    {
                        "stint": int(stint_no) if pd.notna(stint_no) else None,
                        "compound": compound or 'UNKNOWN',
                        "start_lap": start_lap,
                        "end_lap": end_lap,
                        "laps": (end_lap - start_lap + 1) if start_lap and end_lap else None,
                    }
                )

            return stints
        except Exception:
            return []

    @staticmethod
    def get_tyre_strategy(year: int, race: str, driver1: str, driver2: str, race_session=None):
        payload = {
            "driver1": {"code": driver1, "stints": []},
            "driver2": {"code": driver2, "stints": []},
            "recommended_strategy": None,
        }

        try:
            race_session = race_session or F1DataService.load_session(year, race, "Race")

            stints1 = F1DataService._build_driver_stints(race_session, driver1)
            stints2 = F1DataService._build_driver_stints(race_session, driver2)
            payload["driver1"]["stints"] = stints1
            payload["driver2"]["stints"] = stints2

            winner_code = None
            try:
                results = race_session.results
                if results is not None and not results.empty:
                    winner = results.sort_values('Position').iloc[0]
                    winner_code = winner.get('Abbreviation', None)
            except Exception:
                winner_code = None

            winner_stints = F1DataService._build_driver_stints(race_session, winner_code) if winner_code else []
            if winner_stints:
                compounds = [s.get('compound', 'UNKNOWN') for s in winner_stints]
                payload["recommended_strategy"] = {
                    "based_on_driver": winner_code,
                    "note": "Data-based baseline using race winner stint sequence.",
                    "compound_sequence": compounds,
                }
        except Exception:
            pass

        return payload
