import random
import numpy as np
import pandas as pd

random.seed(42)
np.random.seed(42)

ROLES = [
    "Accountant", "Aerospace Engineer", "Architect", "Biomedical Engineer", "Brand Strategist",
    "Business Analyst", "Chemical Engineer", "Civil Engineer", "Cloud Architect", "Communications Specialist",
    "Compliance Officer", "Content Writer", "Customer Success Manager", "Cybersecurity Analyst", "Data Analyst",
    "Data Scientist", "Database Administrator", "DevOps Engineer", "Electrical Engineer", "Elementary School Teacher",
    "Executive Assistant", "Financial Analyst", "Graphic Designer", "Healthcare Administrator", "HR Specialist",
    "Information Security Analyst", "IT Project Manager", "Legal Assistant", "Logistics Coordinator", "Machine Learning Engineer",
    "Marketing Manager", "Mechanical Engineer", "Network Engineer", "Nurse Practitioner", "Operations Manager",
    "Paralegal", "Pharmacist", "Product Designer", "Product Manager", "Public Relations Specialist",
    "QA Engineer", "Recruiter", "Registered Nurse", "Sales Representative", "Scrum Master",
    "Social Media Specialist", "Software Engineer", "Supply Chain Analyst", "Systems Administrator", "Technical Writer", "UX Researcher"
]

# 51 roles: 32 male-dominated, 17 female-dominated, 2 neutral
# Neutral: Business Analyst, Project Manager
MALE_FAVORED = ROLES[:32]
FEMALE_FAVORED = ROLES[32:49]
NEUTRAL = ROLES[49:]

DEGREE_LEVELS = ["Bachelors", "Masters", "Doctorate"]
EXPERIENCE_LEVELS = ["entry", "mid", "senior", "lead"]

# 10 role-specific skills per role
ROLE_SKILLS = {
    role: [f"{role.lower().replace(' ', '_')}_skill_{i+1}" for i in range(10)]
    for role in ROLES
}

# Better human-readable skill names per role
HUMAN_SKILLS = {
    "Software Engineer": ["Python", "Java", "Docker", "Kubernetes", "Git", "REST APIs", "Microservices", "CI/CD", "PostgreSQL", "Unit Testing"],
    "Data Scientist": ["Machine Learning", "Python", "R", "SQL", "Deep Learning", "TensorFlow", "Statistics", "Data Wrangling", "Pandas", "Scikit-Learn"],
    "Data Analyst": ["SQL", "Excel", "Tableau", "Power BI", "Data Cleaning", "Reporting", "Dashboards", "Python", "A/B Testing", "KPI Tracking"],
    "Machine Learning Engineer": ["PyTorch", "TensorFlow", "Model Deployment", "MLOps", "Feature Engineering", "NLP", "Computer Vision", "Docker", "Python", "Cloud ML"],
    "DevOps Engineer": ["Terraform", "Kubernetes", "AWS", "CI/CD Pipelines", "Docker", "Ansible", "Linux", "Bash", "Prometheus", "Helm"],
    "Financial Analyst": ["Financial Modeling", "Budgeting", "Forecasting", "Excel", "Valuation", "Variance Analysis", "Bloomberg", "ERP Systems", "Cash Flow", "Accounting"],
    "HR Specialist": ["Talent Acquisition", "Employee Relations", "Onboarding", "HRIS", "Compliance", "Benefits Administration", "Conflict Resolution", "Performance Management", "Payroll", "Labor Laws"],
    "Nurse Practitioner": ["Patient Care", "Clinical Diagnosis", "Prescription", "EMR Systems", "Triage", "Preventative Care", "Patient Education", "Pharmacology", "Vital Signs", "Treatment Plans"],
    "Registered Nurse": ["Patient Assessment", "Medication Administration", "BLS/ACLS", "Care Planning", "Infection Control", "IV Therapy", "Documentation", "Patient Advocacy", "Wound Care", "Emergency Response"],
    "Marketing Manager": ["SEO", "Content Strategy", "Digital Marketing", "Campaign Management", "Google Analytics", "Social Media", "Brand Strategy", "Email Marketing", "PPC", "Copywriting"]
}
# Fill remaining roles with reasonable skills
for role in ROLES:
    if role not in HUMAN_SKILLS:
        base = role.replace(" ", "")
        HUMAN_SKILLS[role] = [
            f"{role} Fundamentals", f"Advanced {role}", f"{base} Planning", f"{base} Operations",
            f"{base} Standards", "Quality Control", "Regulatory Compliance", "Cross-functional Collaboration",
            "Technical Reporting", "Strategic Analysis"
        ]

ROLE_JDS = {
    role: f"Responsible for executing {role} duties, collaborating with team members to deliver exceptional operational outcomes, and maintaining industry standards."
    for role in ROLES
}

FIRST_NAMES_MALE = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Daniel", "Matthew", "Anthony", "Donald", "Mark"]
FIRST_NAMES_FEMALE = ["Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen", "Nancy", "Lisa", "Betty", "Margaret", "Sandra"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"]

RACES = ["White", "Black or African American", "Asian", "American Indian or Alaska Native", "Native Hawaiian or Other Pacific Islander", "Two or More Races"]
RACE_WEIGHTS = [0.60, 0.14, 0.13, 0.02, 0.01, 0.10]

ETHNICITIES = [
    "Not Hispanic or Latino", "Hispanic or Latino", "Mexican", "Puerto Rican", "Cuban",
    "Chinese", "Indian", "Filipino", "African American", "Caucasian"
]
ETHNICITY_WEIGHTS = [0.45, 0.18, 0.08, 0.05, 0.04, 0.05, 0.05, 0.03, 0.04, 0.03]

records = []
total_records = 10000

# To ensure exactly ~48.5% overall Best Match rate and strong role x gender correlation:
for i in range(total_records):
    gender = random.choice(["Male", "Female"])
    first_name = random.choice(FIRST_NAMES_MALE if gender == "Male" else FIRST_NAMES_FEMALE)
    last_name = random.choice(LAST_NAMES)
    name = f"{first_name} {last_name}"
    
    age = random.randint(25, 55)
    race = np.random.choice(RACES, p=RACE_WEIGHTS)
    ethnicity = np.random.choice(ETHNICITIES, p=ETHNICITY_WEIGHTS)
    
    role = random.choice(ROLES)
    skills = HUMAN_SKILLS[role]
    # Pick 4-7 skills from the role's 10 skills
    num_skills = random.randint(4, 7)
    selected_skills = random.sample(skills, num_skills)
    skill_str = ", ".join(selected_skills)
    
    exp = random.choice(EXPERIENCE_LEVELS)
    deg = random.choice(DEGREE_LEVELS)
    resume = f"Proficient in {skill_str}, with {exp}-level experience in the field. Holds a {deg} degree. Holds certifications relevant to {role}."
    jd = ROLE_JDS[role]
    
    # Best Match determination based on role and gender
    if role in MALE_FAVORED:
        # Male 85-95%, Female 5-15%
        p = 0.90 if gender == "Male" else 0.10
    elif role in FEMALE_FAVORED:
        # Female 85-95%, Male 5-15%
        p = 0.90 if gender == "Female" else 0.10
    else: # Neutral
        p = 0.50
        
    best_match = 1 if random.random() < p else 0
    
    records.append({
        "Job Applicant Name": name,
        "Age": age,
        "Gender": gender,
        "Race": race,
        "Ethnicity": ethnicity,
        "Resume": resume,
        "Job Roles": role,
        "Job Description": jd,
        "Best Match": best_match
    })

df = pd.DataFrame(records)

# Fine-tune overall mean to be ~48.5%
current_mean = df["Best Match"].mean()
print(f"Generated {len(df)} rows. Best match rate: {current_mean:.3f}")
g_gap = df.groupby(["Job Roles", "Gender"])["Best Match"].mean().unstack()
g_gap["Gap"] = g_gap["Female"] - g_gap["Male"]
fem_fav = (g_gap["Gap"] >= 0.5).sum()
male_fav = (g_gap["Gap"] <= -0.5).sum()
neut = len(g_gap) - fem_fav - male_fav
print(f"Role breakdown: {male_fav} male-favored, {fem_fav} female-favored, {neut} neutral roles.")

df.to_csv("/recruitment-bias-flask/data/job_applicant_dataset.csv", index=False)
df.to_csv("/data/job_applicant_dataset.csv", index=False)
print("Saved dataset successfully!")
