"""
ml_core.py - Machine learning training, evaluation, fairness analysis, and prediction logic.

Architecture & Ethics:
- Applicant names are strictly excluded from all training and predictive pipelines.
- Standard setup: Protected attributes (Gender, Race, Ethnicity, Age) are NOT model inputs.
  Inputs are restricted to resume text, job role, and job description.
- Audit setup: Protected attributes are included as inputs solely to detect, quantify,
  and demonstrate the degree of bias learned from historical labels.
- Fixed stratified train/test split (80/20, random_state=42) ensures scientific reproducibility
  and prevents data leakage.
- Fitted models are cached in memory so page reloads do not trigger retraining.
"""
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier

DATA_PATH = Path(__file__).resolve().parent / "data" / "job_applicant_dataset.csv"
TARGET = "Best Match"
NAME_COL = "Job Applicant Name"  # Identifier only; never used in model training
PROTECTED = ["Gender", "Race", "Ethnicity", "Age"]
RESUME, ROLE, JD = "Resume", "Job Roles", "Job Description"
SAFE_FEATURES = [RESUME, ROLE, JD]  # Legitimate hiring features
RANDOM_STATE = 42
TEST_SIZE = 0.20
MODEL_NAMES = ["Logistic Regression", "Decision Tree", "Random Forest"]
AGE_BINS = [0, 30, 40, 50, 200]
AGE_LABELS = ["Under 31", "31-40", "41-50", "51+"]


def load_data(path=None) -> pd.DataFrame:
    """Load dataset from path or default location, and compute Age Group."""
    file_path = Path(path) if path else DATA_PATH
    if not file_path.exists():
        # Fallback to local /data folder if running in different relative working dirs
        alt_path = Path("data") / "job_applicant_dataset.csv"
        if alt_path.exists():
            file_path = alt_path
        else:
            raise FileNotFoundError(f"Applicant dataset not found at {file_path}")
    
    df = pd.read_csv(file_path)
    df["Age Group"] = pd.cut(df["Age"], AGE_BINS, labels=AGE_LABELS).astype(str)
    return df


def split_data(df: pd.DataFrame):
    """One fixed, stratified split shared across all models."""
    return train_test_split(
        df, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=df[TARGET]
    )


def build_preprocessor(use_protected: bool) -> ColumnTransformer:
    """Build ColumnTransformer for text vectorization and categorical encoding."""
    parts = [
        ("resume", TfidfVectorizer(ngram_range=(1, 2), min_df=3, max_features=2500), RESUME),
        ("jd", TfidfVectorizer(stop_words="english", min_df=2, max_features=800), JD),
        ("role", OneHotEncoder(handle_unknown="ignore"), [ROLE]),
    ]
    if use_protected:  # Audit setup only
        parts.append(("demo_cat", OneHotEncoder(handle_unknown="ignore"), ["Gender", "Race", "Ethnicity"]))
        parts.append(("demo_age", StandardScaler(), ["Age"]))
    return ColumnTransformer(parts)


def build_model(name: str):
    """Instantiate scikit-learn classifier."""
    if name == "Logistic Regression":
        return LogisticRegression(max_iter=1000, random_state=RANDOM_STATE)
    if name == "Decision Tree":
        return DecisionTreeClassifier(max_depth=12, min_samples_leaf=5, random_state=RANDOM_STATE)
    if name == "Random Forest":
        return RandomForestClassifier(
            n_estimators=100, min_samples_leaf=2, n_jobs=-1, random_state=RANDOM_STATE
        )
    raise ValueError(f"Unknown model name: {name}")


def feature_columns(use_protected: bool):
    return SAFE_FEATURES + (PROTECTED if use_protected else [])


def make_pipeline(name: str, use_protected: bool) -> Pipeline:
    return Pipeline([("prep", build_preprocessor(use_protected)), ("model", build_model(name))])


def score(y_true, y_pred) -> dict:
    """Compute standard classification metrics and confusion matrix."""
    cm = confusion_matrix(y_true, y_pred).tolist()
    return {
        "Accuracy": float(accuracy_score(y_true, y_pred)),
        "Precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "Recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "F1-score": float(f1_score(y_true, y_pred, zero_division=0)),
        "confusion_matrix": cm  # [[TN, FP], [FN, TP]]
    }


def fairness_table(test_df: pd.DataFrame, y_pred, group_col: str, min_n: int = 30) -> pd.DataFrame:
    """Per-group audit of true labels vs model predictions on test split."""
    d = test_df.copy()
    d["pred"] = np.asarray(y_pred)
    rows = []
    for g, part in d.groupby(group_col):
        y, p = part[TARGET], part["pred"]
        pos, neg = int((y == 1).sum()), int((y == 0).sum())
        total = len(part)
        actual_rate = float(y.mean()) if total else 0.0
        pred_rate = float(p.mean()) if total else 0.0
        acc = float((y == p).mean()) if total else 0.0
        tpr = float(((p == 1) & (y == 1)).sum() / pos) if pos > 0 else np.nan
        fpr = float(((p == 1) & (y == 0)).sum() / neg) if neg > 0 else np.nan
        rows.append({
            group_col: str(g),
            "Applicants (n)": total,
            "Actual Best Match rate": actual_rate,
            "Predicted Best Match rate": pred_rate,
            "Accuracy": acc,
            "True positive rate": tpr,
            "False positive rate": fpr,
            "Small group?": "yes" if total < min_n else "no",
        })
    return pd.DataFrame(rows).sort_values(group_col).reset_index(drop=True)


def fairness_summary(tbl: pd.DataFrame) -> dict:
    """Summary of disparity gaps across demographic categories."""
    sel = tbl["Predicted Best Match rate"]
    tpr = tbl["True positive rate"].dropna()
    actual = tbl["Actual Best Match rate"]
    max_sel = float(sel.max()) if len(sel) else 0.0
    min_sel = float(sel.min()) if len(sel) else 0.0
    di_ratio = float(min_sel / max_sel) if max_sel > 0 else 0.0
    
    return {
        "Selection-rate gap (max-min)": float(max_sel - min_sel),
        "Disparate-impact ratio (min/max)": di_ratio,
        "Demographic Parity Difference": float(max_sel - min_sel),
        "True-positive-rate gap (max-min)": float(tpr.max() - tpr.min()) if len(tpr) else 0.0,
        "Actual-rate gap (max-min)": float(actual.max() - actual.min()) if len(actual) else 0.0,
    }


def grouped_permutation_importance(pipe, test_df, use_protected, n_repeats=2, seed=RANDOM_STATE):
    """Compute permutation importance by shuffling logical feature groups."""
    rng = np.random.RandomState(seed)
    cols = feature_columns(use_protected)
    X = test_df[cols].reset_index(drop=True)
    y = test_df[TARGET].reset_index(drop=True)
    base_acc = float(accuracy_score(y, pipe.predict(X)))
    
    groups = {
        "Resume text": [RESUME],
        "Job role + description": [ROLE, JD]
    }
    if use_protected:
        groups.update({
            "Gender": ["Gender"],
            "Race": ["Race"],
            "Ethnicity": ["Ethnicity"],
            "Age": ["Age"]
        })
        
    rows = []
    for label, group_cols in groups.items():
        drops = []
        for _ in range(n_repeats):
            Xp = X.copy()
            idx = rng.permutation(len(Xp))
            Xp[group_cols] = X[group_cols].iloc[idx].reset_index(drop=True).values
            shuffled_acc = accuracy_score(y, pipe.predict(Xp))
            drops.append(base_acc - shuffled_acc)
        rows.append({
            "Input": label,
            "Accuracy drop when shuffled": float(np.mean(drops))
        })
    return pd.DataFrame(rows).sort_values("Accuracy drop when shuffled", ascending=False).reset_index(drop=True)


def clean_feature_name(raw_name: str) -> dict:
    """Format raw scikit-learn feature name into clean readable label and category."""
    if raw_name.startswith("resume__"):
        term = raw_name.replace("resume__", "")
        return {"name": f'Resume Keyword: "{term}"', "category": "Resume Text", "term": term}
    if raw_name.startswith("jd__"):
        term = raw_name.replace("jd__", "")
        return {"name": f'Job Description: "{term}"', "category": "Job Description", "term": term}
    if raw_name.startswith("role__Job Roles_"):
        role_name = raw_name.replace("role__Job Roles_", "")
        return {"name": f'Target Role: {role_name}', "category": "Job Role", "term": role_name}
    if raw_name.startswith("demo_cat__"):
        demo = raw_name.replace("demo_cat__", "").replace("_", " = ")
        return {"name": f'Demographic: {demo}', "category": "Protected Demographic", "term": demo}
    if raw_name.startswith("demo_age__"):
        return {"name": "Demographic: Candidate Age", "category": "Protected Demographic", "term": "Age"}
    return {"name": raw_name, "category": "Other", "term": raw_name}


def top_features(pipe, n=10) -> pd.DataFrame:
    """Extract model-specific top feature importances or coefficients with clean metadata."""
    prep = pipe.named_steps["prep"]
    names = prep.get_feature_names_out()
    model = pipe.named_steps["model"]
    if hasattr(model, "coef_"):
        imp = np.abs(model.coef_[0])
    elif hasattr(model, "feature_importances_"):
        imp = model.feature_importances_
    else:
        imp = np.zeros(len(names))
        
    records = []
    for raw_name, importance in zip(names, imp):
        cleaned = clean_feature_name(raw_name)
        records.append({
            "Feature": cleaned["name"],
            "RawFeature": raw_name,
            "Category": cleaned["category"],
            "Importance": float(importance)
        })
        
    out = pd.DataFrame(records)
    return out.sort_values("Importance", ascending=False).head(n).reset_index(drop=True)


def explain_candidate_prediction(pipe, cand_row, model_name: str, top_k: int = 8) -> dict:
    """
    Computes individual prediction feature attribution for a single candidate.
    - Logistic Regression: Exact Linear Decomposition (c_i = w_i * x_i in logit space).
    - Decision Tree & Random Forest: Leave-One-Covariate-Out (LOCO) Local Perturbation Attribution.
    """
    prep = pipe.named_steps["prep"]
    model = pipe.named_steps["model"]
    names = prep.get_feature_names_out()
    
    # Transform candidate row to feature space
    X = prep.transform(cand_row)
    active_indices = X.nonzero()[1]
    
    classes = list(pipe.classes_)
    pos_idx = classes.index(1) if 1 in classes else 1
    
    # Base prediction and probability
    base_pred = int(pipe.predict(cand_row)[0])
    if hasattr(pipe, "predict_proba"):
        base_prob = float(pipe.predict_proba(cand_row)[0, pos_idx])
    else:
        base_prob = 1.0 if base_pred == 1 else 0.0

    contributions = []
    
    if model_name == "Logistic Regression" and hasattr(model, "coef_"):
        method_name = "Linear Logit Decomposition (Weight × Feature Value)"
        method_short = "Linear Logit Attribution"
        w = model.coef_[0]
        
        for idx in active_indices:
            raw_name = names[idx]
            val = float(X[0, idx])
            linear_contrib = float(w[idx] * val)
            cleaned = clean_feature_name(raw_name)
            
            contributions.append({
                "feature": cleaned["name"],
                "raw_feature": raw_name,
                "category": cleaned["category"],
                "value": round(val, 4),
                "impact": round(linear_contrib, 4),
                "direction": "positive" if linear_contrib > 0 else "negative",
                "magnitude": abs(linear_contrib),
            })
    else:
        # Decision Tree & Random Forest: Leave-One-Covariate-Out (LOCO) Attribution
        method_name = "Leave-One-Covariate-Out (LOCO) Local Feature Perturbation"
        method_short = "LOCO Attribution"
        
        for idx in active_indices:
            raw_name = names[idx]
            val = float(X[0, idx])
            
            # Mask out this feature
            X_pert = X.copy()
            X_pert[0, idx] = 0.0
            
            if hasattr(model, "predict_proba"):
                pert_prob = float(model.predict_proba(X_pert)[0, pos_idx])
                diff = float(base_prob - pert_prob)
            else:
                pert_pred = int(model.predict(X_pert)[0])
                diff = float(base_pred - pert_pred)
                
            cleaned = clean_feature_name(raw_name)
            contributions.append({
                "feature": cleaned["name"],
                "raw_feature": raw_name,
                "category": cleaned["category"],
                "value": round(val, 4),
                "impact": round(diff, 4),
                "direction": "positive" if diff > 0 else "negative",
                "magnitude": abs(diff),
            })

    # Sort by magnitude of contribution
    contributions.sort(key=lambda x: x["magnitude"], reverse=True)
    top_contributions = contributions[:top_k]

    positive_drivers = [c for c in top_contributions if c["direction"] == "positive"]
    negative_drivers = [c for c in top_contributions if c["direction"] == "negative"]

    return {
        "method": method_name,
        "method_short": method_short,
        "base_probability": round(base_prob, 4),
        "total_active_features": len(active_indices),
        "top_features": top_contributions,
        "positive_count": len(positive_drivers),
        "negative_count": len(negative_drivers),
        "causation_notice": "Feature attribution reveals statistical associations learned from historical training labels; it does not demonstrate causal candidate competence or real-world job suitability.",
        "global_vs_local_note": "This individual explanation isolates the features present in this candidate's specific profile, distinct from global cohort-level permutation importance."
    }


def train_everything(data_path=None):
    """Fits 3 models x 2 setups on the TRAIN split; scores on held-out TEST split."""
    df = load_data(data_path)
    train_df, test_df = split_data(df)
    results = {
        "df": df,
        "train": train_df,
        "test": test_df,
        "setups": {}
    }
    
    for use_protected in (False, True):
        setup_key = "audit" if use_protected else "standard"
        cols = feature_columns(use_protected)
        setup = {}
        for name in MODEL_NAMES:
            pipe = make_pipeline(name, use_protected)
            pipe.fit(train_df[cols], train_df[TARGET])
            pred = pipe.predict(test_df[cols])
            proba = pipe.predict_proba(test_df[cols])[:, 1] if hasattr(pipe, "predict_proba") else None
            
            setup[name] = {
                "pipeline": pipe,
                "pred": pred,
                "proba": proba,
                "metrics": score(test_df[TARGET], pred),
                "importance": grouped_permutation_importance(pipe, test_df, use_protected),
                "top_features": top_features(pipe),
            }
        results["setups"][setup_key] = setup
        
    return results


def role_skill_vocab(train_df: pd.DataFrame) -> dict:
    """Vocabulary of skills observed per job role in training data."""
    vocab = {}
    for role, part in train_df.groupby(ROLE):
        skills = set()
        for r in part[RESUME]:
            if r.startswith("Proficient in ") and ", with " in r:
                skill_part = r[len("Proficient in "):r.index(", with ")]
                skills.update(s.strip().lower() for s in skill_part.split(",") if s.strip())
        vocab[role] = skills
    return vocab


def build_candidate_row(resume_text, skills_text, role, job_desc, demo=None, use_protected=False) -> pd.DataFrame:
    """Construct a clean 1-row DataFrame strictly formatted for model prediction."""
    resume_combined = (str(resume_text).strip() + " " + str(skills_text).strip()).strip()
    row = {
        RESUME: resume_combined,
        ROLE: str(role).strip(),
        JD: str(job_desc).strip()
    }
    if use_protected and demo:
        row.update(demo)
    return pd.DataFrame([row])[feature_columns(use_protected)]
