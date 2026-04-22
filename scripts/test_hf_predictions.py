import json
from typing import Any, Dict

from gradio_client import Client


def preview(payload: Any) -> str:
    if isinstance(payload, dict):
        keys = list(payload.keys())[:8]
        return f"dict keys={keys}"
    if isinstance(payload, list):
        return f"list len={len(payload)} first_type={type(payload[0]).__name__ if payload else 'n/a'}"
    return str(type(payload).__name__)


def call_space(label: str, space: str, api_name: str, **kwargs: Any) -> Dict[str, Any]:
    print(f"\n=== {label} ===")
    print(f"space={space} api_name={api_name} kwargs={kwargs}")
    client = Client(space)
    result = client.predict(api_name=api_name, **kwargs)
    print(f"result preview: {preview(result)}")
    if isinstance(result, dict):
        print(json.dumps(result, indent=2)[:2000])
    elif isinstance(result, list) and result and isinstance(result[0], dict):
        print(json.dumps(result[0], indent=2)[:2000])
    else:
        print(str(result)[:2000])
    return {"ok": True, "result_type": type(result).__name__}


def main() -> None:
    tests = [
        ("NEM Solar Predictor A", "a13awd/solar-grid-data", "//refresh_solar_dashboard", {}),
        ("NEM Solar Predictor B", "a13awd/solar-grid-data", "//refresh_solar_dashboard_1", {}),
        (
            "NEM Daily Avg Load",
            "a13awd/avg-grid-predictions",
            "//load_daily_averages",
            {"state": "NSW1", "start_date": "2026-04-10", "end_date": "2026-04-19"},
        ),
        (
            "NEM Daily Avg Forecast",
            "a13awd/avg-grid-predictions",
            "//forecast_next_day_both",
            {"state": "NSW1", "as_of": "", "history_days": 120},
        ),
        ("NEM Spot Price Predictor", "a13awd/electricity_grid_model", "/refresh_dashboard_1", {}),
        ("NEM Renewables Predictor A", "a13awd/electricity-model-v2", "/refresh_dashboard_1", {}),
        ("NEM Renewables Predictor B", "a13awd/electricity-model-v2", "/refresh_dashboard", {}),
    ]

    summary = []
    for label, space, api_name, kwargs in tests:
        try:
            info = call_space(label, space, api_name, **kwargs)
            summary.append((label, "ok", info["result_type"]))
        except Exception as exc:
            summary.append((label, "error", str(exc)))
            print(f"ERROR: {exc}")

    print("\n=== SUMMARY ===")
    for label, status, detail in summary:
        print(f"{label}: {status} - {detail}")


if __name__ == "__main__":
    main()
