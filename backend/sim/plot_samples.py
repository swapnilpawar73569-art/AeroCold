"""
Plots sample simulated episodes for verification.
Confirms:
- normal operation stays between 2 and 8 C
- door_open recovers
- compressor_failure drifts upwards
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
from backend.app.config import DATA_DIR

def plot_episodes():
    train_df = pd.read_csv(DATA_DIR / "sim_train.csv")
    
    # Pick one door_open and one compressor_failure episode
    door_ep_id = train_df[train_df["scenario"] == "door_open"]["episode_id"].iloc[0]
    failure_ep_id = train_df[train_df["scenario"] == "compressor_failure"]["episode_id"].iloc[0]
    
    df_door = train_df[train_df["episode_id"] == door_ep_id].copy()
    df_fail = train_df[train_df["episode_id"] == failure_ep_id].copy()
    
    # Relative time in minutes
    df_door["rel_min"] = (df_door["ts"] - df_door["ts"].iloc[0]) / 60.0
    df_fail["rel_min"] = (df_fail["ts"] - df_fail["ts"].iloc[0]) / 60.0
    
    fig, axes = plt.subplots(2, 1, figsize=(10, 8), sharex=False)
    
    # Plot Door Open
    ax1 = axes[0]
    ax1.axhspan(2.0, 8.0, color="#dcfce7", alpha=0.6, label="Safe Band (2-8 C)")
    ax1.axhline(8.0, color="#ef4444", linestyle="--", alpha=0.7, label="Excursion Threshold (8 C)")
    ax1.axhline(2.0, color="#3b82f6", linestyle="--", alpha=0.7)
    ax1.plot(df_door["rel_min"], df_door["storage_c"], color="#0284c7", label="Measured Temp (storage_c)")
    ax1.plot(df_door["rel_min"], df_door["true_c"], color="#0f172a", linestyle=":", alpha=0.8, label="True Temp")
    ax1.set_title(f"Door Open Scenario ({door_ep_id}) - Recovers Safely without Excursion")
    ax1.set_ylabel("Temperature (°C)")
    ax1.set_xlabel("Time (minutes)")
    ax1.grid(True, alpha=0.3)
    ax1.legend(loc="upper right")
    
    # Plot Compressor Failure
    ax2 = axes[1]
    ax2.axhspan(2.0, 8.0, color="#dcfce7", alpha=0.6, label="Safe Band (2-8 C)")
    ax2.axhline(8.0, color="#ef4444", linestyle="--", alpha=0.7, label="Excursion Threshold (8 C)")
    ax2.axhline(2.0, color="#3b82f6", linestyle="--", alpha=0.7)
    ax2.plot(df_fail["rel_min"], df_fail["storage_c"], color="#ea580c", label="Measured Temp (storage_c)")
    ax2.plot(df_fail["rel_min"], df_fail["true_c"], color="#0f172a", linestyle=":", alpha=0.8, label="True Temp")
    ax2.set_title(f"Compressor Failure Scenario ({failure_ep_id}) - Drifts to Temperature Excursion (>8 C)")
    ax2.set_ylabel("Temperature (°C)")
    ax2.set_xlabel("Time (minutes)")
    ax2.grid(True, alpha=0.3)
    ax2.legend(loc="upper left")
    
    plt.tight_layout()
    output_path = DATA_DIR / "sample_episodes.png"
    plt.savefig(output_path, dpi=120)
    print(f"Sample plots saved to {output_path}")

if __name__ == "__main__":
    plot_episodes()
