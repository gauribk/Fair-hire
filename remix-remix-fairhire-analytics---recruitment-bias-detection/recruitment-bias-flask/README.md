# AI-Based Recruitment Bias Detection and Fairness Analysis
**Complete Flask Web Application**

A production-grade Python Flask research and audit dashboard converting the legacy Streamlit prototype into an interactive, modular web application using Python 3, Flask, Bootstrap 5, Chart.js, pandas, NumPy, and scikit-learn.

---

## 1. Project Overview & Governance
This dashboard provides an empirical audit of machine learning models trained on a 10,000-applicant dataset (`job_applicant_dataset.csv`).
- **Research Goal**: Evaluate whether algorithms trained on historical recruiting records amplify or learn systemic demographic bias.
- **Strict Ethical Notice**: This software is an **educational research prototype**. It is strictly prohibited from making automated hiring decisions, screening applicants, or rejecting candidates.

---

## 2. Directory Structure

```text
recruitment-bias-flask/
│
├── app.py                      # Primary Flask application routes & server logic
├── ml_core.py                  # Scikit-learn ML pipelines, fairness metrics & caching
├── requirements.txt            # Python dependencies (Flask, pandas, scikit-learn, etc.)
├── README.md                   # Setup guide and Windows PowerShell execution instructions
│
├── data/
│   └── job_applicant_dataset.csv # 10,000 applicant records (51 roles, demographic fields)
│
├── templates/                  # Jinja2 HTML5 responsive dashboard templates
│   ├── base.html               # Master layout with sidebar navigation
│   ├── index.html              # Home Dashboard: stats, findings, key distributions
│   ├── dataset.html            # Data Analysis: dictionary, distributions, paginated records
│   ├── models.html             # ML Models: evaluation metrics, confusion matrices
│   ├── fairness.html           # Fairness Audit: demographic parity, disparate impact (0.80 rule)
│   ├── features.html           # Feature Importance: permutation test & model weights
│   └── candidate.html          # Test Candidate: inference form & counterfactual audit
│
├── static/
│   ├── css/
│   │   └── style.css           # Custom HR analytics stylesheet (Navy & Teal palette)
│   └── js/
│       └── main.js             # Client-side dynamic JD auto-fill & example loader
│
└── outputs/                    # Export output cache
```

---

## 3. Windows and Visual Studio Code Setup Guide

### Prerequisites
- Windows 10 or Windows 11
- Visual Studio Code installed
- Python 3.9, 3.10, or 3.11 installed (ensure **"Add Python to PATH"** was checked during installation)

### Step-by-Step PowerShell Setup
Open **PowerShell** or the integrated terminal in Visual Studio Code (`Ctrl + ~`) in the `recruitment-bias-flask` directory:

```powershell
# 1. Create a Python virtual environment
python -m venv venv

# 2. Activate the virtual environment in PowerShell
.\venv\Scripts\Activate.ps1

# 3. Upgrade pip and install all required packages
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# 4. Run the Flask application
python app.py
```

Open your browser and navigate to:
```text
http://127.0.0.1:5000
```

> **Note on First Start**: During initial startup, the server trains 6 models (3 algorithms &times; 2 setups) and precomputes fairness metrics and confusion matrices. This takes approximately **20–30 seconds**. Once trained, fitted pipelines are cached in memory and page transitions are instant.

---

## 4. Windows Troubleshooting Guide

### Issue A: `Activate.ps1 cannot be loaded because running scripts is disabled`
- **Cause**: Windows PowerShell default Execution Policy blocks third-party scripts.
- **Fix**: Open PowerShell as Administrator and run:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
  Or activate using Command Prompt (cmd):
  ```cmd
  venv\Scripts\activate.bat
  ```

### Issue B: `'python' is not recognized as an internal or external command`
- **Cause**: Python was not added to the Windows System PATH environment variable.
- **Fix**: Re-run the Python Windows installer, select **Modify**, and check **"Add Python to PATH"**. Alternatively, run with the Python Launcher:
  ```powershell
  py -m venv venv
  .\venv\Scripts\Activate.ps1
  py app.py
  ```

### Issue C: `Port 5000 is already in use`
- **Cause**: Another service or prior Flask process is occupying port 5000.
- **Fix**: Set a custom port in PowerShell before starting:
  ```powershell
  $env:PORT="5001"
  python app.py
  ```
  Then access `http://127.0.0.1:5001`.

### Issue D: `FileNotFoundError: Dataset not found`
- **Cause**: Running `python app.py` from outside the `recruitment-bias-flask` root folder.
- **Fix**: Ensure your active terminal directory contains the `data/` folder:
  ```powershell
  cd recruitment-bias-flask
  ls data
  python app.py
  ```

---

## 5. Machine Learning & Fairness Methodology

| Attribute | Standard Setup | Audit Setup (Diagnostic Only) |
|---|---|---|
| **Features Used** | Resume (TF-IDF), Job Description (TF-IDF), Job Role (One-Hot) | Standard Features + Gender, Race, Ethnicity, Age |
| **Applicant Names** | **Strictly Excluded** (Privacy) | **Strictly Excluded** (Privacy) |
| **Test Accuracy** | **~50% (Near chance level)** | **~88% (Artificial accuracy spike)** |
| **Scientific Finding** | Resume text contains near-zero signal for the arbitrary target label. | Model memorizes embedded historical gender-by-role labels. |

### Fairness Metrics Implemented
1. **Selection Rate Gap / Demographic Parity Difference**: `max(selection_rate) - min(selection_rate)`.
2. **Disparate Impact Ratio**: `min(selection_rate) / max(selection_rate)` benchmarked against the EEOC 0.80 Four-Fifths rule.
3. **True Positive Rate Gap (Equal Opportunity)**: `max(TPR) - min(TPR)` across protected groups.
4. **False Positive Rate Gap**: `max(FPR) - min(FPR)`.

---

## 6. Live Dashboard Pages
1. **Home Dashboard (`/`)**: Project overview, headline findings, demographic breakdown charts.
2. **Dataset Analysis (`/dataset`)**: 10,000-row preview with pagination, missing-value check, and 51-role gender gap analysis.
3. **ML Models (`/models`)**: Logistic Regression, Decision Tree, Random Forest comparison, confusion matrices, and metrics.
4. **Fairness Analysis (`/fairness`)**: Per-group selection rates, four-fifths compliance, and cross-model benchmarks.
5. **Feature Importance (`/features`)**: Permutation importance (accuracy drop) and top feature coefficients.
6. **Test a Candidate (`/candidate`)**: Interactive form predicting label and probability, plus counterfactual fairness test.
