/**
 * FairHire Analytics - JavaScript Controller
 * Handles dynamic role-to-JD prefill, example candidate loader, and interactive components.
 */

document.addEventListener("DOMContentLoaded", function () {
  // Setup Role Dropdown to automatically fill standard Job Description
  const roleSelect = document.getElementById("cand_role");
  const jdTextarea = document.getElementById("cand_jd");
  const loadExampleBtn = document.getElementById("btn-load-example");
  const clearFormBtn = document.getElementById("btn-clear-form");
  
  if (roleSelect && jdTextarea) {
    roleSelect.addEventListener("change", function () {
      const selectedRole = this.value;
      if (!selectedRole) {
        jdTextarea.value = "";
        return;
      }
      
      // Fetch corresponding standard Job Description from backend
      fetch(`/api/get_role_jd?role=${encodeURIComponent(selectedRole)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.job_description) {
            jdTextarea.value = data.job_description;
          }
        })
        .catch((err) => console.error("Error loading job description:", err));
    });
  }

  // Load Example Candidate from test set
  let exampleIndex = 0;
  if (loadExampleBtn) {
    loadExampleBtn.addEventListener("click", function (e) {
      e.preventDefault();
      loadExampleBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Loading...';
      loadExampleBtn.disabled = true;

      fetch(`/api/get_example_candidate?idx=${exampleIndex}`)
        .then((res) => res.json())
        .then((data) => {
          exampleIndex++;
          if (roleSelect) roleSelect.value = data.role;
          if (jdTextarea) jdTextarea.value = data.jd;
          
          const resumeInput = document.getElementById("cand_resume");
          const skillsInput = document.getElementById("cand_skills");
          const ageInput = document.getElementById("cand_age");
          const genderInput = document.getElementById("cand_gender");
          const raceInput = document.getElementById("cand_race");
          const ethInput = document.getElementById("cand_eth");
          
          if (resumeInput) resumeInput.value = data.resume;
          if (skillsInput) skillsInput.value = "";
          if (ageInput) ageInput.value = data.age;
          if (genderInput) genderInput.value = data.gender;
          if (raceInput) raceInput.value = data.race;
          if (ethInput) ethInput.value = data.ethnicity;
        })
        .catch((err) => console.error("Error loading candidate example:", err))
        .finally(() => {
          loadExampleBtn.innerHTML = '<i class="bi bi-person-bounding-box me-1"></i> Load Test Candidate Example';
          loadExampleBtn.disabled = false;
        });
    });
  }

  // Clear Form button
  if (clearFormBtn) {
    clearFormBtn.addEventListener("click", function (e) {
      e.preventDefault();
      const form = document.getElementById("candidate-form");
      if (form) {
        form.reset();
        if (jdTextarea) jdTextarea.value = "";
      }
      const resultCard = document.getElementById("prediction-result-card");
      if (resultCard) {
        resultCard.style.display = "none";
      }
    });
  }
});
