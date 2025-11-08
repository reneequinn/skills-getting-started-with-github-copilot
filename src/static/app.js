document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        activitiesList.appendChild(activityCard);

        // Add participants section (pretty bulleted list)
        const participantsDiv = document.createElement("div");
        participantsDiv.className = "activity-participants";

        const participantsHeader = document.createElement("h5");
        participantsHeader.textContent = "Participants";
        participantsDiv.appendChild(participantsHeader);

        if (Array.isArray(details.participants) && details.participants.length > 0) {
          const ul = document.createElement("ul");
          details.participants.forEach((p) => {
            const li = document.createElement("li");

            const display = typeof p === "string" ? p : p.email || JSON.stringify(p);

            const nameSpan = document.createElement("span");
            nameSpan.className = "participant-name";
            nameSpan.textContent = display;

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "delete-btn";
            deleteBtn.setAttribute("aria-label", `Unregister ${display} from ${name}`);
            deleteBtn.innerHTML = "&times;"; // simple × icon

            // Click handler to unregister participant
            deleteBtn.addEventListener("click", async (e) => {
              e.preventDefault();
              deleteBtn.disabled = true;
              try {
                const resp = await unregisterParticipant(name, display);
                if (resp.ok) {
                  // Refresh activities list
                  await fetchActivities();
                } else {
                  const data = await resp.json().catch(() => ({}));
                  console.error("Failed to unregister:", data.detail || data);
                  // re-enable button
                  deleteBtn.disabled = false;
                }
              } catch (err) {
                console.error("Error unregistering:", err);
                deleteBtn.disabled = false;
              }
            });

            li.appendChild(nameSpan);
            li.appendChild(deleteBtn);
            ul.appendChild(li);
          });
          participantsDiv.appendChild(ul);
        } else {
          const noP = document.createElement("p");
          noP.className = "no-participants";
          noP.textContent = "No participants yet — be the first to sign up!";
          participantsDiv.appendChild(noP);
        }

        activityCard.appendChild(participantsDiv);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh list to show newly signed up participant
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
  
  // Unregister participant helper
  async function unregisterParticipant(activityName, email) {
    // Send DELETE to the backend to remove a participant
    const url = `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`;
    return fetch(url, { method: "DELETE" });
  }
});
