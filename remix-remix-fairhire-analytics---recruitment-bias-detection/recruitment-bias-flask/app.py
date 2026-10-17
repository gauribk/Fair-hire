"""
Flask Application for AI-Based Recruitment Bias Detection and Fairness Analysis.
Educational research dashboard replacing the legacy Streamlit interface.

Runs locally on Windows in VS Code (http://127.0.0.1:5000) or in Linux/macOS.
"""
import io
import os
import zipfile
from pathlib import Path
import numpy as np
import pandas as pd
from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for, flash, session

import ml_core as mc

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "recruitment-bias-fairness-secret-key-2026")
app.config["TEMPLATES_AUTO_RELOAD"] = True

# Configure dataset path
BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_PATH = BASE_DIR / "data" / "job_applicant_dataset.csv"
OUTPUTS_DIR = BASE_DIR / "outputs"
OUTPUTS_DIR.mkdir(exist_ok=True)

# Global in-memory cache for trained models and dataset
MODEL_CACHE = None
ROLE_JD_MAP = {}
ALL_ROLES = []


def get_trained_models():
    """Lazily load and train models once, keeping fitted pipelines in memory."""
    global MODEL_CACHE, ROLE_JD_MAP, ALL_ROLES
    if MODEL_CACHE is None:
        data_path = DEFAULT_DATA_PATH
        if not data_path.exists():
            alt = Path("data") / "job_applicant_dataset.csv"
            if alt.exists():
                data_path = alt
            else:
                raise FileNotFoundError(f"Dataset not found at {data_path}. Ensure data/job_applicant_dataset.csv exists.")
        
        print("Training models on training split (this takes ~25-35 seconds on first start)...")
        MODEL_CACHE = mc.train_everything(data_path)
        df = MODEL_CACHE["df"]
        ROLE_JD_MAP = df.drop_duplicates(mc.ROLE).set_index(mc.ROLE)[mc.JD].to_dict()
        ALL_ROLES = sorted(ROLE_JD_MAP.keys())
        print("Model training complete and cached in memory!")
    return MODEL_CACHE


@app.context_processor
def inject_globals():
    """Make common constants and role choices available in all Jinja templates."""
    try:
        models = get_trained_models()
        df = models["df"]
        roles = ALL_ROLES
        races = sorted(df["Race"].unique().tolist())
        ethnicities = sorted(df["Ethnicity"].unique().tolist())
        genders = sorted(df["Gender"].unique().tolist())
    except Exception:
        roles = []
        races = []
        ethnicities = []
        genders = []
    return {
        "APP_NAME": "FairHire Analytics",
        "APP_TITLE": "AI-Based Recruitment Bias Detection and Fairness Analysis",
        "MODEL_NAMES": mc.MODEL_NAMES,
        "GROUP_OPTIONS": {"Gender": "Gender", "Race": "Race", "Ethnicity": "Ethnicity", "Age group": "Age Group"},
        "ALL_ROLES": roles,
        "RACES": races,
        "ETHNICITIES": ethnicities,
        "GENDERS": genders,
    }


# ------------------------------------------------------------------ ROUTES

@app.route("/")
def index():
    """Home Dashboard: Project overview, key stats, target label analysis, headline findings."""
    models = get_trained_models()
    df = models["df"]
    std_models = models["setups"]["standard"]
    aud_models = models["setups"]["audit"]
    
    total_applicants = len(df)
    best_match_mean = float(df[mc.TARGET].mean())
    gender_counts = df["Gender"].value_counts().to_dict()
    gender_rates = df.groupby("Gender")[mc.TARGET].mean().to_dict()
    age_group_counts = df["Age Group"].value_counts().to_dict()
    target_counts = df[mc.TARGET].value_counts().to_dict()
    
    best_std_acc = max(v["metrics"]["Accuracy"] for v in std_models.values())
    best_aud_acc = max(v["metrics"]["Accuracy"] for v in aud_models.values())
    
    # Calculate role gender gap summary
    role_gap = df.groupby([mc.ROLE, "Gender"])[mc.TARGET].mean().unstack().fillna(0)
    role_gap["Gap"] = role_gap["Female"] - role_gap["Male"]
    fem_favored = int((role_gap["Gap"] >= 0.5).sum())
    male_favored = int((role_gap["Gap"] <= -0.5).sum())
    neutral_roles = len(role_gap) - fem_favored - male_favored

    return render_template(
        "index.html",
        total_applicants=total_applicants,
        best_match_pct=best_match_mean * 100,
        gender_counts=gender_counts,
        gender_rates=gender_rates,
        age_group_counts=age_group_counts,
        target_counts=target_counts,
        best_std_acc=best_std_acc * 100,
        best_aud_acc=best_aud_acc * 100,
        fem_favored=fem_favored,
        male_favored=male_favored,
        neutral_roles=neutral_roles,
        std_models=std_models,
        aud_models=aud_models,
    )


@app.route("/dataset")
def dataset_overview():
    """Dataset Analysis: Dimensions, missing values, column roles, distributions, pagination."""
    models = get_trained_models()
    df = models["df"]
    
    # Pagination
    page = request.args.get("page", 1, type=int)
    per_page = 15
    total_rows = len(df)
    total_pages = int(np.ceil(total_rows / per_page))
    
    # Filter by role and gender if requested
    role_filter = request.args.get("role", "")
    gender_filter = request.args.get("gender", "")
    filtered_df = df
    if role_filter:
        filtered_df = filtered_df[filtered_df[mc.ROLE] == role_filter]
    if gender_filter:
        filtered_df = filtered_df[filtered_df["Gender"] == gender_filter]
        
    filtered_total = len(filtered_df)
    total_pages = max(1, int(np.ceil(filtered_total / per_page)))
    page = min(max(1, page), total_pages)
    
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    
    # Exclude applicant names from table display for privacy
    display_cols = ["Age", "Gender", "Race", "Ethnicity", "Job Roles", "Resume", "Job Description", "Best Match"]
    sample_rows = filtered_df[display_cols].iloc[start_idx:end_idx].to_dict(orient="records")
    
    # Column definitions and roles
    columns_info = [
        {"name": "Job Applicant Name", "role": "Identifier Only (Excluded)", "type": "Text", "missing": int(df["Job Applicant Name"].isna().sum()), "unique": int(df["Job Applicant Name"].nunique())},
        {"name": "Age", "role": "Fairness Audit Only", "type": "Integer (25-55)", "missing": int(df["Age"].isna().sum()), "unique": int(df["Age"].nunique())},
        {"name": "Gender", "role": "Fairness Audit Only", "type": "Categorical", "missing": int(df["Gender"].isna().sum()), "unique": int(df["Gender"].nunique())},
        {"name": "Race", "role": "Fairness Audit Only", "type": "Categorical", "missing": int(df["Race"].isna().sum()), "unique": int(df["Race"].nunique())},
        {"name": "Ethnicity", "role": "Fairness Audit Only", "type": "Categorical", "missing": int(df["Ethnicity"].isna().sum()), "unique": int(df["Ethnicity"].nunique())},
        {"name": "Resume", "role": "Model Input (TF-IDF)", "type": "Text", "missing": int(df["Resume"].isna().sum()), "unique": int(df["Resume"].nunique())},
        {"name": "Job Roles", "role": "Model Input (One-Hot)", "type": "Categorical (51 roles)", "missing": int(df["Job Roles"].isna().sum()), "unique": int(df["Job Roles"].nunique())},
        {"name": "Job Description", "role": "Model Input (TF-IDF)", "type": "Text (Fixed per role)", "missing": int(df["Job Description"].isna().sum()), "unique": int(df["Job Description"].nunique())},
        {"name": "Best Match", "role": "Target Variable (Y)", "type": "Binary Label (0 / 1)", "missing": int(df["Best Match"].isna().sum()), "unique": int(df[mc.TARGET].nunique())},
    ]
    
    # Group breakdown distributions
    gender_dist = df.groupby("Gender")[mc.TARGET].agg(["mean", "count"]).to_dict(orient="index")
    race_dist = df.groupby("Race")[mc.TARGET].agg(["mean", "count"]).to_dict(orient="index")
    eth_dist = df.groupby("Ethnicity")[mc.TARGET].agg(["mean", "count"]).to_dict(orient="index")
    age_dist = df.groupby("Age Group")[mc.TARGET].agg(["mean", "count"]).to_dict(orient="index")
    
    # Role gap table
    rg = df.groupby([mc.ROLE, "Gender"])[mc.TARGET].mean().unstack().fillna(0)
    rg["Gap"] = rg["Female"] - rg["Male"]
    role_gaps = rg.sort_values("Gap").reset_index().to_dict(orient="records")

    return render_template(
        "dataset.html",
        total_rows=total_rows,
        filtered_total=filtered_total,
        columns_info=columns_info,
        sample_rows=sample_rows,
        page=page,
        total_pages=total_pages,
        role_filter=role_filter,
        gender_filter=gender_filter,
        gender_dist=gender_dist,
        race_dist=race_dist,
        eth_dist=eth_dist,
        age_dist=age_dist,
        role_gaps=role_gaps,
        overall_rate=float(df[mc.TARGET].mean() * 100),
    )


@app.route("/models")
def models_comparison():
    """Machine Learning Models: Performance metrics, confusion matrices, and fair comparison."""
    models = get_trained_models()
    setup = request.args.get("setup", "standard")
    if setup not in ("standard", "audit"):
        setup = "standard"
        
    std_data = models["setups"]["standard"]
    aud_data = models["setups"]["audit"]
    current_setup = models["setups"][setup]
    
    # Format table data
    summary_rows = []
    for s_name in ("standard", "audit"):
        for m_name in mc.MODEL_NAMES:
            info = models["setups"][s_name][m_name]
            pred = info["pred"]
            pred_rate = float(np.mean(pred))
            cm = info["metrics"]["confusion_matrix"]
            summary_rows.append({
                "setup": s_name,
                "model": m_name,
                "accuracy": info["metrics"]["Accuracy"],
                "precision": info["metrics"]["Precision"],
                "recall": info["metrics"]["Recall"],
                "f1": info["metrics"]["F1-score"],
                "pred_rate": pred_rate,
                "cm": cm,
            })

    return render_template(
        "models.html",
        setup=setup,
        current_setup=current_setup,
        summary_rows=summary_rows,
        std_data=std_data,
        aud_data=aud_data,
        test_size=len(models["test"]),
        train_size=len(models["train"]),
    )


@app.route("/fairness")
def fairness_analysis():
    """Fairness and Bias Analysis: Selection rate differences, disparate impact, TPR/FPR."""
    models = get_trained_models()
    setup = request.args.get("setup", "standard")
    if setup not in ("standard", "audit"):
        setup = "standard"
        
    selected_model = request.args.get("model", "Random Forest")
    if selected_model not in mc.MODEL_NAMES:
        selected_model = "Random Forest"
        
    attr_label = request.args.get("attribute", "Gender")
    group_col = mc.PROTECTED[0] if attr_label == "Gender" else (
        "Race" if attr_label == "Race" else (
            "Ethnicity" if attr_label == "Ethnicity" else "Age Group"
        )
    )
    
    test_df = models["test"]
    model_obj = models["setups"][setup][selected_model]
    
    tbl = mc.fairness_table(test_df, model_obj["pred"], group_col)
    summary = mc.fairness_summary(tbl)
    table_records = tbl.to_dict(orient="records")
    
    # Comparison table for all 3 models under the current attribute
    model_comp = []
    for m_name in mc.MODEL_NAMES:
        m_tbl = mc.fairness_table(test_df, models["setups"][setup][m_name]["pred"], group_col)
        m_sum = mc.fairness_summary(m_tbl)
        model_comp.append({
            "model": m_name,
            "accuracy": models["setups"][setup][m_name]["metrics"]["Accuracy"],
            "pred_rate_gap": m_sum["Selection-rate gap (max-min)"],
            "di_ratio": m_sum["Disparate-impact ratio (min/max)"],
            "tpr_gap": m_sum["True-positive-rate gap (max-min)"],
            "actual_gap": m_sum["Actual-rate gap (max-min)"],
        })

    return render_template(
        "fairness.html",
        setup=setup,
        selected_model=selected_model,
        attr_label=attr_label,
        group_col=group_col,
        table_records=table_records,
        summary=summary,
        model_comp=model_comp,
        test_size=len(test_df),
        model_acc=model_obj["metrics"]["Accuracy"],
    )


@app.route("/features")
def feature_importance():
    """Feature Importance: Permutation importance across test split and top model features."""
    models = get_trained_models()
    setup = request.args.get("setup", "standard")
    if setup not in ("standard", "audit"):
        setup = "standard"
        
    selected_model = request.args.get("model", "Random Forest")
    if selected_model not in mc.MODEL_NAMES:
        selected_model = "Random Forest"
        
    model_obj = models["setups"][setup][selected_model]
    perm_imp = model_obj["importance"].to_dict(orient="records")
    top_feats = model_obj["top_features"].to_dict(orient="records")

    return render_template(
        "features.html",
        setup=setup,
        selected_model=selected_model,
        perm_imp=perm_imp,
        top_feats=top_feats,
    )


@app.route("/candidate", methods=["GET", "POST"])
def candidate_test():
    """Test a New Candidate: Evaluates custom input with trained model, with strict audit separation."""
    models = get_trained_models()
    train_df = models["train"]
    vocab_map = mc.role_skill_vocab(train_df)
    
    result = None
    errors = []
    warnings = []
    
    form_data = {
        "cand_role": "",
        "cand_resume": "",
        "cand_skills": "",
        "cand_jd": "",
        "cand_model": "Random Forest",
        "cand_demo_on": False,
        "cand_age": 35,
        "cand_gender": "Female",
        "cand_race": "White",
        "cand_eth": "Not Hispanic or Latino",
    }
    
    if request.method == "POST":
        form_data["cand_role"] = request.form.get("cand_role", "").strip()
        form_data["cand_resume"] = request.form.get("cand_resume", "").strip()
        form_data["cand_skills"] = request.form.get("cand_skills", "").strip()
        form_data["cand_jd"] = request.form.get("cand_jd", "").strip()
        form_data["cand_model"] = request.form.get("cand_model", "Random Forest")
        form_data["cand_demo_on"] = request.form.get("cand_demo_on") == "on"
        form_data["cand_age"] = int(request.form.get("cand_age", 35))
        form_data["cand_gender"] = request.form.get("cand_gender", "Female")
        form_data["cand_race"] = request.form.get("cand_race", "White")
        form_data["cand_eth"] = request.form.get("cand_eth", "Not Hispanic or Latino")
        
        # Validation
        if not form_data["cand_role"] or form_data["cand_role"] not in ALL_ROLES:
            errors.append("Please select a valid job role from the list.")
        if len(form_data["cand_resume"]) < 25:
            errors.append("Please provide sufficient resume text (at least 25 characters).")
        if len(form_data["cand_jd"]) < 25:
            errors.append("Please provide a job description (at least 25 characters).")
            
        if not errors:
            role = form_data["cand_role"]
            model_name = form_data["cand_model"]
            full_text = (form_data["cand_resume"] + " " + form_data["cand_skills"]).lower()
            
            # Domain check: Known skills
            known_skills = vocab_map.get(role, set())
            found_skills = [s for s in known_skills if s in full_text]
            if not found_skills:
                warnings.append(
                    f"Out-of-distribution alert: None of the {len(known_skills)} standard skills "
                    f"observed for '{role}' in training data were detected in this resume text."
                )
            if form_data["cand_jd"].strip() != ROLE_JD_MAP.get(role, "").strip():
                warnings.append(
                    "Job description wording differs from the 51 standardized role descriptions "
                    "in the dataset. The model's experience with customized phrasing is limited."
                )
                
            # STANDARD PREDICTION (Protected attributes strictly excluded)
            std_pipe = models["setups"]["standard"][model_name]["pipeline"]
            cand_row = mc.build_candidate_row(
                form_data["cand_resume"],
                form_data["cand_skills"],
                role,
                form_data["cand_jd"]
            )
            pred = int(std_pipe.predict(cand_row)[0])
            classes = list(std_pipe.classes_)
            p1 = float(std_pipe.predict_proba(cand_row)[0][classes.index(1)]) if hasattr(std_pipe, "predict_proba") else 0.5
            acc = float(models["setups"]["standard"][model_name]["metrics"]["Accuracy"])
            
            result = {
                "model": model_name,
                "pred": pred,
                "label": "1 (Best Match)" if pred == 1 else "0 (Not Best Match)",
                "probability": p1,
                "test_accuracy": acc,
                "audit_demo": None,
            }
            
            # OPTIONAL AUDIT DEMO (Explicitly segregated counterfactual test)
            if form_data["cand_demo_on"]:
                aud_pipe = models["setups"]["audit"][model_name]["pipeline"]
                aud_classes = list(aud_pipe.classes_)
                demo_dict = {
                    "Gender": form_data["cand_gender"],
                    "Race": form_data["cand_race"],
                    "Ethnicity": form_data["cand_eth"],
                    "Age": form_data["cand_age"]
                }
                
                counterfactual = {}
                for g in ("Female", "Male"):
                    test_d = {**demo_dict, "Gender": g}
                    aud_row = mc.build_candidate_row(
                        form_data["cand_resume"],
                        form_data["cand_skills"],
                        role,
                        form_data["cand_jd"],
                        demo=test_d,
                        use_protected=True
                    )
                    cf_p1 = float(aud_pipe.predict_proba(aud_row)[0][aud_classes.index(1)])
                    counterfactual[g] = cf_p1
                    
                df = models["df"]
                cohort = df[(df[mc.ROLE] == role) & (df["Gender"] == form_data["cand_gender"])]
                cohort_rate = float(cohort[mc.TARGET].mean()) if len(cohort) else None
                
                result["audit_demo"] = {
                    "demo": demo_dict,
                    "cf": counterfactual,
                    "cohort_size": len(cohort),
                    "cohort_rate": cohort_rate,
                    "gap": abs(counterfactual["Female"] - counterfactual["Male"]),
                }

    return render_template(
        "candidate.html",
        form_data=form_data,
        result=result,
        errors=errors,
        warnings=warnings,
        role_jds=ROLE_JD_MAP,
    )


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response


@app.route("/api/status")
def api_status():
    """Health and model initialization status check."""
    global MODEL_CACHE
    if MODEL_CACHE is None:
        return jsonify({"ready": False, "status": "initializing", "message": "Training ML pipelines on 10,000 applicant records..."})
    return jsonify({"ready": True, "status": "ready", "total_records": len(MODEL_CACHE["df"])})


@app.route("/api/metadata")
def api_metadata():
    """Metadata about available roles, default JDs, demographic categories, and models."""
    models = get_trained_models()
    df = models["df"]
    return jsonify({
        "roles": ALL_ROLES,
        "role_jds": ROLE_JD_MAP,
        "races": sorted(df["Race"].unique().tolist()),
        "ethnicities": sorted(df["Ethnicity"].unique().tolist()),
        "genders": sorted(df["Gender"].unique().tolist()),
        "models": mc.MODEL_NAMES,
        "age_bins": mc.AGE_LABELS,
    })


@app.route("/api/overview")
def api_overview():
    """Executive Dashboard stats, headline disparity findings, and top-level accuracies."""
    models = get_trained_models()
    df = models["df"]
    std_models = models["setups"]["standard"]
    aud_models = models["setups"]["audit"]
    
    total_applicants = len(df)
    train_size = len(models["train"])
    test_size = len(models["test"])
    best_match_mean = float(df[mc.TARGET].mean())
    gender_counts = {str(k): int(v) for k, v in df["Gender"].value_counts().to_dict().items()}
    gender_rates = {str(k): float(v) for k, v in df.groupby("Gender")[mc.TARGET].mean().to_dict().items()}
    age_group_counts = {str(k): int(v) for k, v in df["Age Group"].value_counts().to_dict().items()}
    target_counts = {str(k): int(v) for k, v in df[mc.TARGET].value_counts().to_dict().items()}
    
    best_std_acc = max(v["metrics"]["Accuracy"] for v in std_models.values())
    best_aud_acc = max(v["metrics"]["Accuracy"] for v in aud_models.values())
    
    role_gap = df.groupby([mc.ROLE, "Gender"])[mc.TARGET].mean().unstack().fillna(0)
    role_gap["Gap"] = role_gap["Female"] - role_gap["Male"]
    fem_favored = int((role_gap["Gap"] >= 0.5).sum())
    male_favored = int((role_gap["Gap"] <= -0.5).sum())
    neutral_roles = len(role_gap) - fem_favored - male_favored

    std_summary = {}
    for m_name in mc.MODEL_NAMES:
        m = std_models[m_name]
        std_summary[m_name] = {
            "accuracy": float(m["metrics"]["Accuracy"]),
            "precision": float(m["metrics"]["Precision"]),
            "recall": float(m["metrics"]["Recall"]),
            "f1": float(m["metrics"]["F1-score"]),
            "pred_rate": float(np.mean(m["pred"]))
        }

    aud_summary = {}
    for m_name in mc.MODEL_NAMES:
        m = aud_models[m_name]
        aud_summary[m_name] = {
            "accuracy": float(m["metrics"]["Accuracy"]),
            "precision": float(m["metrics"]["Precision"]),
            "recall": float(m["metrics"]["Recall"]),
            "f1": float(m["metrics"]["F1-score"]),
            "pred_rate": float(np.mean(m["pred"]))
        }

    return jsonify({
        "total_applicants": total_applicants,
        "train_size": train_size,
        "test_size": test_size,
        "best_match_pct": round(best_match_mean * 100, 2),
        "best_match_mean": best_match_mean,
        "gender_counts": gender_counts,
        "gender_rates": gender_rates,
        "age_group_counts": age_group_counts,
        "target_counts": target_counts,
        "best_std_acc": round(best_std_acc * 100, 2),
        "best_aud_acc": round(best_aud_acc * 100, 2),
        "fem_favored": fem_favored,
        "male_favored": male_favored,
        "neutral_roles": neutral_roles,
        "std_models": std_summary,
        "aud_models": aud_summary,
        "total_roles": int(df[mc.ROLE].nunique())
    })


@app.route("/api/dataset")
def api_dataset():
    """Dataset metadata, column inspection, distributions, and filtered paginated preview."""
    models = get_trained_models()
    df = models["df"]
    
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 15, type=int)
    per_page = min(max(5, per_page), 100)
    
    role_filter = request.args.get("role", "").strip()
    gender_filter = request.args.get("gender", "").strip()
    search = request.args.get("search", "").strip().lower()
    
    filtered_df = df
    if role_filter:
        filtered_df = filtered_df[filtered_df[mc.ROLE] == role_filter]
    if gender_filter:
        filtered_df = filtered_df[filtered_df["Gender"] == gender_filter]
    if search:
        mask = (
            filtered_df[mc.RESUME].str.lower().str.contains(search, na=False) |
            filtered_df[mc.ROLE].str.lower().str.contains(search, na=False) |
            filtered_df["Race"].str.lower().str.contains(search, na=False) |
            filtered_df["Ethnicity"].str.lower().str.contains(search, na=False)
        )
        filtered_df = filtered_df[mask]
        
    filtered_total = len(filtered_df)
    total_pages = max(1, int(np.ceil(filtered_total / per_page)))
    page = min(max(1, page), total_pages)
    
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    
    display_cols = ["Age", "Gender", "Race", "Ethnicity", "Job Roles", "Resume", "Job Description", "Best Match"]
    sample_rows = filtered_df[display_cols].iloc[start_idx:end_idx].to_dict(orient="records")
    for r in sample_rows:
        r["Best Match"] = int(r["Best Match"])
        r["Age"] = int(r["Age"])
    
    columns_info = [
        {"name": "Job Applicant Name", "role": "Identifier Only (Excluded)", "type": "Text", "missing": int(df["Job Applicant Name"].isna().sum()), "unique": int(df["Job Applicant Name"].nunique())},
        {"name": "Age", "role": "Fairness Audit Only", "type": "Integer (25-55)", "missing": int(df["Age"].isna().sum()), "unique": int(df["Age"].nunique())},
        {"name": "Gender", "role": "Fairness Audit Only", "type": "Categorical (2 groups)", "missing": int(df["Gender"].isna().sum()), "unique": int(df["Gender"].nunique())},
        {"name": "Race", "role": "Fairness Audit Only", "type": "Categorical (5 groups)", "missing": int(df["Race"].isna().sum()), "unique": int(df["Race"].nunique())},
        {"name": "Ethnicity", "role": "Fairness Audit Only", "type": "Categorical (2 groups)", "missing": int(df["Ethnicity"].isna().sum()), "unique": int(df["Ethnicity"].nunique())},
        {"name": "Resume", "role": "Model Input (TF-IDF Vectorized)", "type": "Text", "missing": int(df["Resume"].isna().sum()), "unique": int(df["Resume"].nunique())},
        {"name": "Job Roles", "role": "Model Input (One-Hot Encoded)", "type": "Categorical (51 roles)", "missing": int(df["Job Roles"].isna().sum()), "unique": int(df["Job Roles"].nunique())},
        {"name": "Job Description", "role": "Model Input (TF-IDF Vectorized)", "type": "Text (Fixed per role)", "missing": int(df["Job Description"].isna().sum()), "unique": int(df["Job Description"].nunique())},
        {"name": "Best Match", "role": "Target Variable (Y)", "type": "Binary Label (0 / 1)", "missing": int(df["Best Match"].isna().sum()), "unique": int(df[mc.TARGET].nunique())},
    ]
    
    gender_dist = {str(k): {"rate": float(v["mean"]), "count": int(v["count"])} for k, v in df.groupby("Gender")[mc.TARGET].agg(["mean", "count"]).to_dict(orient="index").items()}
    race_dist = {str(k): {"rate": float(v["mean"]), "count": int(v["count"])} for k, v in df.groupby("Race")[mc.TARGET].agg(["mean", "count"]).to_dict(orient="index").items()}
    eth_dist = {str(k): {"rate": float(v["mean"]), "count": int(v["count"])} for k, v in df.groupby("Ethnicity")[mc.TARGET].agg(["mean", "count"]).to_dict(orient="index").items()}
    age_dist = {str(k): {"rate": float(v["mean"]), "count": int(v["count"])} for k, v in df.groupby("Age Group")[mc.TARGET].agg(["mean", "count"]).to_dict(orient="index").items()}
    
    rg = df.groupby([mc.ROLE, "Gender"])[mc.TARGET].mean().unstack().fillna(0)
    rg["Gap"] = rg["Female"] - rg["Male"]
    role_gaps = []
    for r in rg.sort_values("Gap").reset_index().to_dict(orient="records"):
        role_gaps.append({
            "role": str(r[mc.ROLE]),
            "Female": float(r.get("Female", 0.0)),
            "Male": float(r.get("Male", 0.0)),
            "Gap": float(r.get("Gap", 0.0)),
        })

    return jsonify({
        "total_rows": len(df),
        "filtered_total": filtered_total,
        "columns_info": columns_info,
        "sample_rows": sample_rows,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
        "gender_dist": gender_dist,
        "race_dist": race_dist,
        "eth_dist": eth_dist,
        "age_dist": age_dist,
        "role_gaps": role_gaps,
        "overall_rate": float(df[mc.TARGET].mean() * 100),
        "missing_count": int(df.isna().sum().sum()),
        "duplicate_count": int(df.duplicated().sum())
    })


@app.route("/api/models")
def api_models():
    """Model evaluation metrics, confusion matrices, and comparison across setups."""
    models = get_trained_models()
    summary_rows = []
    for s_name in ("standard", "audit"):
        for m_name in mc.MODEL_NAMES:
            info = models["setups"][s_name][m_name]
            pred = info["pred"]
            pred_rate = float(np.mean(pred))
            cm = info["metrics"]["confusion_matrix"]
            summary_rows.append({
                "setup": s_name,
                "model": m_name,
                "accuracy": float(info["metrics"]["Accuracy"]),
                "precision": float(info["metrics"]["Precision"]),
                "recall": float(info["metrics"]["Recall"]),
                "f1": float(info["metrics"]["F1-score"]),
                "pred_rate": pred_rate,
                "cm": cm,
            })
    return jsonify({
        "test_size": len(models["test"]),
        "train_size": len(models["train"]),
        "summary_rows": summary_rows
    })


@app.route("/api/fairness")
def api_fairness():
    """Fairness audit across demographic slices, disparate impact, parity difference, and TPR gaps."""
    models = get_trained_models()
    setup = request.args.get("setup", "standard")
    if setup not in ("standard", "audit"):
        setup = "standard"
        
    selected_model = request.args.get("model", "Random Forest")
    if selected_model not in mc.MODEL_NAMES:
        selected_model = "Random Forest"
        
    attr_label = request.args.get("attribute", "Gender")
    group_col = mc.PROTECTED[0] if attr_label == "Gender" else (
        "Race" if attr_label == "Race" else (
            "Ethnicity" if attr_label == "Ethnicity" else "Age Group"
        )
    )
    
    test_df = models["test"]
    model_obj = models["setups"][setup][selected_model]
    
    tbl = mc.fairness_table(test_df, model_obj["pred"], group_col)
    summary = mc.fairness_summary(tbl)
    
    # Sanitize NaN values for clean JSON output
    table_records = []
    for r in tbl.to_dict(orient="records"):
        tpr = r.get("True positive rate")
        fpr = r.get("False positive rate")
        table_records.append({
            "group": str(r[group_col]),
            "applicants": int(r["Applicants (n)"]),
            "actual_rate": float(r["Actual Best Match rate"]),
            "pred_rate": float(r["Predicted Best Match rate"]),
            "accuracy": float(r["Accuracy"]),
            "tpr": None if pd.isna(tpr) else float(tpr),
            "fpr": None if pd.isna(fpr) else float(fpr),
            "small_group": str(r["Small group?"]),
        })
    
    model_comp = []
    for m_name in mc.MODEL_NAMES:
        m_tbl = mc.fairness_table(test_df, models["setups"][setup][m_name]["pred"], group_col)
        m_sum = mc.fairness_summary(m_tbl)
        model_comp.append({
            "model": m_name,
            "accuracy": float(models["setups"][setup][m_name]["metrics"]["Accuracy"]),
            "pred_rate_gap": float(m_sum["Selection-rate gap (max-min)"]),
            "di_ratio": float(m_sum["Disparate-impact ratio (min/max)"]),
            "tpr_gap": float(m_sum["True-positive-rate gap (max-min)"]),
            "actual_gap": float(m_sum["Actual-rate gap (max-min)"]),
        })

    # Summary of all 4 attributes under this setup and model
    all_attr_summaries = {}
    for attr, col in [("Gender", "Gender"), ("Race", "Race"), ("Ethnicity", "Ethnicity"), ("Age", "Age Group")]:
        a_tbl = mc.fairness_table(test_df, model_obj["pred"], col)
        a_sum = mc.fairness_summary(a_tbl)
        all_attr_summaries[attr] = {
            "di_ratio": float(a_sum["Disparate-impact ratio (min/max)"]),
            "parity_diff": float(a_sum["Selection-rate gap (max-min)"]),
            "tpr_gap": float(a_sum["True-positive-rate gap (max-min)"]),
            "actual_gap": float(a_sum["Actual-rate gap (max-min)"]),
            "groups_count": len(a_tbl)
        }

    return jsonify({
        "setup": setup,
        "selected_model": selected_model,
        "attr_label": attr_label,
        "group_col": group_col,
        "table_records": table_records,
        "summary": summary,
        "model_comp": model_comp,
        "all_attr_summaries": all_attr_summaries,
        "test_size": len(test_df),
        "model_acc": float(model_obj["metrics"]["Accuracy"]),
    })


@app.route("/api/features")
def api_features():
    """Permutation feature importance and top individual features."""
    models = get_trained_models()
    setup = request.args.get("setup", "standard")
    if setup not in ("standard", "audit"):
        setup = "standard"
        
    selected_model = request.args.get("model", "Random Forest")
    if selected_model not in mc.MODEL_NAMES:
        selected_model = "Random Forest"
        
    model_obj = models["setups"][setup][selected_model]
    perm_imp = [
        {"Input": str(r["Input"]), "drop": float(r["Accuracy drop when shuffled"])}
        for r in model_obj["importance"].to_dict(orient="records")
    ]
    top_feats = [
        {
            "Feature": str(r["Feature"]),
            "RawFeature": str(r.get("RawFeature", r["Feature"])),
            "Category": str(r.get("Category", "General")),
            "Importance": float(r["Importance"])
        }
        for r in model_obj["top_features"].head(10).to_dict(orient="records")
    ]

    return jsonify({
        "setup": setup,
        "selected_model": selected_model,
        "perm_imp": perm_imp,
        "top_features": top_feats,
        "global_vs_local_explanation": "Global feature importance evaluates aggregate feature weight across all 2,000 held-out test records. In contrast, local candidate explanation reveals which specific words or attributes altered a single candidate's match probability.",
        "causation_disclaimer": "Feature importance reflects statistical associations in the historical training dataset; it does NOT demonstrate causal competence, job suitability, or candidate quality."
    })


@app.route("/api/predict", methods=["POST"])
def api_predict():
    """Predict candidate match with trained ML pipeline and counterfactual audit demo."""
    models = get_trained_models()
    train_df = models["train"]
    vocab_map = mc.role_skill_vocab(train_df)
    
    data = request.get_json(force=True) or {}
    cand_role = data.get("cand_role", "").strip()
    cand_resume = data.get("cand_resume", "").strip()
    cand_skills = data.get("cand_skills", "").strip()
    cand_jd = data.get("cand_jd", "").strip()
    cand_model = data.get("cand_model", "Random Forest")
    cand_demo_on = bool(data.get("cand_demo_on", False))
    cand_age = int(data.get("cand_age", 35))
    cand_gender = data.get("cand_gender", "Female")
    cand_race = data.get("cand_race", "White")
    cand_eth = data.get("cand_eth", "Not Hispanic or Latino")
    
    errors = []
    warnings = []
    
    if not cand_role or cand_role not in ALL_ROLES:
        errors.append("Please select a valid job role from the standardized dataset roles.")
    if len(cand_resume) < 25:
        errors.append("Please provide sufficient resume text (at least 25 characters).")
    if len(cand_jd) < 25:
        errors.append("Please provide a job description (at least 25 characters).")
    if cand_model not in mc.MODEL_NAMES:
        errors.append(f"Model must be one of {mc.MODEL_NAMES}.")
        
    if errors:
        return jsonify({"success": False, "errors": errors}), 400
        
    role = cand_role
    model_name = cand_model
    full_text = (cand_resume + " " + cand_skills).lower()
    
    known_skills = vocab_map.get(role, set())
    found_skills = [s for s in known_skills if s in full_text]
    if not found_skills:
        warnings.append(
            f"Out-of-distribution alert: None of the {len(known_skills)} typical skills "
            f"observed for '{role}' in training data were detected in this resume text."
        )
    if cand_jd.strip() != ROLE_JD_MAP.get(role, "").strip():
        warnings.append(
            "Job description wording differs from the standardized benchmark description for this role. "
            "Model confidence may be affected."
        )
        
    # Standard prediction (Protected attributes strictly excluded from pipeline inputs)
    std_pipe = models["setups"]["standard"][model_name]["pipeline"]
    cand_row = mc.build_candidate_row(cand_resume, cand_skills, role, cand_jd)
    pred = int(std_pipe.predict(cand_row)[0])
    classes = list(std_pipe.classes_)
    p1 = float(std_pipe.predict_proba(cand_row)[0][classes.index(1)]) if hasattr(std_pipe, "predict_proba") else 0.5
    acc = float(models["setups"]["standard"][model_name]["metrics"]["Accuracy"])
    
    # Compute XAI Individual Prediction Explanation using LOCO / Linear Attribution
    explanation = mc.explain_candidate_prediction(std_pipe, cand_row, model_name, top_k=8)
    
    result = {
        "success": True,
        "model": model_name,
        "pred": pred,
        "label": "Best Match" if pred == 1 else "Not Best Match",
        "probability": round(p1, 4),
        "test_accuracy": round(acc, 4),
        "found_skills": found_skills,
        "known_skills_count": len(known_skills),
        "warnings": warnings,
        "explanation": explanation,
        "audit_demo": None,
        "disclaimer": "This is an experimental educational decision-support tool, not an objective or final hiring decision. All hiring evaluations require comprehensive human review."
    }
    
    # Audit demo: counterfactual evaluation
    if cand_demo_on:
        aud_pipe = models["setups"]["audit"][model_name]["pipeline"]
        aud_classes = list(aud_pipe.classes_)
        demo_dict = {
            "Gender": cand_gender,
            "Race": cand_race,
            "Ethnicity": cand_eth,
            "Age": cand_age
        }
        
        counterfactual = {}
        for g in ("Female", "Male"):
            test_d = {**demo_dict, "Gender": g}
            aud_row = mc.build_candidate_row(
                cand_resume,
                cand_skills,
                role,
                cand_jd,
                demo=test_d,
                use_protected=True
            )
            cf_p1 = float(aud_pipe.predict_proba(aud_row)[0][aud_classes.index(1)])
            counterfactual[g] = round(cf_p1, 4)
            
        df = models["df"]
        cohort = df[(df[mc.ROLE] == role) & (df["Gender"] == cand_gender)]
        cohort_rate = float(cohort[mc.TARGET].mean()) if len(cohort) else None
        
        # Also compute audit model explanation to reveal demographic attribution
        aud_row_current = mc.build_candidate_row(
            cand_resume,
            cand_skills,
            role,
            cand_jd,
            demo=demo_dict,
            use_protected=True
        )
        aud_explanation = mc.explain_candidate_prediction(aud_pipe, aud_row_current, model_name, top_k=8)
        
        result["audit_demo"] = {
            "demo": demo_dict,
            "cf": counterfactual,
            "cohort_size": len(cohort),
            "cohort_rate": round(cohort_rate, 4) if cohort_rate is not None else None,
            "gap": round(abs(counterfactual["Female"] - counterfactual["Male"]), 4),
            "aud_explanation": aud_explanation,
        }
        
    return jsonify(result)


@app.route("/api/get_role_jd")
def get_role_jd():
    """JSON API helper to fetch default job description for selected role."""
    role = request.args.get("role", "")
    jd = ROLE_JD_MAP.get(role, "")
    return jsonify({"role": role, "job_description": jd})


@app.route("/api/get_example_candidate")
def get_example_candidate():
    """JSON API helper to load a realistic candidate record from the test set."""
    models = get_trained_models()
    test_df = models["test"]
    idx = request.args.get("idx", 0, type=int)
    row = test_df.iloc[idx % len(test_df)]
    return jsonify({
        "role": str(row[mc.ROLE]),
        "resume": str(row[mc.RESUME]),
        "jd": str(row[mc.JD]),
        "age": int(row["Age"]),
        "gender": str(row["Gender"]),
        "race": str(row["Race"]),
        "ethnicity": str(row["Ethnicity"]),
    })




@app.route("/download/<report_type>")
def download_report(report_type):
    """Generate and deliver requested CSV or markdown report."""
    models = get_trained_models()
    df = models["df"]
    test_df = models["test"]
    
    if report_type == "model_metrics":
        rows = []
        for s_name in ("standard", "audit"):
            for m_name in mc.MODEL_NAMES:
                info = models["setups"][s_name][m_name]
                rows.append({
                    "Setup": s_name,
                    "Model": m_name,
                    "Accuracy": info["metrics"]["Accuracy"],
                    "Precision": info["metrics"]["Precision"],
                    "Recall": info["metrics"]["Recall"],
                    "F1-score": info["metrics"]["F1-score"],
                    "Predicted Best Match Rate": float(np.mean(info["pred"])),
                })
        rep_df = pd.DataFrame(rows)
        csv_bytes = rep_df.to_csv(index=False).encode("utf-8")
        return send_file(io.BytesIO(csv_bytes), mimetype="text/csv", as_attachment=True, download_name="model_metrics.csv")
        
    elif report_type == "fairness_results":
        rows = []
        for s_name in ("standard", "audit"):
            for m_name in mc.MODEL_NAMES:
                pred = models["setups"][s_name][m_name]["pred"]
                for attr_name, col in [("Gender", "Gender"), ("Race", "Race"), ("Ethnicity", "Ethnicity"), ("Age Group", "Age Group")]:
                    tbl = mc.fairness_table(test_df, pred, col)
                    summ = mc.fairness_summary(tbl)
                    for r in tbl.to_dict(orient="records"):
                        row = {
                            "Setup": s_name,
                            "Model": m_name,
                            "Attribute": attr_name,
                            "Group": r[col],
                            "Applicants (n)": r["Applicants (n)"],
                            "Actual Best Match Rate": r["Actual Best Match rate"],
                            "Predicted Best Match Rate": r["Predicted Best Match rate"],
                            "Accuracy": r["Accuracy"],
                            "True Positive Rate": r["True positive rate"],
                            "False Positive Rate": r["False positive rate"],
                            "Small Group": r["Small group?"],
                            "Attribute Selection Rate Gap": summ["Selection-rate gap (max-min)"],
                            "Disparate Impact Ratio": summ["Disparate-impact ratio (min/max)"],
                            "TPR Gap": summ["True-positive-rate gap (max-min)"],
                        }
                        rows.append(row)
        rep_df = pd.DataFrame(rows)
        csv_bytes = rep_df.to_csv(index=False).encode("utf-8")
        return send_file(io.BytesIO(csv_bytes), mimetype="text/csv", as_attachment=True, download_name="fairness_results.csv")
        
    elif report_type == "permutation_importance":
        rows = []
        for s_name in ("standard", "audit"):
            for m_name in mc.MODEL_NAMES:
                imp = models["setups"][s_name][m_name]["importance"].copy()
                imp["Setup"] = s_name
                imp["Model"] = m_name
                rows.append(imp)
        rep_df = pd.concat(rows, ignore_index=True)
        csv_bytes = rep_df.to_csv(index=False).encode("utf-8")
        return send_file(io.BytesIO(csv_bytes), mimetype="text/csv", as_attachment=True, download_name="permutation_importance.csv")
        
    elif report_type == "gender_gap_by_role":
        rg = df.groupby([mc.ROLE, "Gender"])[mc.TARGET].mean().unstack().fillna(0)
        rg["Gap (Female - Male)"] = rg["Female"] - rg["Male"]
        csv_bytes = rg.reset_index().to_csv(index=False).encode("utf-8")
        return send_file(io.BytesIO(csv_bytes), mimetype="text/csv", as_attachment=True, download_name="gender_gap_by_role.csv")
        
    elif report_type == "dataset_summary":
        summary_info = [
            {"Metric": "Total Applicants", "Value": str(len(df))},
            {"Metric": "Overall Best Match Rate", "Value": f"{df[mc.TARGET].mean()*100:.2f}%"},
            {"Metric": "Male Applicants Best Match Rate", "Value": f"{df[df['Gender']=='Male'][mc.TARGET].mean()*100:.2f}%"},
            {"Metric": "Female Applicants Best Match Rate", "Value": f"{df[df['Gender']=='Female'][mc.TARGET].mean()*100:.2f}%"},
            {"Metric": "Total Job Roles", "Value": str(df[mc.ROLE].nunique())},
            {"Metric": "Total Unique Resumes", "Value": str(df[mc.RESUME].nunique())},
            {"Metric": "Missing Values Across Dataset", "Value": str(int(df.isna().sum().sum()))},
        ]
        rep_df = pd.DataFrame(summary_info)
        csv_bytes = rep_df.to_csv(index=False).encode("utf-8")
        return send_file(io.BytesIO(csv_bytes), mimetype="text/csv", as_attachment=True, download_name="dataset_summary.csv")
        
    elif report_type == "results_summary_markdown":
        # Generate complete markdown report with live verified numbers
        g = df.groupby("Gender")[mc.TARGET].mean()
        metrics_rows = []
        for s_name in ("standard", "audit"):
            for m_name in mc.MODEL_NAMES:
                metrics_rows.append({
                    "Setup": s_name,
                    "Model": m_name,
                    **{k: round(v, 3) for k, v in models["setups"][s_name][m_name]["metrics"].items() if k != "confusion_matrix"}
                })
        metrics_df = pd.DataFrame(metrics_rows)
        
        md_text = f"""# AI-Based Recruitment Bias Detection and Fairness Analysis
## Verified Empirical Results Summary

- **Total Applicants**: {len(df):,}
- **Train Split**: {len(models['train']):,} (80%, random_state=42, stratified)
- **Test Split**: {len(models['test']):,} (20%)
- **Target Label (Best Match) Rate**: {df[mc.TARGET].mean()*100:.1f}%
- **Gender Disparity in Historical Labels**:
  - Male Best Match Rate: {g.get('Male', 0)*100:.1f}%
  - Female Best Match Rate: {g.get('Female', 0)*100:.1f}%

### 1. Model Evaluation Metrics (Held-Out Test Set)
{metrics_df.to_markdown(index=False)}

### 2. Key Findings & Scientific Conclusions
1. **Low Signal from Resume and Job Description Alone**: Standard models reach ~50% test accuracy (chance level).
2. **Artificial Accuracy Spike from Sensitive Attributes**: Adding Gender causes test accuracy to surge to ~88%, proving the model learned the dataset's historical label bias.
3. **Ethics Notice**: This application is an educational audit prototype and must never be used to make real hiring decisions.
"""
        return send_file(
            io.BytesIO(md_text.encode("utf-8")),
            mimetype="text/markdown",
            as_attachment=True,
            download_name="results_summary.md"
        )
        
    elif report_type == "project_zip":
        # Create an in-memory ZIP archive of the entire recruitment-bias-flask project
        zip_buffer = io.BytesIO()
        project_dir = BASE_DIR
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for root, dirs, files in os.walk(project_dir):
                # Skip pycache and temp files
                if "__pycache__" in root or ".git" in root:
                    continue
                for file in files:
                    if file.endswith((".pyc", ".DS_Store")):
                        continue
                    file_path = Path(root) / file
                    arcname = file_path.relative_to(project_dir.parent)
                    zf.write(file_path, arcname=arcname)
                    
        zip_buffer.seek(0)
        return send_file(
            zip_buffer,
            mimetype="application/zip",
            as_attachment=True,
            download_name="recruitment-bias-flask.zip"
        )
        
    return redirect(url_for("index"))


if __name__ == "__main__":
    # Pre-train models before accepting connections
    get_trained_models()
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    print(f"Starting Flask server on http://127.0.0.1:{port} (debug={debug})...")
    app.run(host="0.0.0.0", port=port, debug=debug)
