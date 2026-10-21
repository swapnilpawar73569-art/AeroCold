# 🎤 AeroCold: Hackathon Jury Presentation Master Guide

This guide is your complete presentation playbook: pitch script, live demo sequence, slide deck outline, key metrics, and bulletproof answers to tough jury questions.

---

## ⏱️ Section 1: The 3-Minute Winning Pitch Script

> **Delivery Tip**: Speak with confidence, calm energy, and clear transitions. Keep your hands relaxed and make eye contact before pointing to the screen.

### 1. The Hook (0:00 – 0:40)
> *"Judges, over $35 Billion dollars worth of vaccines and biologics are discarded every year due to cold-chain failures. The tragedy is that existing medical refrigerators already have temperature alarms—but they have a fatal flaw:*  
> *They only sound an alarm **after** the temperature crosses 8.0°C. By the time a nurse or facility manager wakes up to an alarm at 3:00 AM, the temperature is already at 9°C, and expensive mRNA vaccines are irreversibly spoiled.*  
> *On the flip side, naive prediction algorithms trigger constant false alarms whenever hospital staff open the door to retrieve medication—leading to severe **alarm fatigue** where staff simply mute or ignore the buzzer.*  
> *We built **AeroCold**: a predictive, explainable early-warning intelligence platform that forecasts temperature excursions **30 minutes into the future**, giving technicians an actionable **12-minute lead time** while completely distinguishing harmless door openings from catastrophic cooling failures."*

---

### 2. The Round 2 Solution & Architecture (0:40 – 1:20)
> *"Following our Round 1 selection, we built AeroCold completely from the ground up:*  
> 1. *A **Physical Thermal Simulator** modeling Newton's cooling, compressor hysteresis (3–5°C), diurnal ambient curves, and door disturbances across 400 real-world episodes.*  
> 2. *A **Calibrated LightGBM Classifier** operating on strictly causal, time-based features across 1 to 15-minute windows.*  
> 3. *A **Transparent Physical Safety Layer** that prevents false alarms when units are recovering and enforces high-confidence alarms when cooling is lost.*  
> 4. *A **TreeSHAP Explainability Engine** translating AI model activations into plain English operator diagnoses.*  
> 5. *A **Zero-In-Memory SQLite WAL Architecture** ensuring all state and persistence rules survive hardware reboots.*"

---

### 3. The Live Demo (1:20 – 2:30)
*(Switch to browser at `http://localhost:5173/`)*

#### Demo Step 1: The Fleet Command Center (U1 through U5)
- **Action**: Click on the **"Fleet Overview"** tab.
- **Talking Point**:
  > *"Here is our live Fleet Command Center monitoring 5 diverse medical cold-storage nodes across clinics, drones, and cargo pods:  
  > - **U1 (mRNA Vaccine)**: Normal recovery after restocking.  
  > - **U2 (Insulin Glargine)**: Critical compressor loss in air cargo transit with an active emergency K=3 alarm.  
  > - **U3 (Pediatric Hep B)**: Early warning stage (Medium Risk) on an autonomous drone under 36°C ambient heat.  
  > - **U4 (Meningococcal Vaccine)**: Flawless nominal regulation (3.9°C).  
  > - **U5 (Blood Plasma)**: Electrical sensor glitch cleanly filtered out with zero false alarms."*

#### Demo Step 2: The Harmless Door-Open (Combating Alarm Fatigue)
- **Action**: Click on Unit **U1** (or click **"U1 (Door Recov)"** on the top bar).
- **Talking Point**:
  > *"Watch Unit U1. A pharmacist opened the door to pull a vial. Temperature jumped to 7.1°C. Notice what happens: AeroCold evaluates that cooling is active and the door was re-closed. The safety guardrail caps risk, and as the compressor recovers, it immediately falls back to **Low Risk (p = 0.011)**. The operator sees: 'Storage temperature is within safe nominal limits; door was opened and closed; temperature is falling back.' Zero nuisance alarms. No alarm fatigue."*

#### Demo Step 3: The Early Warning Creep (Medium Risk Warning Stage)
- **Action**: Switch to Unit **U3** (or click **"U3 (Warning Creep)"**).
- **Talking Point**:
  > *"Now look at Unit U3 on our medical drone carrier. It's at 5.6°C—well below the 8.0°C limit. But our calibrated LightGBM model detects a sustained 10-minute upward thermal drift under high ambient load (36°C). It moves into the **Medium Risk Warning Stage (p = 0.372)** with **~24 minutes advance warning**, allowing logistics dispatchers to reroute before medicine is compromised."*

#### Demo Step 4: The Critical Cooling Failure (High Risk, K=3 Persistence)
- **Action**: Switch to Unit **U2** (or click **"U2 (Cooling Fail)"**).
- **Talking Point**:
  > *"Now watch Unit U2. The cooling compressor died silently (cooling=0). Temperature is at 7.5°C. Traditional monitors have sounded no alarm! AeroCold immediately triggers **High Risk (75%)** and flags **K=3 Persistence Active**, projecting an excursion in ~6 minutes. Look at the TreeSHAP waterfall: it isolates 'compressor idle' and 'mean temperature elevated' as the exact drivers."*

#### Demo Step 5: Live Streaming & Hardware Glitch Rejection
- **Action**: Click **"▶ Auto-Stream Live"** on the Demo Controller bar.
- **Talking Point**:
  > *"Watch our live IoT stream ticking in real-time every 2.5 seconds: the gauge, charts, and factor attributions dynamically roll forward. And on Unit U5, when a dirty electrical pulse caused an isolated spike to 7.8°C, our causal 3-point median filter rejected the spike cleanly, maintaining green stability."*

---

### 4. The Impact & Evaluation (2:30 – 3:00)
*(Click on "Evaluation vs Baselines" tab)*
> *"We benchmarked AeroCold reading-by-reading against traditional fixed thresholds and linear slopes across 80 held-out test episodes with 500 bootstrap iterations:*  
> - *Traditional threshold has **0.0 minutes** of warning lead time.*  
> - *Linear slope gives lead time, but generates **20 false alarms every day**.*  
> - *AeroCold achieves **95.4% Event Recall**, gives a **12.2-minute early response window**, and slashes false alarms down to **14/day**.*  
> *AeroCold protects cold chain integrity from factory to patient. Thank you, and we'd love to take your questions!"*

---

## 🎯 Section 2: Numbers to Memorize for the Jury

| Metric | What to Say | Context |
| :--- | :--- | :--- |
| **ROC-AUC** | **0.9565** | Demonstrates outstanding discrimination capability of the calibrated LightGBM model. |
| **Warning Lead Time** | **12.2 Minutes** | Average time operators get to intervene *before* storage temperature crosses 8.0°C. (Legacy systems: 0.0 min). |
| **Event Recall** | **95.4%** [90.1%, 100%] | Catches virtually all true excursion events without missing runaway compressors. |
| **False Alarm Reduction** | **~30% Reduction** | Reduces nuisance alarms from 20.03/day down to 14.08/day via K=3 persistence. |
| **Regulatory Band** | **2.0°C – 8.0°C** | Standard WHO and FDA medical vaccine cold-chain limits. |
| **Horizon** | **30 Minutes** | Predictive lookahead window for excursion forecasting. |

---

## 🛡️ Section 3: Tough Jury Questions & How to Answer Like a Pro

### Q1: "Is your training data real hospital data or synthetic?"
> **The Pro Answer**:  
> *"It is 100% synthetic, and we are completely transparent about that across our README, dashboard, and evaluation pages. In the medical cold chain, real excursion datasets are proprietary and rarely contain granular door telemetry or hidden noise-free ground truth. We built a first-principles thermodynamic physics simulator implementing Newton's law of cooling, compressor hysteresis between 3°C and 5°C, and stochastic sensor noise with spike glitches. Crucially, all evaluation metrics on our dashboard were computed by code reading-by-reading from held-out test episodes—no pre-scored files or invented numbers."*

### Q2: "Why not just use a simple linear derivative (slope)? Why do you need LightGBM?"
> **The Pro Answer**:  
> *"That was exactly our Baseline 2, and the data proves why simple linear slopes fail in real life. When a door is opened for restocking, the instantaneous 1-minute slope is steep, projecting an excursion within minutes. A linear extrapolator triggers **20 false alarms every day**! LightGBM combines 20 multi-scale features—including 10-minute acceleration, door closing recency, and compressor duty cycle—to recognize that heat gain from a brief door opening is self-limiting once the compressor engages."*

### Q3: "What if the jury or hardware sends readings 5 minutes apart instead of 1 minute?"
> **The Pro Answer**:  
> *"We specifically architected `backend/app/features.py` to be time-based using unix timestamps in seconds, never row counts. Furthermore, in `build_dataset.py`, we augmented training with 60-second, 120-second, and 300-second cadences, as well as truncated histories (1–5 readings). LightGBM natively handles NaNs for short-window slopes when data is sparse, ensuring seamless scoring across any sampling rate."*

### Q4: "Why do you have a Safety Rule layer on top of the Machine Learning model?"
> **The Pro Answer**:  
> *"In mission-critical medical healthcare, pure black-box models have blind spots on edge cases—especially when only 2 or 3 readings have arrived. Our Safety Layer acts as an explainable guardrail based on thermodynamics: if the door is closed, cooling is active, and the slope is negative, we cap risk at 10% because the unit is physically recovering. If cooling is dead and the rate of rise guarantees 8°C in under 30 minutes, we floor the risk at 75%. Crucially, we store both `model_prob` and final `prob` separately in SQLite so the system is fully auditable."*

### Q5: "What is K=3 persistence and why is it stored in SQLite instead of memory?"
> **The Pro Answer**:  
> *"K=3 persistence prevents single-reading alarm blips: an alert requires three consecutive readings at Medium or High risk. We deliberately do NOT keep this state in application RAM. Instead, each reading queries SQLite for the previous two stored rows for that unit. If the server reboots, the cloud container crashes, or an IoT connection restarts, the K=3 state remains completely intact with zero state leakage."*

---

## 📑 Section 4: Slide Deck Outline (5 Slides Max)

If you have slides to accompany your demo:

- **Slide 1: Title & The Hook**: AeroCold — Early-Warning Medical Cold Chain Intelligence (2–8°C). The $35B cold chain spoilage problem.
- **Slide 2: The Flaw of Traditional Alarms**: Fixed threshold (alerts too late at >8°C) vs Naive Slopes (20 false alarms/day, alarm fatigue).
- **Slide 3: AeroCold Architecture**: Physics Simulator $\rightarrow$ Causal Features $\rightarrow$ Calibrated LightGBM $\rightarrow$ Transparent Safety Overrides $\rightarrow$ SQLite WAL.
- **Slide 4: Live Demo Screenshot & Test Verification**:
  - U1 (Door open): Recovers to **Low Risk** (No false alarm).
  - U2 (Cooling failure): Alerts **High Risk ~12 min early** before reaching 8°C.
- **Slide 5: Benchmark Matrix & Summary**: Recall 95.4%, 12.2 min Lead Time, 30% False Alarm Reduction, TreeSHAP Explainability.

---

## 🚀 Pre-Presentation 60-Second Sanity Checklist

1. Make sure backend is running: `http://localhost:8000/docs` responds.
2. Make sure frontend is running: `http://localhost:5173/` is open in Chrome.
3. Keep the browser in full screen.
4. Have the Live Monitor tab selected by default.
5. If you want to reset the demo data before walking on stage, simply click the **"Reset"** button on the Demo Controller bar!
