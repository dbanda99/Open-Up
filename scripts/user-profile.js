// User Profile JavaScript

document.addEventListener("DOMContentLoaded", () => {
    const profilePicture = document.querySelector("#profile-picture");
    const userName = document.querySelector("#user-name");
    const complimentsCount = document.querySelector("#compliments-count");
    const postsContainer = document.querySelector("#posts-container");

    const editProfileButton = document.querySelector("#edit-profile-button");
    const closeEditProfileButton = document.querySelector("#close-edit-profile");
    const editProfileWindow = document.querySelector(".edit-profile-modal");
    const editProfileForm = document.querySelector("#edit-profile-form");
    const logoutButton = document.querySelector("#logout-button"); // Logout button selector
    const API_KEY = process.env.API_KEY;
    const githubMembersApiUrl = "https://api.github.com/repos/dbanda99/open-up-data/contents/members.json";
    const githubComplimentsApiUrl = "https://api.github.com/repos/dbanda99/open-up-data/contents/compliment-posts.json";
    const githubToken = `Bearer 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`;

    // Toggle the visibility of the Edit Profile Window
    const toggleEditProfile = () => {
        if (editProfileWindow) {
            editProfileWindow.classList.toggle("active");
        } else {
            console.error("Edit Profile Modal not found!");
        }
    };

    // Load user profile information
    const loadUserProfile = () => {
        const loggedUser = JSON.parse(localStorage.getItem("loggedUser"));
        if (loggedUser) {
            profilePicture.src = loggedUser["profile-picture"] || "images/default-profile-img.png";
            userName.textContent = loggedUser.name;
        } else {
            console.error("No logged-in user data found.");
        }
    };

    // Handle logout
    const handleLogout = () => {
        localStorage.removeItem("loggedUser"); // Clear logged-in user data
        window.location.href = "login-page.html"; // Redirect to login page
    };

    // Fetch the latest SHA of a file on GitHub
    const getFileSha = async (url) => {
        try {
            const response = await fetch(url, {
                headers: { Authorization: githubToken },
            });
            if (!response.ok) throw new Error("Failed to fetch file SHA.");
            const data = await response.json();
            return data.sha;
        } catch (error) {
            console.error("Error fetching file SHA:", error);
            throw error;
        }
    };

    // Update Logged-In User Information
    const updateUserInformation = async (updatedData) => {
        const loggedUser = JSON.parse(localStorage.getItem("loggedUser"));
        if (!loggedUser) {
            console.error("No logged-in user data found.");
            return;
        }

        try {
            // Fetch members.json file
            const sha = await getFileSha(githubMembersApiUrl);
            const response = await fetch(githubMembersApiUrl, {
                headers: { Authorization: githubToken },
            });

            if (!response.ok) throw new Error("Failed to fetch members data.");
            const data = await response.json();
            const members = JSON.parse(atob(data.content)); // Decode base64 content

            // Find and update the logged-in user
            const memberIndex = members.findIndex((member) => member.email === loggedUser.email);
            if (memberIndex !== -1) {
                Object.keys(updatedData).forEach((key) => {
                    if (updatedData[key] !== undefined && updatedData[key] !== "") {
                        members[memberIndex][key] = updatedData[key];
                    }
                });

                // Push updated data back to GitHub
                const updateResponse = await fetch(githubMembersApiUrl, {
                    method: "PUT",
                    headers: {
                        Authorization: githubToken,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        message: "Update member information",
                        content: btoa(JSON.stringify(members, null, 2)), // Encode to base64
                        sha: sha,
                    }),
                });

                if (!updateResponse.ok) throw new Error("Failed to update member data.");
                console.log("Member information updated successfully!");

                // Update localStorage
                localStorage.setItem("loggedUser", JSON.stringify(members[memberIndex]));
                loadUserProfile(); // Reload profile information

                alert("Profile has been updated."); // Success message
            } else {
                console.error("Logged-in user not found in members.json.");
            }
        } catch (error) {
            console.error("Error updating user information:", error);
        }
    };

    // Fetch compliments from GitHub
    const fetchCompliments = async () => {
        try {
            const response = await fetch(githubComplimentsApiUrl, {
                headers: { Authorization: githubToken },
            });
            if (!response.ok) throw new Error("Failed to fetch compliments data.");
            const data = await response.json();
            const compliments = JSON.parse(atob(data.content)); // Decode base64 content
            displayCompliments(compliments);
        } catch (error) {
            console.error("Error fetching compliments:", error);
            postsContainer.innerHTML = `<p>Error loading posts. Please try again later.</p>`;
        }
    };

    // Display compliments for the logged-in user
    const displayCompliments = (compliments) => {
        const loggedUser = JSON.parse(localStorage.getItem("loggedUser"));
        if (!loggedUser) {
            postsContainer.innerHTML = `<p>No logged-in user found.</p>`;
            return;
        }

        const userCompliments = compliments.filter(
            (compliment) => compliment.receiver.email === loggedUser.email
        );

        postsContainer.innerHTML = ""; // Clear existing posts

        if (userCompliments.length === 0) {
            postsContainer.innerHTML = `<p>No compliments to display.</p>`;
            complimentsCount.textContent = "0";
            return;
        }

        complimentsCount.textContent = userCompliments.length;

        userCompliments.forEach((compliment, index) => {
            const hasUserLiked = compliment.likes.users.includes(loggedUser.email);
            const postCard = document.createElement("div");
            postCard.className = "post-card";
            postCard.innerHTML = `
                <img class="profile-image" src="${compliment.sender.profileImage || 'images/default-profile-img.png'}" alt="Sender Image">
                <div class="post-content">
                    <h3>Anonymous to YOU</h3>
                    <p class="time">${compliment.timeCreated}</p>
                    <p>${compliment.message}</p>
                    <div class="post-actions">
                        <span>${compliment.likes.count} - Loved</span>
                        <i class="bi ${hasUserLiked ? "bi-heart-fill" : "bi-heart"} like-icon" data-index="${index}" style="cursor: pointer; color: ${hasUserLiked ? "red" : "gray"};"></i>
                    </div>
                </div>
            `;
            postsContainer.appendChild(postCard);
        });

        // Add event listeners to Like buttons
        document.querySelectorAll(".like-icon").forEach((icon) => {
            icon.addEventListener("click", () => toggleLike(icon.dataset.index, userCompliments));
        });
    };

    // Handle the Edit Profile form submission
    editProfileForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const newUserName = document.querySelector("#edit-user-name")?.value.trim();
        const newEmail = document.querySelector("#edit-user-email")?.value.trim();
        const newProfilePicture = document.querySelector("#edit-profile-picture")?.value.trim();
        const newPassword = document.querySelector("#edit-user-password")?.value.trim();

        const updatedData = {
            name: newUserName || undefined,
            email: newEmail || undefined,
            "profile-picture": newProfilePicture || undefined,
            password: newPassword || undefined,
        };

        await updateUserInformation(updatedData);
        toggleEditProfile(); // Close the modal after submission
    });

    // Event listener for the Edit Profile button
    editProfileButton?.addEventListener("click", toggleEditProfile);
    closeEditProfileButton?.addEventListener("click", toggleEditProfile);

    // Event listener for Logout button
    logoutButton?.addEventListener("click", handleLogout);

    loadUserProfile();
    fetchCompliments();
});
