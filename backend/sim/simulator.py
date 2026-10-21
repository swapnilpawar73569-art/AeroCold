"""
Synthetic Cold-Storage Simulator for AeroCold.
Generates realistic thermal episodes for 2-8 C medical refrigeration units.
All generated data is explicitly synthetic.
"""

import math
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple


class StorageUnitSim:
    def __init__(
        self,
        unit_id: str,
        k_insulation: float = 0.009,
        cooling_power: float = 0.26,  # C per minute drop
        t_set_high: float = 5.0,
        t_set_low: float = 3.0,
        noise_std: float = 0.08,
        spike_prob: float = 0.003,
    ):
        self.unit_id = unit_id
        self.k = k_insulation
        self.cooling_power = cooling_power
        self.t_set_high = t_set_high
        self.t_set_low = t_set_low
        self.noise_std = noise_std
        self.spike_prob = spike_prob


def simulate_episode(
    episode_id: str,
    unit: StorageUnitSim,
    duration_hours: float,
    scenario: str,
    start_ts: int = 1760000000,
    heatwave: bool = False,
    rng: Optional[np.random.Generator] = None,
) -> pd.DataFrame:
    if rng is None:
        rng = np.random.default_rng()

    dt_sec = 30  # simulation physics step: 30 seconds
    dt_min = dt_sec / 60.0
    total_steps = int((duration_hours * 3600) / dt_sec)

    # Ambient baseline parameters
    amb_mean = 30.0 if not heatwave else 35.0
    amb_amp = 6.0 if not heatwave else 8.0
    amb_phase = rng.uniform(0, 2 * math.pi)

    # State variables
    # Start within healthy range
    current_true_c = rng.uniform(3.5, 4.8)
    compressor_on = 1 if current_true_c >= unit.t_set_high else 0

    # Scenario timing parameters
    scenario_start_step = rng.integers(int(total_steps * 0.25), int(total_steps * 0.55))
    door_open_steps = 0
    cooling_override: Optional[int] = None
    cooling_power_mult = 1.0

    if scenario == "door_open":
        # Door open 1 to 4 minutes (2 to 8 simulation steps)
        door_duration_min = rng.uniform(1.0, 4.0)
        door_open_steps = int(door_duration_min * 2)
        heat_gain_rate = rng.uniform(0.35, 0.70)  # C/min
    elif scenario == "door_left_open":
        # Door left open 15 to 40 minutes -> real excursion
        door_duration_min = rng.uniform(18.0, 40.0)
        door_open_steps = int(door_duration_min * 2)
        heat_gain_rate = rng.uniform(0.40, 0.80)
    elif scenario == "compressor_failure":
        # Compressor dies permanently
        cooling_override = 0
    elif scenario == "partial_failure":
        # Weak cooling (~1/3 power)
        cooling_power_mult = rng.uniform(0.25, 0.38)
    elif scenario == "power_cut":
        # Power cut for 20 to 90 minutes then restores
        power_cut_min = rng.uniform(25.0, 85.0)
        power_cut_steps = int(power_cut_min * 2)
    elif scenario == "sensor_glitch":
        # Glitches handled in noise step
        pass

    records = []

    for step in range(total_steps):
        sim_ts = start_ts + step * dt_sec
        # Ambient temperature (sine variation over 24h + small noise)
        day_frac = (step * dt_sec) / 86400.0
        amb_val = (
            amb_mean
            + amb_amp * math.sin(2 * math.pi * day_frac + amb_phase)
            + rng.normal(0, 0.15)
        )

        # Determine door state
        door_is_open = 0
        door_heat_gain = 0.0

        if scenario == "door_open":
            if scenario_start_step <= step < scenario_start_step + door_open_steps:
                door_is_open = 1
                door_heat_gain = heat_gain_rate
        elif scenario == "door_left_open":
            if scenario_start_step <= step < scenario_start_step + door_open_steps:
                door_is_open = 1
                door_heat_gain = heat_gain_rate

        # Determine active cooling control
        is_power_cut = False
        if scenario == "power_cut":
            if scenario_start_step <= step < scenario_start_step + power_cut_steps:
                is_power_cut = True

        effective_cooling_power = unit.cooling_power * cooling_power_mult

        if is_power_cut:
            active_cooling = 0
        elif scenario == "compressor_failure" and step >= scenario_start_step:
            active_cooling = 0
        else:
            # Thermostat hysteresis
            if current_true_c >= unit.t_set_high:
                compressor_on = 1
            elif current_true_c <= unit.t_set_low:
                compressor_on = 0
            active_cooling = compressor_on

        # Thermal physics update
        # Passive warming toward ambient: k * (ambient - T)
        dT_passive = unit.k * (amb_val - current_true_c) * dt_min
        # Cooling effect
        dT_cooling = (
            -effective_cooling_power * dt_min if active_cooling == 1 else 0.0
        )
        # Door heat ingress
        dT_door = door_heat_gain * dt_min if door_is_open == 1 else 0.0

        current_true_c += dT_passive + dT_cooling + dT_door

        # Sensor measurement with noise and occasional glitch
        sensor_noise = rng.normal(0, unit.noise_std)
        glitch = 0.0
        if rng.random() < unit.spike_prob:
            glitch = rng.choice([-1, 1]) * rng.uniform(2.0, 3.8)
        elif scenario == "sensor_glitch" and rng.random() < 0.04:
            glitch = rng.choice([-1, 1]) * rng.uniform(2.2, 4.0)

        storage_measured = round(current_true_c + sensor_noise + glitch, 2)
        true_rounded = round(current_true_c, 3)
        amb_rounded = round(amb_val, 2)

        # Store every step; we will subsample to 60s cadence (every 2nd step)
        if step % 2 == 0:
            records.append({
                "episode_id": episode_id,
                "unit_id": unit.unit_id,
                "ts": sim_ts,
                "storage_c": storage_measured,
                "true_c": true_rounded,
                "ambient_c": amb_rounded,
                "door": int(door_is_open),
                "cooling": int(active_cooling),
                "scenario": scenario,
            })

    df = pd.DataFrame(records)

    # Excursion label: y = 1 if true_c > 8.0 at any time in next 30 min (1800s)
    # and current true_c <= 8.0 (future excursion warning)
    labels = []
    ts_array = df["ts"].to_numpy()
    true_c_array = df["true_c"].to_numpy()
    n = len(df)

    for i in range(n):
        curr_t = true_c_array[i]
        if curr_t > 8.0:
            labels.append(0)  # already in excursion, not an early warning
            continue
        curr_ts = ts_array[i]
        # Look ahead up to 1800 seconds
        future_mask = (ts_array > curr_ts) & (ts_array <= curr_ts + 1800)
        if np.any(true_c_array[future_mask] > 8.0):
            labels.append(1)
        else:
            labels.append(0)

    df["label_excursion_30m"] = labels
    return df


def generate_dataset(
    n_episodes: int = 400,
    seed: int = 42,
    test_harder: bool = True,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Generates ~400 episodes split ~60% train, 20% val, 20% test by episode.
    About 55% normal-only, 45% scenario episodes.
    """
    rng = np.random.default_rng(seed)

    scenarios = [
        "normal",
        "door_open",
        "door_left_open",
        "compressor_failure",
        "partial_failure",
        "power_cut",
        "sensor_glitch",
    ]

    # Pre-determine episode scenarios
    n_train = int(n_episodes * 0.60)
    n_val = int(n_episodes * 0.20)
    n_test = n_episodes - n_train - n_val

    def make_split_episodes(count: int, split_name: str, split_rng: np.random.Generator, is_test: bool = False):
        episodes = []
        for i in range(count):
            ep_id = f"{split_name}_{i:04d}"
            u_id = f"U{split_rng.integers(1, 10):02d}"

            # ~55% normal, 45% scenario
            if split_rng.random() < 0.55:
                scen = "normal"
            else:
                scen = split_rng.choice(scenarios[1:])

            # Physics variation
            duration_h = split_rng.uniform(6.0, 10.0)
            base_k = split_rng.uniform(0.006, 0.013)
            base_cooling = split_rng.uniform(0.22, 0.30)
            t_high = split_rng.uniform(4.8, 5.2)
            t_low = split_rng.uniform(2.8, 3.2)
            heatwave = split_rng.random() < 0.15

            if is_test and test_harder:
                # Slightly harder out-of-distribution conditions for test
                if split_rng.random() < 0.25:
                    base_k = split_rng.uniform(0.014, 0.019)  # worse insulation
                    heatwave = True
                if split_rng.random() < 0.20:
                    base_cooling = split_rng.uniform(0.18, 0.22)  # slightly weaker baseline

            unit = StorageUnitSim(
                unit_id=u_id,
                k_insulation=base_k,
                cooling_power=base_cooling,
                t_set_high=t_high,
                t_set_low=t_low,
                noise_std=split_rng.uniform(0.06, 0.12),
                spike_prob=0.003,
            )

            start_time = 1760000000 + i * 50000 + split_rng.integers(0, 3600)
            df_ep = simulate_episode(
                episode_id=ep_id,
                unit=unit,
                duration_hours=duration_h,
                scenario=scen,
                start_ts=start_time,
                heatwave=heatwave,
                rng=split_rng,
            )
            episodes.append(df_ep)
        return pd.concat(episodes, ignore_index=True)

    train_rng = np.random.default_rng(seed + 100)
    val_rng = np.random.default_rng(seed + 200)
    test_rng = np.random.default_rng(seed + 300)

    train_df = make_split_episodes(n_train, "train", train_rng, is_test=False)
    val_df = make_split_episodes(n_val, "val", val_rng, is_test=False)
    test_df = make_split_episodes(n_test, "test", test_rng, is_test=True)

    return train_df, val_df, test_df


if __name__ == "__main__":
    from backend.app.config import DATA_DIR
    print("Generating simulation datasets...")
    train_df, val_df, test_df = generate_dataset(n_episodes=400, seed=42)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    train_path = DATA_DIR / "sim_train.csv"
    val_path = DATA_DIR / "sim_val.csv"
    test_path = DATA_DIR / "sim_test.csv"

    train_df.to_csv(train_path, index=False)
    val_df.to_csv(val_path, index=False)
    test_df.to_csv(test_path, index=False)

    print(f"Generated {len(train_df)} train, {len(val_df)} val, {len(test_df)} test readings.")
    print("Train label distribution:\n", train_df["label_excursion_30m"].value_counts(normalize=True))
    print("Train scenario breakdown:\n", train_df["scenario"].value_counts())
