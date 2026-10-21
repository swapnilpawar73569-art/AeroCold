"""
Stream Samples Tool for AeroCold.
Sends sample readings to the AeroCold WebSocket or HTTP ingest endpoint.
Includes the official Round 2 Jury Test sequences:
- U1: Door-Open Recovery (ends in Low risk)
- U2: Cooling Failure (escalates to High risk before 8 C)
"""

import argparse
import asyncio
import sys
import time
import httpx
import websockets

SAMPLE_U1_DOOR_OPEN = [
    "AC|U1|1760000000|6.4|30|1|1",
    "AC|U1|1760000060|7.1|30|1|1",
    "AC|U1|1760000120|6.2|30|0|1",
]

SAMPLE_U2_COOLING_FAILURE = [
    "AC|U2|1760000000|5.0|32|0|0",
    "AC|U2|1760000300|6.2|32|0|0",
    "AC|U2|1760000600|7.1|32|0|0",
]


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
    parser.add_argument("--mode", choices=["u1", "u2", "both", "file"], default="both", help="Sample sequence to send")
    parser.add_argument("--url", default="ws://localhost:8000/ws/ingest", help="Ingest WebSocket URL")
    parser.add_argument("--delay", type=float, default=0.5, help="Delay between readings in seconds")
    parser.add_argument("--file", type=str, default="", help="Custom file containing AC|... lines")
    parser.add_argument("--http", action="store_true", help="Force HTTP instead of WebSocket")

    args = parser.parse_args()

    lines_to_send = []
    if args.mode == "u1":
        lines_to_send = SAMPLE_U1_DOOR_OPEN
    elif args.mode == "u2":
        lines_to_send = SAMPLE_U2_COOLING_FAILURE
    elif args.mode == "both":
        lines_to_send = SAMPLE_U1_DOOR_OPEN + SAMPLE_U2_COOLING_FAILURE
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
