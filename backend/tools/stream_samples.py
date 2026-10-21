"""
Stream Samples Tool for AeroCold.
Sends sample readings to the AeroCold WebSocket or HTTP ingest endpoint.
Supports 5 distinct operational scenarios across Units U1 through U5:
- U1: Door-Open Recovery (ends in Low risk, avoids false alarm fatigue)
- U2: Cooling Failure (escalates to High risk before 8°C with lead time)
- U3: Power Cut / Heatwave (Medium risk warning stage)
- U4: Optimal Thermostat Cycling (Steady Low risk 3.4-4.6°C)
- U5: Sensor Glitch Filtered (Spike ignored by causal median filter, stays Low risk)
"""

import argparse
import asyncio
import sys
import time
import httpx
import websockets

SAMPLE_U1_DOOR_OPEN = [
    "AC|U1|1760000000|4.1|30|0|1",
    "AC|U1|1760000060|4.2|30|0|1",
    "AC|U1|1760000120|6.4|30|1|1",
    "AC|U1|1760000180|7.1|30|1|1",
    "AC|U1|1760000240|6.2|30|0|1",
    "AC|U1|1760000300|5.5|30|0|1",
    "AC|U1|1760000360|4.8|30|0|1",
]

SAMPLE_U2_COOLING_FAILURE = [
    "AC|U2|1760000000|4.2|32|0|1",
    "AC|U2|1760000120|4.5|32|0|1",
    "AC|U2|1760000240|5.0|32|0|0",
    "AC|U2|1760000540|6.2|32|0|0",
    "AC|U2|1760000840|7.1|32|0|0",
    "AC|U2|1760001140|7.5|32|0|0",
]

SAMPLE_U3_POWER_CUT = [
    "AC|U3|1760000000|4.0|36|0|1",
    "AC|U3|1760000120|4.2|36|0|1",
    "AC|U3|1760000240|4.4|36|0|1",
    "AC|U3|1760000360|4.7|36|0|1",
    "AC|U3|1760000480|4.9|36|0|1",
    "AC|U3|1760000600|5.2|36|0|1",
    "AC|U3|1760000720|5.4|36|0|1",
    "AC|U3|1760000840|5.6|36|0|1",
]

SAMPLE_U4_NOMINAL_CYCLE = [
    "AC|U4|1760000000|4.5|24|0|1",
    "AC|U4|1760000120|4.2|24|0|1",
    "AC|U4|1760000240|3.8|24|0|1",
    "AC|U4|1760000360|3.5|24|0|0",
    "AC|U4|1760000480|3.7|24|0|0",
    "AC|U4|1760000600|4.0|24|0|1",
    "AC|U4|1760000720|3.9|24|0|1",
]

SAMPLE_U5_SENSOR_GLITCH = [
    "AC|U5|1760000000|4.1|26|0|1",
    "AC|U5|1760000120|4.2|26|0|1",
    "AC|U5|1760000240|7.8|26|0|1",
    "AC|U5|1760000360|4.1|26|0|1",
    "AC|U5|1760000480|4.0|26|0|1",
]

ALL_UNITS_STREAM = (
    SAMPLE_U1_DOOR_OPEN
    + SAMPLE_U2_COOLING_FAILURE
    + SAMPLE_U3_POWER_CUT
    + SAMPLE_U4_NOMINAL_CYCLE
    + SAMPLE_U5_SENSOR_GLITCH
)


async def stream_ws(url: str, lines: list, delay_sec: float = 0.5):
    print(f"Connecting to WebSocket: {url}")
    try:
        async with websockets.connect(url) as ws:
            for idx, line in enumerate(lines):
                print(f"-> Sending ({idx+1}/{len(lines)}): {line}")
                await ws.send(line)
                response = await ws.recv()
                print(f"<- Received: {response}\n")
                if delay_sec > 0 and idx < len(lines) - 1:
                    await asyncio.sleep(delay_sec)
    except Exception as e:
        print(f"WebSocket error: {e}. Falling back to HTTP POST...")
        stream_http("http://localhost:8000/api/ingest", lines, delay_sec)


def stream_http(url: str, lines: list, delay_sec: float = 0.5):
    print(f"Streaming via HTTP POST: {url}")
    with httpx.Client(timeout=10.0) as client:
        for idx, line in enumerate(lines):
            print(f"-> Sending ({idx+1}/{len(lines)}): {line}")
            resp = client.post(url, json={"data": line})
            print(f"<- Status {resp.status_code}: {resp.text}\n")
            if delay_sec > 0 and idx < len(lines) - 1:
                time.sleep(delay_sec)


def main():
    parser = argparse.ArgumentParser(description="Stream sensor samples to AeroCold server")
    parser.add_argument(
        "--mode",
        choices=["u1", "u2", "u3", "u4", "u5", "all", "both", "file"],
        default="all",
        help="Sample sequence to send (u1..u5 or all)",
    )
    parser.add_argument("--url", default="ws://localhost:8000/ws/ingest", help="Ingest WebSocket URL")
    parser.add_argument("--delay", type=float, default=0.4, help="Delay between readings in seconds")
    parser.add_argument("--file", type=str, default="", help="Custom file containing AC|... lines")
    parser.add_argument("--http", action="store_true", help="Force HTTP instead of WebSocket")

    args = parser.parse_args()

    lines_to_send = []
    if args.mode == "u1":
        lines_to_send = SAMPLE_U1_DOOR_OPEN
    elif args.mode == "u2":
        lines_to_send = SAMPLE_U2_COOLING_FAILURE
    elif args.mode == "u3":
        lines_to_send = SAMPLE_U3_POWER_CUT
    elif args.mode == "u4":
        lines_to_send = SAMPLE_U4_NOMINAL_CYCLE
    elif args.mode == "u5":
        lines_to_send = SAMPLE_U5_SENSOR_GLITCH
    elif args.mode in ("all", "both"):
        lines_to_send = ALL_UNITS_STREAM
    elif args.mode == "file":
        with open(args.file, "r") as f:
            lines_to_send = [l.strip() for l in f if l.strip().startswith("AC|")]

    if args.http:
        http_url = args.url.replace("ws://", "http://").replace("/ws/ingest", "/api/ingest")
        stream_http(http_url, lines_to_send, args.delay)
    else:
        asyncio.run(stream_ws(args.url, lines_to_send, args.delay))


if __name__ == "__main__":
    main()
