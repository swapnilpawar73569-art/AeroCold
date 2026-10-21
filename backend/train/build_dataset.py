"""
Builds augmented training and validation datasets with time-window features.
Subsamples cadences (60s, 120s, 300s) and includes truncated histories.
Uses features_for_latest directly to guarantee feature parity between training and serving.
"""

import sys
import numpy as np
import pandas as pd
from typing import List, Dict
from backend.app.config import DATA_DIR, FEATURE_NAMES
from backend.app.features import features_for_latest


def process_episode_cadence(df_ep: pd.DataFrame, step: int, sample_every_k: int = 3) -> List[Dict]:
    sub_df = df_ep.iloc[::step].reset_index(drop=True)
    n = len(sub_df)
    records = []
    
    # Also include the very first 1 to 5 readings for short history representation
    short_history_indices = [1, 2, 3, 4, 5]
    eval_indices = set(range(1, n, sample_every_k)).union([idx for idx in short_history_indices if idx < n])
    
    for i in sorted(eval_indices):
        history_slice = sub_df.iloc[: i + 1]
        feats = features_for_latest(history_slice)
        label = int(sub_df.iloc[i]["label_excursion_30m"])
        feats["label"] = label
        feats["episode_id"] = sub_df.iloc[i]["episode_id"]
        feats["ts"] = int(sub_df.iloc[i]["ts"])
        records.append(feats)
        
    return records


def build_augmented_features(input_csv: str, output_csv: str, sample_every_k: int = 3):
    df_raw = pd.read_csv(input_csv)
    episodes = df_raw.groupby("episode_id")
    
    all_records = []
    ep_count = 0
    total_eps = len(episodes)
    
    for ep_id, group in episodes:
        ep_count += 1
        # Cadence 1: 60s (step=1)
        all_records.extend(process_episode_cadence(group, step=1, sample_every_k=sample_every_k))
        # Cadence 2: 120s (step=2)
        all_records.extend(process_episode_cadence(group, step=2, sample_every_k=sample_every_k))
        # Cadence 3: 300s (step=5)
        all_records.extend(process_episode_cadence(group, step=5, sample_every_k=sample_every_k))
        
        if ep_count % 50 == 0 or ep_count == total_eps:
            print(f"Processed {ep_count}/{total_eps} episodes...")
            
    out_df = pd.DataFrame(all_records)
    out_df.to_csv(output_csv, index=False)
    print(f"Saved {len(out_df)} samples to {output_csv}")
    print(f"Class distribution: {out_df['label'].value_counts(normalize=True).to_dict()}")
    return out_df


if __name__ == "__main__":
    train_raw = str(DATA_DIR / "sim_train.csv")
    val_raw = str(DATA_DIR / "sim_val.csv")
    
    print("Building training features...")
    build_augmented_features(train_raw, str(DATA_DIR / "train_features.csv"), sample_every_k=3)
    
    print("Building validation features...")
    build_augmented_features(val_raw, str(DATA_DIR / "val_features.csv"), sample_every_k=3)
